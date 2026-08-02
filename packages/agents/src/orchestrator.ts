import { WORKFLOW_STAGES, type AgentType } from "@policy-brain/shared";
import { agents } from "./agents.js";
import type { AgentContext, AgentResult } from "./types.js";

export interface OrchestratorOptions {
  onStageComplete?: (stage: string, result: AgentResult) => Promise<void>;
}

const WORKFLOW_AGENT_MAP: Record<string, AgentType[]> = {
  DOCUMENT_INGESTION: ["document-extractor", "knowledge-extractor"],
  RULE_GENERATION: ["rule-generator", "duplicate-checker", "explainability"],
  DUPLICATE_CHECK: ["duplicate-checker"],
  RULE_COMPARISON: ["rule-comparator"],
  IMPACT_ANALYSIS: ["impact-analyzer"],
  EXPORT: ["export"],
};

export class MasterOrchestrator {
  async runWorkflow(
    workflowType: string,
    ctx: AgentContext,
    options?: OrchestratorOptions
  ): Promise<{ results: AgentResult[]; stages: string[] }> {
    const agentTypes = WORKFLOW_AGENT_MAP[workflowType] ?? [];
    const stages = WORKFLOW_STAGES[workflowType] ?? ["execute", "complete"];
    const results: AgentResult[] = [];

    for (let i = 0; i < agentTypes.length; i++) {
      const agentType = agentTypes[i]!;
      const agent = agents[agentType];
      if (!agent) continue;

      const result = await agent.execute(ctx);
      results.push(result);

      const stage = stages[i] ?? agentType;
      if (options?.onStageComplete) {
        await options.onStageComplete(stage, result);
      }
    }

    return { results, stages };
  }

  async invokeAgent(agentType: AgentType, ctx: AgentContext): Promise<AgentResult> {
    const agent = agents[agentType];
    if (!agent) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }
    return agent.execute(ctx);
  }
}

export const orchestrator = new MasterOrchestrator();
