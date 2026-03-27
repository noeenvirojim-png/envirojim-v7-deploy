import { DiagnosticNode, DiagnosticSession, OutcomeType } from './schema';

export type { DiagnosticNode, DiagnosticSession, OutcomeType };

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface DiagnosisResult {
  nodeId: string;
  confidence: number;
  recommendedAction: string;
}
