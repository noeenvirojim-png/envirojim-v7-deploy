/**
 * GET /api/machines/[machineId]/intelligence/diagnostic?problem=...
 * Official documented answer first. Inferred only if official is empty or partial.
 * Two blocks are ALWAYS structurally separate in the response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OfficialDiagnosticService } from '@/lib/machines/intelligence/services/OfficialDiagnosticService';
import { InferenceDiagnosticService } from '@/lib/machines/intelligence/services/InferenceDiagnosticService';
import { MachineKnowledgeRepository } from '@/lib/machines/intelligence/repositories/MachineKnowledgeRepository';
import { resolveMachineFamily, MachineResolutionError } from '@/lib/machines/intelligence/adapters/resolveMachineFamily';
import type { DiagnosticOutput } from '@/lib/machines/intelligence/contracts';

export async function GET(
  request: NextRequest,
  { params }: { params: { machineId: string } },
) {
  const problem = request.nextUrl.searchParams.get('problem')?.trim();
  if (!problem) {
    return NextResponse.json({ error: 'problem query param required' }, { status: 400 });
  }

  let resolution;
  try {
    resolution = await resolveMachineFamily(params.machineId);
  } catch (e) {
    if (e instanceof MachineResolutionError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }

  const { family_id: familyId } = resolution;
  const officialService = new OfficialDiagnosticService();
  const inferenceService = new InferenceDiagnosticService();
  const repo = new MachineKnowledgeRepository();

  const officialAnswer = await officialService.query(familyId, problem);

  const needsInference = !officialAnswer.found;
  const partialConfidence = officialAnswer.found && officialAnswer.documentary_confidence < 50;
  let inferredAnswer = null;

  if (needsInference || partialConfidence) {
    const policy = await repo.getInferencePolicy(familyId);
    if (!policy || policy.allow_non_official_inference) {
      const context = officialAnswer.found ? officialAnswer.summary : '';
      inferredAnswer = await inferenceService.infer(familyId, problem, context);
    }
  }

  const output: DiagnosticOutput = {
    normalized_problem: problem,
    affected_subsystems: officialAnswer.found ? officialAnswer.affected_subsystems : [],
    official_documented_answer: officialAnswer,
    inferred_non_official_answer: inferredAnswer,
    safety_alerts: [],
    evidence: officialAnswer.found ? officialAnswer.evidence : [],
  };

  return NextResponse.json(output);
}
