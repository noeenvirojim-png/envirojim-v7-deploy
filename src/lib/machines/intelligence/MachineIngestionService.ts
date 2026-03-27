import { createClient } from "../../supabase/server";
import { classifyDocument } from "./classifyDocument";
import { DocumentType } from "./documentTypes";
import { extractByDocumentType, extractInventory } from "./extractByDocumentType";
import { runPartsPipeline } from "./PartsPipeline";
import type { MachineExtraction } from "../../ai/schemas/machineExtraction.schema";
import { GEMINI_MODEL, MAX_CHUNK_CHARS, MAX_INVENTORY_CHARS } from "./modelConfig";

import { extractPdfPages, ExtractedPdfPage } from "../../../domain/ai/utils/pdf-page-extractor";
import { extractLubeTable, lubeRowsToMaintenanceTasks, extractSystemsFromRows } from "./LubeTableExtractor";
import { extractTableStructural } from "./StructuralTableExtractor";

export type ExtractedPdfContent = {
  rawText: string;
  pages: ExtractedPdfPage[];
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type RunPhase = "INIT" | "INVENTORY" | "EXTRACT" | "CONSOLIDATE";
type RunCurrentPhase = "INVENTORY" | "EXTRACT" | "CONSOLIDATE";
type StepStatus = "running" | "completed" | "failed";
type CounterMode = "success" | "failure";

type KbEntityType = "part" | "procedure" | "maintenance_task" | "fault_case" | "system";
type KbEntityStatus =
  | "draft"
  | "confirmed"
  | "inferred"
  | "ambiguous"
  | "conflicting"
  | "rejected"
  | "superseded"
  | "unreadable"
  | "missing";
type KbConfidence = "low" | "medium" | "high";
type KbCriticality = "low" | "medium" | "high" | "critical";

type MachineDocumentRow = {
  id: string;
  machine_id: string;
  organization_id: string;
  filename: string;
  storage_path: string;
  processing_status: string;
  document_type: string | null;
};

type IngestionRunRow = {
  id: string;
  machine_id: string;
  organization_id: string;
  current_phase: string;
  total_documents: number;
  processed_documents: number;
  successful_documents: number;
  failed_documents: number;
};

type StoredExtractRow = {
  id: string;
  run_id: string;
  document_id: string;
  extraction_json: MachineExtraction;
};

type StepInsertParams = {
  runId: string;
  machineId: string;
  organizationId: string;
  phase: RunPhase;
  stepName: string;
  status: StepStatus;
  documentId?: string | null;
};

type ErrorLogPhase = "INVENTORY" | "EXTRACT" | "CONSOLIDATE";

type KbEntityInsertParams = {
  kbId: string;
  runId: string;
  machineId: string;
  organizationId: string;
  entityType: KbEntityType;
  canonicalName: string;
  originalLabel: string;
  language: string;
  confidence: KbConfidence;
  status: KbEntityStatus;
  criticality: KbCriticality;
  normalizedPayload: unknown;
};

type EvidenceItem = {
  snippet?: string;
  page?: string | number;
  section?: string | null;
  language?: string;
};

type DocumentContext = {
  documentId: string;
  fileName: string;
};

type ConsolidationStats = {
  parts: number;
  procedures: number;
  faults: number;
};

type CanonicalExtractionShape = {
  machine_identity: {
    manufacturer: string;
    model: string;
    serial_range?: string;
  };
  systems: string[];
  parts: Array<{
    name: string;
    part_number: string;
    function?: string;
    system?: string;
    confidence?: "low" | "medium" | "high";
    criticality?: "low" | "medium" | "high" | "critical";
    evidence?: Array<{
      snippet?: string;
      page?: string | number;
      section?: string | null;
      language?: string;
    }>;
  }>;
  procedures: Array<{
    name: string;
    type: "maintenance" | "repair" | "operation" | "diagnostic";
    steps: Array<{
      step_number: number;
      action: string;
      tools?: string[];
      warnings?: string[];
      duration_estimate?: string;
      evidence?: Array<{
        snippet?: string;
        page?: string | number;
        section?: string | null;
        language?: string;
      }>;
    }>;
    evidence?: Array<{
      snippet?: string;
      page?: string | number;
      section?: string | null;
      language?: string;
    }>;
  }>;
  faults: Array<{
    code?: string;
    description: string;
    causes: string[];
    solutions: string[];
    severity: "low" | "medium" | "high" | "critical";
    evidence?: Array<{
      snippet?: string;
      page?: string | number;
      section?: string | null;
      language?: string;
    }>;
  }>;
  technical_parameters: Record<string, string>;
  summary: string;
};

export class MachineIngestionService {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private mapToDbDocumentType(internal: DocumentType): string {
    switch (internal) {
      case "operation":
      case "maintenance":
      case "cleaning":
      case "startup":
      case "intended_use":
      case "safety":
      case "introduction":
      case "cover":
      case "troubleshooting":
        return "manual";
      case "parts_catalog":
        return "parts_catalog";
      case "electrical_schematics":
      case "hydraulic_schematics":
        return "schematic";
      default:
        return "other";
    }
  }

  private toCanonicalExtraction(
    documentType: DocumentType,
    typedExtraction: unknown,
    fileName: string
  ): CanonicalExtractionShape {
    const base: CanonicalExtractionShape = {
      machine_identity: {
        manufacturer: "",
        model: "",
        serial_range: "",
      },
      systems: [],
      parts: [],
      procedures: [],
      faults: [],
      technical_parameters: {},
      summary: fileName,
    };

    if (!typedExtraction || typeof typedExtraction !== "object") {
      return base;
    }

    const payload = typedExtraction as Record<string, any>;

    switch (documentType) {
      case "parts_catalog":
        return {
          ...base,
          parts: Array.isArray(payload.parts) ? payload.parts : [],
          summary: `Parts extraction from ${fileName}`,
        };

      case "operation":
      case "maintenance":
      case "startup":
      case "cleaning":
        return {
          ...base,
          procedures: Array.isArray(payload.procedures) ? payload.procedures : [],
          faults: Array.isArray(payload.faults) ? payload.faults : [],
          systems: Array.isArray(payload.systems) ? payload.systems : [],
          summary: `Procedure extraction from ${fileName}`,
        };

      case "troubleshooting":
        return {
          ...base,
          faults: Array.isArray(payload.faults) ? payload.faults : [],
          summary: `Troubleshooting extraction from ${fileName}`,
        };

      case "electrical_schematics": {
        const components = Array.isArray(payload.electrical_components)
          ? payload.electrical_components
          : [];
        const connections = Array.isArray(payload.connections)
          ? payload.connections
          : [];

        return {
          ...base,
          systems: components.length > 0 ? ["Electrical System"] : [],
          technical_parameters: {
            electrical_components_count: String(components.length),
            electrical_connections_count: String(connections.length),
          },
          summary:
            typeof payload.summary === "string" && payload.summary.trim().length > 0
              ? payload.summary.trim()
              : `Electrical schematic extraction from ${fileName}`,
        };
      }

      case "hydraulic_schematics": {
        const components = Array.isArray(payload.hydraulic_components)
          ? payload.hydraulic_components
          : [];
        const circuits = Array.isArray(payload.circuits) ? payload.circuits : [];

        // Extract component names as systems for canonical storage
        const componentSystems = components
          .filter((c: any) => c && typeof c === "object" && c.name)
          .map((c: any) => `${c.name} (${c.type || "component"})`)
          .slice(0, 50);

        return {
          ...base,
          systems: [
            "Hydraulic System",
            ...componentSystems,
          ].filter(Boolean),
          technical_parameters: {
            hydraulic_components_count: String(components.length),
            hydraulic_circuits_count: String(circuits.length),
            hydraulic_components_json: JSON.stringify(components.slice(0, 20)),
            hydraulic_circuits_json: JSON.stringify(circuits.slice(0, 10)),
          },
          summary:
            typeof payload.summary === "string" && payload.summary.trim().length > 0
              ? payload.summary.trim()
              : `Hydraulic schematic extraction from ${fileName}`,
        };
      }

      case "safety":
      case "intended_use":
      case "introduction":
      case "cover":
      case "other":
      default:
        return {
          ...base,
          machine_identity: {
            manufacturer:
              payload.machine_identity?.manufacturer && typeof payload.machine_identity.manufacturer === "string"
                ? payload.machine_identity.manufacturer
                : "",
            model:
              payload.machine_identity?.model && typeof payload.machine_identity.model === "string"
                ? payload.machine_identity.model
                : "",
            serial_range:
              payload.machine_identity?.serial_range && typeof payload.machine_identity.serial_range === "string"
                ? payload.machine_identity.serial_range
                : "",
          },
          systems: Array.isArray(payload.systems) ? payload.systems : [],
          technical_parameters:
            payload.technical_metadata && typeof payload.technical_metadata === "object"
              ? Object.fromEntries(
                  Object.entries(payload.technical_metadata).filter(
                    ([, v]) => typeof v === "string" && v.trim().length > 0
                  ) as Array<[string, string]>
                )
              : {},
          summary:
            typeof payload.summary === "string" && payload.summary.trim().length > 0
              ? payload.summary.trim()
              : `Context extraction from ${fileName}`,
        };
    }
  }

  async startRun(
    machineId: string,
    organizationId: string,
    userId: string
  ): Promise<string> {
    const supabase = await createClient();
    const uploadedDocuments = await this.getMachineDocumentsByStatus(
      supabase,
      machineId,
      "uploaded"
    );

    if (uploadedDocuments.length === 0) {
      throw new Error("No uploaded machine documents found");
    }

    const { data: run, error: runError } = await supabase
      .from("machine_ingestion_runs")
      .insert({
        machine_id: machineId,
        organization_id: organizationId,
        started_by: userId,
        status: "running",
        current_phase: "INVENTORY",
        total_documents: uploadedDocuments.length,
        processed_documents: 0,
        successful_documents: 0,
        failed_documents: 0,
        repair_pass_count: 0,
        readiness_score: 0,
        production_ready: false,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runError || !run) {
      throw runError ?? new Error("Failed to create ingestion run");
    }

    await this.insertStep(supabase, {
      runId: run.id,
      machineId,
      organizationId,
      phase: "INIT",
      stepName: "Create ingestion run",
      status: "completed",
    });

    return run.id;
  }

  async runInventory(runId: string): Promise<void> {
    const supabase = await createClient();
    const run = await this.getRunStatus(runId);
    const uploadedDocuments = await this.getMachineDocumentsByStatus(
      supabase,
      run.machine_id,
      "uploaded"
    );

    if (uploadedDocuments.length === 0) {
      throw new Error("No uploaded documents found for inventory");
    }

    for (const document of uploadedDocuments) {
      const stepName = `Inventory ${document.filename}`;

      await this.insertStep(supabase, {
        runId,
        machineId: run.machine_id,
        organizationId: run.organization_id,
        documentId: document.id,
        phase: "INVENTORY",
        stepName,
        status: "running",
      });

      try {
        const rawText = await this.downloadAndExtractPdfText(
          supabase,
          document.storage_path
        );

        const detectedType = classifyDocument(
          document.filename,
          rawText.slice(0, 5000)
        );

        const inventory = await extractInventory({
          apiKey: this.apiKey,
          rawText: rawText.slice(0, MAX_INVENTORY_CHARS),
          fileName: document.filename,
        });

        const dbDocumentType = this.mapToDbDocumentType(detectedType);

        const { error: inventoryError } = await supabase
          .from("machine_document_inventory")
          .upsert({
            run_id: runId,
            machine_id: run.machine_id,
            organization_id: run.organization_id,
            document_id: document.id,
            file_name: document.filename,
            document_type: dbDocumentType,
            document_type_confidence: "high",
            language: inventory.parts.length > 0 ? "unknown" : "unknown",
            title_detected: document.filename,
            machine_reference_detected: "",
            serial_or_machine_no_detected: "",
            revision_or_date_detected: "",
            is_primary_for_machine_truth: true,
            is_reference_only: false,
            extraction_priority: 100,
            notes: `Inventory classification=${detectedType}; extracted_parts=${inventory.parts.length}`,
            evidence: [],
            raw_inventory_json: {
              internal_document_type: detectedType,
              db_document_type: dbDocumentType,
              inventory,
            },
          });

        if (inventoryError) {
          throw inventoryError;
        }

        const { error: updateError } = await supabase
          .from("machine_documents")
          .update({
            document_type: dbDocumentType,
            processing_status: "parsing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", document.id);

        if (updateError) {
          throw updateError;
        }

        await this.completeLatestStep(
          supabase,
          runId,
          document.id,
          "INVENTORY",
          stepName
        );
      } catch (error: unknown) {
        const errorMessage = this.toErrorMessage(error);

        await this.failLatestStep(
          supabase,
          runId,
          document.id,
          "INVENTORY",
          stepName,
          errorMessage
        );

        await this.logError(
          supabase,
          runId,
          run.machine_id,
          run.organization_id,
          document.id,
          "INVENTORY",
          errorMessage
        );
      }
    }

    await this.updateRunPhase(supabase, runId, "EXTRACT");
  }

  async runAllDocumentExtracts(runId: string): Promise<void> {
    const supabase = await createClient();
    const run = await this.getRunStatus(runId);
    const parsingDocuments = await this.getMachineDocumentsByStatus(
      supabase,
      run.machine_id,
      "parsing"
    );

    if (parsingDocuments.length === 0) {
      throw new Error("No parsing documents found for extraction");
    }

    for (const document of parsingDocuments) {
      await this.runDocumentExtract(runId, document);
    }

    await this.updateRunPhase(supabase, runId, "CONSOLIDATE");
  }

  async runDocumentExtract(
    runId: string,
    document: MachineDocumentRow
  ): Promise<void> {
    const supabase = await createClient();
    const run = await this.getRunStatus(runId);
    const stepName = `Extract ${document.filename}`;

    await this.insertStep(supabase, {
      runId,
      machineId: run.machine_id,
      organizationId: run.organization_id,
      documentId: document.id,
      phase: "EXTRACT",
      stepName,
      status: "running",
    });

    try {
      const { rawText, pages } = await this.downloadAndExtractPdfContent(
        supabase,
        document.storage_path
      );

      const internalDocumentType = classifyDocument(
        document.filename,
        rawText.slice(0, 5000)
      );

      const dbDocumentType = this.mapToDbDocumentType(internalDocumentType);

      let extraction: CanonicalExtractionShape;

      if (internalDocumentType === "parts_catalog") {
        // PartsPipeline now receives native pages — no regex splitting
        const partsResult = await runPartsPipeline(document.id, pages);

        extraction = {
          machine_identity: {
            manufacturer: "",
            model: "",
            serial_range: "",
          },
          systems: [],
          parts: partsResult.extractedVerifiedParts.map(p => ({
            name: p.description || "Unknown Part",
            part_number: p.partNumber || "Unknown",
            confidence: "high" as const,
            evidence: [
              {
                snippet: p.rawSourceLine,
                page: String(p.pageNumber),
              },
            ],
          })),
          procedures: [],
          faults: [],
          technical_parameters: {
            total_pages: String(partsResult.pageInventory.length),
            verified_pages: String(partsResult.pageAudits.filter(a => a.finalPageStatus === "VERIFIED").length),
            unverified_rows: String(partsResult.extractedUnverifiedParts.length),
          },
          summary: `Fail-Closed Parts Extraction: ${partsResult.extractedVerifiedParts.length} verified rows from ${pages.length} pages.`,
        };

        const { error: extractInsertError } = await supabase
          .from("machine_document_extracts")
          .insert({
            run_id: runId,
            machine_id: document.machine_id,
            organization_id: document.organization_id,
            document_id: document.id,
            version: 1,
            extraction_mode: "full",
            document_type: dbDocumentType,
            prompt_version: "v2_fail_closed",
            gemini_model: "parts_pipeline_structural",
            status: "completed",
            schema_valid: true,
            extraction_json: extraction,
            validation_errors: [],
            metrics: {
              extracted_text_length: rawText.length,
              total_pages: pages.length,
              internal_document_type: internalDocumentType,
              parts_pipeline_audit: partsResult.pageAudits,
            },
          });

        if (extractInsertError) throw extractInsertError;
      } else {
        // Page-grounded extraction with chunking for large documents
        const pageGroundedText = MachineIngestionService.buildPageGroundedText(pages);
        const chunks = MachineIngestionService.buildPageChunks(pages, MAX_CHUNK_CHARS);

        let mergedExtraction: unknown;

        // Check if this is a lubrication/graissage document — use combined extractors
        const isLubeDoc = /graissage|lubrication|lube\s*plan|grease\s*plan/i.test(document.filename);
        if (isLubeDoc && internalDocumentType === "maintenance") {
          // Extract using both simple and structural methods
          const lubeRows = extractLubeTable(rawText);
          const structuralRows = extractTableStructural(rawText);

          // Merge and deduplicate by service_point + component
          const mergedRows = MachineIngestionService.mergeLubeRows(lubeRows, structuralRows);

          const tasks = lubeRowsToMaintenanceTasks(mergedRows);
          const systems = extractSystemsFromRows(mergedRows);
          mergedExtraction = {
            procedures: tasks,
            faults: [],
            systems: systems,
          };
        } else if (chunks.length <= 1) {
          // Single chunk — send directly
          mergedExtraction = await extractByDocumentType({
            apiKey: this.apiKey,
            documentType: internalDocumentType,
            rawText: pageGroundedText.slice(0, MAX_CHUNK_CHARS),
            fileName: document.filename,
          });
        } else {
          // Multi-chunk — extract per chunk, then merge
          const chunkResults: unknown[] = [];
          for (const chunk of chunks) {
            const chunkResult = await extractByDocumentType({
              apiKey: this.apiKey,
              documentType: internalDocumentType,
              rawText: chunk.text,
              fileName: `${document.filename} (pages ${chunk.startPage}-${chunk.endPage})`,
            });
            chunkResults.push(chunkResult);
          }
          mergedExtraction = MachineIngestionService.mergeChunkExtractions(chunkResults);
        }

        extraction = this.toCanonicalExtraction(
          internalDocumentType,
          mergedExtraction,
          document.filename
        );

        const { error: extractInsertError } = await supabase
          .from("machine_document_extracts")
          .insert({
            run_id: runId,
            machine_id: document.machine_id,
            organization_id: document.organization_id,
            document_id: document.id,
            version: 1,
            extraction_mode: chunks.length > 1 ? "chunked" : "full",
            document_type: dbDocumentType,
            prompt_version: "v2_strict",
            gemini_model: GEMINI_MODEL,
            status: "completed",
            schema_valid: true,
            extraction_json: extraction,
            validation_errors: [],
            metrics: {
              extracted_text_length: rawText.length,
              total_pages: pages.length,
              chunks_used: chunks.length,
              internal_document_type: internalDocumentType,
            },
          });

        if (extractInsertError) throw extractInsertError;
      }

      const { error: updateDocumentError } = await supabase
        .from("machine_documents")
        .update({
          document_type: dbDocumentType,
          processing_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id);

      if (updateDocumentError) {
        throw updateDocumentError;
      }

      await this.incrementCounters(supabase, runId, "success");

      await this.completeLatestStep(
        supabase,
        runId,
        document.id,
        "EXTRACT",
        stepName
      );
    } catch (error: unknown) {
      const errorMessage = this.toErrorMessage(error);

      await this.incrementCounters(supabase, runId, "failure");

      await supabase
        .from("machine_documents")
        .update({
          processing_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id);

      await this.failLatestStep(
        supabase,
        runId,
        document.id,
        "EXTRACT",
        stepName,
        errorMessage
      );

      await this.logError(
        supabase,
        runId,
        run.machine_id,
        run.organization_id,
        document.id,
        "EXTRACT",
        errorMessage
      );
    }
  }

  async runConsolidation(runId: string): Promise<string> {
    const supabase = await createClient();
    const run = await this.getRunStatus(runId);

    await this.insertStep(supabase, {
      runId,
      machineId: run.machine_id,
      organizationId: run.organization_id,
      phase: "CONSOLIDATE",
      stepName: "Create canonical KB",
      status: "running",
    });

    try {
      const { data: extractRows, error: extractsError } = await supabase
        .from("machine_document_extracts")
        .select("id, run_id, document_id, extraction_json")
        .eq("run_id", runId)
        .eq("schema_valid", true);

      if (extractsError) {
        throw extractsError;
      }

      const extracts = (extractRows ?? []) as StoredExtractRow[];

      if (extracts.length === 0) {
        throw new Error("No valid extracts found for consolidation");
      }

      const machineDocuments = await this.getMachineDocumentsByMachineId(
        supabase,
        run.machine_id
      );
      const documentMap = new Map<string, MachineDocumentRow>(
        machineDocuments.map((document) => [document.id, document])
      );

      const machineProfile = this.buildMachineProfile(extracts);
      const coverageReport = this.buildCoverageReport(extracts, documentMap);
      const readiness = this.buildReadinessScore(run, extracts);

      // Check if machine_kb already exists (to avoid unique constraint violation)
      let kb = null;
      const { data: existingKb } = await supabase
        .from("machine_kb")
        .select("id")
        .eq("machine_id", run.machine_id)
        .eq("version", 1)
        .maybeSingle();

      if (existingKb) {
        // Reuse existing KB
        kb = existingKb;
      } else {
        // Create new KB
        const { data: newKb, error: kbError } = await supabase
          .from("machine_kb")
          .insert({
            machine_id: run.machine_id,
            organization_id: run.organization_id,
            run_id: runId,
            version: 1,
            status: "running",
            machine_profile: machineProfile,
            coverage_report: coverageReport,
            readiness_score: readiness,
          })
          .select("id")
          .single();

        if (kbError || !newKb) {
          throw kbError ?? new Error("Failed to create machine_kb row");
        }
        kb = newKb;
      }

      const stats: ConsolidationStats = {
        parts: 0,
        procedures: 0,
        faults: 0,
      };

      for (const extract of extracts) {
        const extraction = extract.extraction_json as any;
        const sourceDocument = documentMap.get(extract.document_id);

        if (!sourceDocument) {
          throw new Error(
            `Missing machine_documents row for extract document_id=${extract.document_id}`
          );
        }

        // 1. Specialized Part Extraction
        if (extraction.parts && Array.isArray(extraction.parts)) {
          for (const part of extraction.parts) {
            // Strict check in consolidation as requested in Step 3
            if (!part.part_number || !part.name) continue;

            const entityId = await this.insertKbEntity(supabase, {
              kbId: kb.id,
              runId,
              machineId: run.machine_id,
              organizationId: run.organization_id,
              entityType: "part",
              canonicalName: part.name.trim(),
              originalLabel: part.name.trim(),
              language: this.pickEvidenceLanguage(part.evidence),
              confidence: part.confidence ?? "medium",
              status: "confirmed",
              criticality: part.criticality ?? "medium",
              normalizedPayload: part,
            });

            await this.insertEvidenceRows(
              supabase,
              entityId,
              kb.id,
              run.machine_id,
              run.organization_id,
              {
                documentId: sourceDocument.id,
                fileName: sourceDocument.filename,
              },
              part.evidence
            );
            stats.parts += 1;
          }
        }

        // 2. Specialized Procedure Extraction
        if (extraction.procedures && Array.isArray(extraction.procedures)) {
          for (const procedure of extraction.procedures) {
            if (!procedure.name || !procedure.steps || procedure.steps.length === 0) continue;

            const entityType = procedure.type === "maintenance" ? "maintenance_task" : "procedure";

            const entityId = await this.insertKbEntity(supabase, {
              kbId: kb.id,
              runId,
              machineId: run.machine_id,
              organizationId: run.organization_id,
              entityType,
              canonicalName: procedure.name.trim(),
              originalLabel: procedure.name.trim(),
              language: this.pickEvidenceLanguage(procedure.evidence),
              confidence: "medium",
              status: "confirmed",
              criticality: "medium",
              normalizedPayload: procedure,
            });

            await this.insertEvidenceRows(
              supabase,
              entityId,
              kb.id,
              run.machine_id,
              run.organization_id,
              {
                documentId: sourceDocument.id,
                fileName: sourceDocument.filename,
              },
              procedure.evidence
            );
            stats.procedures += 1;
          }
        }

        // 3. Specialized Fault Extraction
        if (extraction.faults && Array.isArray(extraction.faults)) {
          for (const fault of extraction.faults) {
            // Strict check: description, causes, solutions
            if (!fault.description || !fault.causes || fault.causes.length === 0 || !fault.solutions || fault.solutions.length === 0) continue;

            const canonicalFaultName =
              fault.code?.trim().length
                ? fault.code.trim()
                : fault.description.trim();

            const entityId = await this.insertKbEntity(supabase, {
              kbId: kb.id,
              runId,
              machineId: run.machine_id,
              organizationId: run.organization_id,
              entityType: "fault_case",
              canonicalName: canonicalFaultName,
              originalLabel: fault.description.trim(),
              language: this.pickEvidenceLanguage(fault.evidence),
              confidence: "medium",
              status: "confirmed",
              criticality: fault.severity ?? "medium",
              normalizedPayload: fault,
            });

            await this.insertEvidenceRows(
              supabase,
              entityId,
              kb.id,
              run.machine_id,
              run.organization_id,
              {
                documentId: sourceDocument.id,
                fileName: sourceDocument.filename,
              },
              fault.evidence
            );
            stats.faults += 1;
          }
        }

        // 4. Systems Extraction
        if (extraction.systems && Array.isArray(extraction.systems)) {
          for (const system of extraction.systems) {
            if (!system || typeof system !== "string" || system.trim().length === 0) continue;

            const entityId = await this.insertKbEntity(supabase, {
              kbId: kb.id,
              runId,
              machineId: run.machine_id,
              organizationId: run.organization_id,
              entityType: "system",
              canonicalName: system.trim(),
              originalLabel: system.trim(),
              language: "unknown",
              confidence: "medium",
              status: "confirmed",
              criticality: "medium",
              normalizedPayload: { name: system.trim() },
            });

            // Minimal evidence for systems: add a default snippet if none exists
            const systemEvidence = [
              {
                snippet: system.trim(),
                page: "1",
              },
            ];

            await this.insertEvidenceRows(
              supabase,
              entityId,
              kb.id,
              run.machine_id,
              run.organization_id,
              {
                documentId: sourceDocument.id,
                fileName: sourceDocument.filename,
              },
              systemEvidence
            );
          }
        }
      }

      const finalReadiness = {
        ...readiness,
        consolidated_entities: stats.parts + stats.procedures + stats.faults,
        consolidated_parts: stats.parts,
        consolidated_procedures: stats.procedures,
        consolidated_faults: stats.faults,
      };

      const { error: activateKbError } = await supabase
        .from("machine_kb")
        .update({
          status: "active",
          readiness_score: finalReadiness,
          updated_at: new Date().toISOString(),
        })
        .eq("id", kb.id);

      if (activateKbError) {
        throw activateKbError;
      }

      const { error: completeRunError } = await supabase
        .from("machine_ingestion_runs")
        .update({
          status: "completed",
          current_phase: "CONSOLIDATE",
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);

      if (completeRunError) {
        throw completeRunError;
      }

      await this.completeLatestStep(
        supabase,
        runId,
        null,
        "CONSOLIDATE",
        "Create canonical KB"
      );

      return kb.id;
    } catch (error: unknown) {
      const errorMessage = this.toErrorMessage(error);

      await this.failLatestStep(
        supabase,
        runId,
        null,
        "CONSOLIDATE",
        "Create canonical KB",
        errorMessage
      );

      await this.logError(
        supabase,
        runId,
        run.machine_id,
        run.organization_id,
        null,
        "CONSOLIDATE",
        errorMessage
      );

      throw error;
    }
  }

  async getRunStatus(runId: string): Promise<IngestionRunRow> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("machine_ingestion_runs")
      .select(
        "id, machine_id, organization_id, current_phase, total_documents, processed_documents, successful_documents, failed_documents"
      )
      .eq("id", runId)
      .single();

    if (error || !data) {
      throw error ?? new Error("Ingestion run not found");
    }

    return data as IngestionRunRow;
  }

  private async getMachineDocumentsByStatus(
    supabase: SupabaseClient,
    machineId: string,
    processingStatus: string
  ): Promise<MachineDocumentRow[]> {
    const { data, error } = await supabase
      .from("machine_documents")
      .select(
        "id, machine_id, organization_id, filename, storage_path, processing_status, document_type"
      )
      .eq("machine_id", machineId)
      .eq("processing_status", processingStatus)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as MachineDocumentRow[];
  }

  private async getMachineDocumentsByMachineId(
    supabase: SupabaseClient,
    machineId: string
  ): Promise<MachineDocumentRow[]> {
    const { data, error } = await supabase
      .from("machine_documents")
      .select(
        "id, machine_id, organization_id, filename, storage_path, processing_status, document_type"
      )
      .eq("machine_id", machineId);

    if (error) {
      throw error;
    }

    return (data ?? []) as MachineDocumentRow[];
  }

  private async downloadAndExtractPdfContent(
    supabase: SupabaseClient,
    storagePath: string,
    maxPages?: number
  ): Promise<ExtractedPdfContent> {
    const { data, error } = await supabase.storage
      .from("machine-documents")
      .download(storagePath);

    if (error || !data) {
      throw error ?? new Error("Failed to download PDF");
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const pages = await extractPdfPages(buffer);

    if (pages.length === 0) {
      throw new Error("PDF page extraction returned empty content");
    }

    // Reconstruction of rawText for compatibility (join by \n\n as a safe delimiter)
    const rawText = pages.map(p => p.text).join("\n\n");

    return {
      rawText,
      pages
    };
  }

  // Keeping old method for internal compatibility if needed, but redirects to new one
  private async downloadAndExtractPdfText(
    supabase: SupabaseClient,
    storagePath: string,
    maxPages?: number
  ): Promise<string> {
    const content = await this.downloadAndExtractPdfContent(supabase, storagePath, maxPages);
    return content.rawText;
  }

  private detectDocumentType(extraction: MachineExtraction): string {
    if (extraction.procedures.length > 0 && extraction.faults.length > 0) {
      return "manual";
    }

    if (extraction.parts.length > 0) {
      return "parts_catalog";
    }

    if (extraction.faults.length > 0) {
      return "manual";
    }

    return "manual";
  }

  private detectLanguage(extraction: MachineExtraction): string {
    const firstPartLanguage = extraction.parts[0]?.evidence[0]?.language;
    const firstProcedureLanguage =
      extraction.procedures[0]?.evidence[0]?.language;
    const firstFaultLanguage = extraction.faults[0]?.evidence[0]?.language;

    return (
      firstPartLanguage ??
      firstProcedureLanguage ??
      firstFaultLanguage ??
      "unknown"
    );
  }

  private buildInventoryTitle(extraction: MachineExtraction): string {
    const model = extraction.machine_identity.model.trim();
    const summaryValue = extraction.summary;
    const summary =
      typeof summaryValue === "string" ? summaryValue.trim() : "";

    if (summary.length > 0) {
      return summary;
    }

    if (model.length > 0) {
      return model;
    }

    return "Machine document";
  }

  private async incrementCounters(
    supabase: SupabaseClient,
    runId: string,
    mode: CounterMode
  ): Promise<void> {
    const { error } = await supabase.rpc("increment_ingestion_counter", {
      p_run_id: runId,
      p_successful: mode === "success",
      p_failed: mode === "failure",
    });

    if (error) {
      throw error;
    }
  }

  private async insertKbEntity(
    supabase: SupabaseClient,
    params: KbEntityInsertParams
  ): Promise<string> {
    const { data, error } = await supabase
      .from("machine_kb_entities")
      .insert({
        kb_id: params.kbId,
        run_id: params.runId,
        machine_id: params.machineId,
        organization_id: params.organizationId,
        entity_type: params.entityType,
        canonical_name: params.canonicalName,
        original_label: params.originalLabel,
        language: params.language,
        confidence: params.confidence,
        status: params.status,
        criticality: params.criticality,
        normalized_payload: params.normalizedPayload,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw error ?? new Error("Failed to insert machine_kb_entity");
    }

    return data.id as string;
  }

  private async insertEvidenceRows(
    supabase: SupabaseClient,
    entityId: string,
    kbId: string,
    machineId: string,
    organizationId: string,
    documentContext: DocumentContext,
    evidence: EvidenceItem[]
  ): Promise<void> {
    if (evidence.length === 0) {
      return;
    }

    const rows = evidence.map((item) => ({
      entity_id: entityId,
      kb_id: kbId,
      machine_id: machineId,
      organization_id: organizationId,
      source_document_id: documentContext.documentId,
      source_file_name: documentContext.fileName,
      source_page: String(item.page),
      section_title: item.section?.trim() ?? "",
      evidence_snippet: item.snippet?.trim() ?? "",
      language: item.language ?? "unknown",
      confidence: "medium" as const,
      raw_evidence: item,
    }));

    const { error } = await supabase.from("machine_kb_evidence").insert(rows);

    if (error) {
      throw error;
    }
  }

  private async insertStep(
    supabase: SupabaseClient,
    params: StepInsertParams
  ): Promise<void> {
    const stepOrder = await this.getNextStepOrder(supabase, params.runId);

    const { error } = await supabase.from("machine_ingestion_steps").insert({
      run_id: params.runId,
      machine_id: params.machineId,
      organization_id: params.organizationId,
      document_id: params.documentId ?? null,
      phase: params.phase,
      step_name: params.stepName,
      step_order: stepOrder,
      status: params.status,
      started_at: new Date().toISOString(),
      completed_at:
        params.status === "completed" ? new Date().toISOString() : null,
    });

    if (error) {
      throw error;
    }
  }

  private async getNextStepOrder(
    supabase: SupabaseClient,
    runId: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from("machine_ingestion_steps")
      .select("step_order")
      .eq("run_id", runId)
      .order("step_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const lastStepOrder =
      data && typeof data.step_order === "number" ? data.step_order : 0;

    return lastStepOrder + 1;
  }

  private async completeLatestStep(
    supabase: SupabaseClient,
    runId: string,
    documentId: string | null,
    phase: RunPhase,
    stepName: string
  ): Promise<void> {
    const query = supabase
      .from("machine_ingestion_steps")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("run_id", runId)
      .eq("phase", phase)
      .eq("step_name", stepName)
      .eq("status", "running");

    const response = documentId
      ? await query.eq("document_id", documentId)
      : await query.is("document_id", null);

    if (response.error) {
      throw response.error;
    }
  }

  private async failLatestStep(
    supabase: SupabaseClient,
    runId: string,
    documentId: string | null,
    phase: RunPhase,
    stepName: string,
    errorMessage: string
  ): Promise<void> {
    const query = supabase
      .from("machine_ingestion_steps")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("run_id", runId)
      .eq("phase", phase)
      .eq("step_name", stepName)
      .eq("status", "running");

    const response = documentId
      ? await query.eq("document_id", documentId)
      : await query.is("document_id", null);

    if (response.error) {
      throw response.error;
    }
  }

  private async updateRunPhase(
    supabase: SupabaseClient,
    runId: string,
    phase: RunCurrentPhase
  ): Promise<void> {
    const { error } = await supabase
      .from("machine_ingestion_runs")
      .update({
        current_phase: phase,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (error) {
      throw error;
    }
  }

  private async logError(
    supabase: SupabaseClient,
    runId: string,
    machineId: string,
    organizationId: string,
    documentId: string | null,
    phase: ErrorLogPhase,
    message: string
  ): Promise<void> {
    const { error } = await supabase.from("machine_ingestion_errors").insert({
      run_id: runId,
      machine_id: machineId,
      organization_id: organizationId,
      document_id: documentId,
      phase,
      error_message: message,
    });

    if (error) {
      throw error;
    }
  }

  private buildMachineProfile(
    extracts: StoredExtractRow[]
  ): Record<string, unknown> {
    const firstExtraction = extracts[0].extraction_json;

    return {
      machine_identity: firstExtraction.machine_identity,
      systems: firstExtraction.systems,
      technical_parameters: firstExtraction.technical_parameters,
      summary: firstExtraction.summary,
      source_extract_count: extracts.length,
    };
  }

  private buildCoverageReport(
    extracts: StoredExtractRow[],
    documentMap: Map<string, MachineDocumentRow>
  ): Record<string, unknown> {
    const documentSummaries = extracts.map((extract) => {
      const extraction = extract.extraction_json;
      const document = documentMap.get(extract.document_id);

      return {
        document_id: extract.document_id,
        file_name: document?.filename ?? "unknown",
        parts: extraction.parts.length,
        procedures: extraction.procedures.length,
        faults: extraction.faults.length,
        systems: extraction.systems.length,
      };
    });

    return {
      extract_count: extracts.length,
      document_summaries: documentSummaries,
      total_parts: extracts.reduce(
        (sum, extract) => sum + extract.extraction_json.parts.length,
        0
      ),
      total_procedures: extracts.reduce(
        (sum, extract) => sum + extract.extraction_json.procedures.length,
        0
      ),
      total_faults: extracts.reduce(
        (sum, extract) => sum + extract.extraction_json.faults.length,
        0
      ),
      total_systems: extracts.reduce(
        (sum, extract) => sum + extract.extraction_json.systems.length,
        0
      ),
    };
  }

  private buildReadinessScore(
    run: IngestionRunRow,
    extracts: StoredExtractRow[]
  ): Record<string, unknown> {
    const processed = run.processed_documents;
    const successful = run.successful_documents;
    const failed = run.failed_documents;

    const completionRate =
      run.total_documents > 0 ? processed / run.total_documents : 0;
    const successRate = processed > 0 ? successful / processed : 0;

    return {
      total_documents: run.total_documents,
      processed_documents: processed,
      successful_documents: successful,
      failed_documents: failed,
      valid_extracts: extracts.length,
      completion_rate: Number(completionRate.toFixed(4)),
      success_rate: Number(successRate.toFixed(4)),
    };
  }

  private pickEvidenceLanguage(evidence: EvidenceItem[]): string {
    return evidence[0]?.language ?? "unknown";
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "object" && error !== null && "message" in error) {
      return String((error as any).message);
    }

    return "Unknown error";
  }

  /**
   * Merge results from LubeTableExtractor and StructuralTableExtractor, deduplicating by point+component
   */
  private static mergeLubeRows(
    simple: Array<any>,
    structural: Array<any>
  ) {
    const seen = new Set<string>();
    const merged: Array<any> = [];

    // Add simple extraction results first
    for (const row of simple) {
      const key = `${row.service_point}|${row.component}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(row);
      }
    }

    // Add structural results that don't duplicate
    for (const row of structural) {
      const key = `${row.service_point}|${row.component}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(row);
      }
    }

    // Sort by service point number
    return merged.sort((a, b) => {
      const numA = parseInt(String(a.service_point));
      const numB = parseInt(String(b.service_point));
      return numA - numB;
    });
  }

  /**
   * Builds text with [PAGE N] markers so the LLM can cite real page numbers in evidence.
   */
  static buildPageGroundedText(pages: ExtractedPdfPage[]): string {
    return pages
      .map(p => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join("\n\n");
  }

  /**
   * Splits pages into chunks that stay under maxChars.
   * Each chunk preserves page markers and tracks which pages it contains.
   */
  static buildPageChunks(
    pages: ExtractedPdfPage[],
    maxChars: number
  ): Array<{ text: string; startPage: number; endPage: number }> {
    const chunks: Array<{ text: string; startPage: number; endPage: number }> = [];
    let currentText = "";
    let startPage = pages[0]?.pageNumber ?? 1;
    let endPage = startPage;

    for (const page of pages) {
      const pageBlock = `[PAGE ${page.pageNumber}]\n${page.text}\n\n`;

      if (currentText.length + pageBlock.length > maxChars && currentText.length > 0) {
        chunks.push({ text: currentText.trim(), startPage, endPage });
        currentText = "";
        startPage = page.pageNumber;
      }

      currentText += pageBlock;
      endPage = page.pageNumber;
    }

    if (currentText.trim().length > 0) {
      chunks.push({ text: currentText.trim(), startPage, endPage });
    }

    return chunks;
  }

  /**
   * Merges extraction results from multiple chunks into a single result.
   * Concatenates arrays (parts, procedures, faults) and picks the first identity.
   */
  static mergeChunkExtractions(results: unknown[]): Record<string, any> {
    const merged: Record<string, any> = {
      machine_identity: { manufacturer: "", model: "", serial_range: "" },
      systems: [],
      parts: [],
      procedures: [],
      faults: [],
      technical_parameters: {},
      summary: "",
      electrical_components: [],
      connections: [],
      hydraulic_components: [],
      circuits: [],
      main_topics: [],
    };

    for (const result of results) {
      if (!result || typeof result !== "object") continue;
      const r = result as Record<string, any>;

      // Take first non-empty identity
      if (r.machine_identity && !merged.machine_identity.manufacturer) {
        merged.machine_identity = r.machine_identity;
      }

      // Concatenate arrays
      if (Array.isArray(r.parts)) merged.parts.push(...r.parts);
      if (Array.isArray(r.procedures)) merged.procedures.push(...r.procedures);
      if (Array.isArray(r.faults)) merged.faults.push(...r.faults);
      if (Array.isArray(r.systems)) merged.systems.push(...r.systems);
      if (Array.isArray(r.electrical_components)) merged.electrical_components.push(...r.electrical_components);
      if (Array.isArray(r.connections)) merged.connections.push(...r.connections);
      if (Array.isArray(r.hydraulic_components)) merged.hydraulic_components.push(...r.hydraulic_components);
      if (Array.isArray(r.circuits)) merged.circuits.push(...r.circuits);
      if (Array.isArray(r.main_topics)) merged.main_topics.push(...r.main_topics);

      // Merge technical parameters
      if (r.technical_metadata && typeof r.technical_metadata === "object") {
        Object.assign(merged.technical_parameters, r.technical_metadata);
      }

      // Take first non-empty summary
      if (typeof r.summary === "string" && r.summary.trim() && !merged.summary) {
        merged.summary = r.summary;
      }
    }

    // Deduplicate systems
    merged.systems = Array.from(new Set(merged.systems));

    return merged;
  }
}
