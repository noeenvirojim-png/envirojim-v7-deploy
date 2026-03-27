/**
 * Fusion POC Test Runner
 * Executes entity fusion on the reference machine (VB750DK) from the 4 validated PDFs.
 * Outputs JSON artifact to artifacts/machine_fusion_poc.json
 */

import { createClient } from '../../../supabase/server';
import {
  fuseEntities,
  generateFusionArtifact,
  type EntityRecord,
  type EvidenceRecord,
} from './EntityFusionService';

export async function runFusionPOC(machineId: string): Promise<{
  success: boolean;
  clusterCount: number;
  entityCount: number;
  documentCount: number;
  artifact: Record<string, any>;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // 1. Fetch all entities for this machine from KB
    const { data: entities, error: entityError } = await supabase
      .from('machine_kb_entities')
      .select('*')
      .eq('machine_id', machineId);

    if (entityError) {
      throw new Error(`Failed to fetch entities: ${entityError.message}`);
    }

    if (!entities || entities.length === 0) {
      return {
        success: false,
        clusterCount: 0,
        entityCount: 0,
        documentCount: 0,
        artifact: {},
        error: 'No entities found for machine',
      };
    }

    // 2. Fetch all evidence for these entities
    const entityIds = entities.map((e: any) => e.id);
    const { data: evidence, error: evidenceError } = await supabase
      .from('machine_kb_evidence')
      .select('*')
      .in('entity_id', entityIds);

    if (evidenceError) {
      throw new Error(`Failed to fetch evidence: ${evidenceError.message}`);
    }

    // 3. Fetch document info to map source docs
    const { data: documents, error: docError } = await supabase
      .from('machine_document_inventory')
      .select('id, file_name')
      .eq('machine_id', machineId);

    if (docError) {
      throw new Error(`Failed to fetch documents: ${docError.message}`);
    }

    const docMap = new Map((documents || []).map((d: any) => [d.id, d.file_name]));

    // 4. Enrich entities with source_docs
    const enrichedEntities: EntityRecord[] = (entities || []).map((e: any) => ({
      id: e.id,
      entity_type: e.entity_type,
      canonical_name: e.canonical_name,
      original_label: e.original_label,
      language: e.language,
      confidence: e.confidence,
      status: e.status,
      criticality: e.criticality,
      normalized_payload: e.normalized_payload || {},
      source_docs: Array.from(
        new Set(
          (evidence || [])
            .filter((ev: any) => ev.entity_id === e.id)
            .map((ev: any) => docMap.get(ev.source_document_id) || ev.source_document_id)
        )
      ),
    }));

    // 5. Run fusion
    const clusters = fuseEntities(
      enrichedEntities,
      (evidence || []).map((e: any) => ({
        id: e.id,
        entity_id: e.entity_id,
        snippet: e.snippet,
        page: String(e.page),
        source_document_id: docMap.get(e.source_document_id) || e.source_document_id,
      }))
    );

    // 6. Generate artifact
    const artifact = generateFusionArtifact(
      machineId,
      clusters,
      enrichedEntities.length,
      Array.from(docMap.values()).length
    );

    return {
      success: true,
      clusterCount: clusters.length,
      entityCount: enrichedEntities.length,
      documentCount: Array.from(docMap.values()).length,
      artifact,
    };
  } catch (err) {
    return {
      success: false,
      clusterCount: 0,
      entityCount: 0,
      documentCount: 0,
      artifact: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * CLI execution
 */
if (require.main === module) {
  (async () => {
    // Run on the reference machine
    const result = await runFusionPOC('hammel-vb750dk-001'); // Default machine ID from validation

    console.log(`\n=== FUSION POC RESULT ===`);
    console.log(`Status: ${result.success ? 'PASS' : 'FAIL'}`);
    console.log(`Entities: ${result.entityCount}`);
    console.log(`Documents: ${result.documentCount}`);
    console.log(`Canonical Clusters: ${result.clusterCount}`);

    if (result.error) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    // Write artifact
    const fs = require('fs');
    const path = require('path');
    const artifactDir = path.join(process.cwd(), 'artifacts');
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    const artifactPath = path.join(artifactDir, 'machine_fusion_poc.json');
    fs.writeFileSync(artifactPath, JSON.stringify(result.artifact, null, 2));
    console.log(`\nArtifact written to: ${artifactPath}`);

    process.exit(0);
  })();
}
