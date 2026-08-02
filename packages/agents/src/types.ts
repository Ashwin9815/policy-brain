import type { AgentType } from "@policy-brain/shared";

export interface AgentContext {
  workflowId: string;
  correlationId: string;
  organizationId: string;
  input: Record<string, unknown>;
}

export interface AgentResult {
  output: Record<string, unknown>;
  trace: {
    agentType: string;
    stages: Array<{ name: string; durationMs: number; status: string }>;
    decisionTrace?: string[];
  };
}

export interface Agent {
  type: AgentType;
  execute(ctx: AgentContext): Promise<AgentResult>;
}
