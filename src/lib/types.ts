export interface ProjectClassification {
  sic_code: string;
  sic_description: string;
  land_use_type: string;
  estimated_disturbance_acres: number;
  near_school: boolean;
  near_waterway: boolean;
  involves_hazmat: boolean;
  location_type: string;
  waterway_name: string | null;
  school_distance_ft: number | null;
}

export interface ClassifierResult {
  reasoning_trace: string[];
  classification: ProjectClassification;
}

export interface ReasoningStep {
  type: "thought" | "action" | "observation";
  content: string;
}

export interface PermitDetermination {
  permit_name: string;
  required: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
  timeline_weeks: number;
  forms: string[];
  priority: "critical" | "high" | "medium" | "low";
  estimated_cost: string;
}

export interface AgencyAnalysis {
  agency: string;
  agency_code: string;
  reasoning_chain: ReasoningStep[];
  permits: PermitDetermination[];
}

export interface PermitReasonerResult {
  agency_analyses: AgencyAnalysis[];
}

export interface SynthesisResult {
  synthesis_reasoning: string[];
  recommended_sequence: string[];
  parallel_tracks: string[][];
  critical_path: string[];
  estimated_total_timeline_months: number;
  warnings: string[];
  cost_estimate_range: string;
}

export interface PermitAnalysis {
  classification: ClassifierResult;
  agency_analyses: AgencyAnalysis[];
  synthesis: SynthesisResult;
}

export type AgentEventType =
  | "agent_start"
  | "thought"
  | "tool_call"
  | "tool_result"
  | "agent_complete"
  | "final_result"
  | "error";

export interface AgentEvent {
  type: AgentEventType;
  agent?: string;
  model?: string;
  content?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  result?: unknown;
  data?: PermitAnalysis;
  error?: string;
}
