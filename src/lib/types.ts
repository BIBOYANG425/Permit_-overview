// ── County & City Config Types ──

export type CountyId = "la" | "ventura";

export interface WaterbodyData {
  name: string;
  impairments: string[];
  drainage_area: string[];
  keywords: string[];
  tmdl: boolean;
}

export interface CountyConfig {
  id: CountyId;
  name: string;
  airDistrict: { name: string; code: string; rules: { dust: string; tac: string; nsr: string } };
  waterBoard: { name: string; code: string; region: number };
  wastewater: { name: string; code: string };
  fireCupa: { name: string; code: string };
  waterbodies: WaterbodyData[];
  locationAreas: string[];
  regulationsKB: string;
}

export interface CityFireDept {
  name: string;
  planCheckRequired: boolean;
  sprinklerThresholdSqft: number;
  alarmOccupancyTypes: string[];
  fireFlowRequired: boolean;
  fees: string;
}

export interface CityBuildingDept {
  name: string;
  permitTypes: string[];
  fees: string;
  planCheckTimelineWeeks: number;
  forms: string[];
}

export interface CityPlanningDept {
  name: string;
  zoningTypes: string[];
  usePermitRequired: boolean;
  siteReviewThresholdSqft: number;
  fees: string;
}

export interface CityPublicWorks {
  name: string;
  gradingPermitThresholdCuYd: number;
  encroachmentPermit: boolean;
  sewerConnection: boolean;
  fees: string;
}

export interface CityConfig {
  cityName: string;
  county: CountyId;
  population: number;
  buildingDept: CityBuildingDept;
  fireDept: CityFireDept;
  planningDept: CityPlanningDept;
  publicWorks: CityPublicWorks;
}

// ── Fire Review Types ──

export interface FireReviewResult {
  planCheckRequired: boolean;
  sprinklerRequired: boolean;
  fireAlarmRequired: boolean;
  fireFlowRequired: boolean;
  sprinklerReason: string;
  alarmReason: string;
  estimatedTimelineWeeks: number;
  estimatedFees: string;
  requirements: string[];
}

// ── City Permit Check Types ──

export interface CityPermitResult {
  buildingPermitRequired: boolean;
  buildingPermitType: "over-the-counter" | "plan-check" | "not-required";
  planCheckTimelineWeeks: number;
  planCheckFees: string;
  zoningClearanceRequired: boolean;
  zoningReason: string;
  gradingPermitRequired: boolean;
  publicWorksPermits: string[];
  forms: string[];
  totalEstimatedFees: string;
}

// ── Project Classification ──

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
  county?: CountyId;
  city?: string;
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

// ── Report Writer Types ──

export interface ReportRecipient {
  name: string;
  organization: string;
  title?: string;
}

export interface ReportAuthor {
  name: string;
  firm: string;
  title?: string;
}

export interface ReportHeader {
  to: ReportRecipient[];
  from: ReportAuthor[];
  subject: string;
  date: string;
  confidentiality_marking?: string;
}

export interface ReportBackground {
  engagement_summary: string;
  scope: string[];
  caveats: string;
  data_sources?: string[];
}

export interface RegulatoryCitation {
  agency: string;
  rule_number: string;
  section?: string;
  description: string;
  relevance: string;
  url?: string;
}

export interface RegulatoryThreshold {
  parameter: string;
  value_metric: string;
  value_imperial: string;
  applies_to?: string;
  source_rule?: string;
}

export interface CalculatedLimit {
  description: string;
  value: string;
  assumptions: string[];
}

export interface CompliancePath {
  path_label: string;
  condition: string;
  analysis: string;
  applicable_rules?: RegulatoryCitation[];
  thresholds?: RegulatoryThreshold[];
  calculated_limits?: CalculatedLimit[];
}

export interface ReportTable {
  caption: string;
  columns: string[];
  rows: string[][];
}

export interface PermitRequired {
  permit_name: string;
  issuing_agency: string;
  required: "yes" | "no" | "conditional" | "recommended";
  application_url?: string;
  fee?: string;
  deadline_description?: string;
}

export interface ApplicabilityAnalysis {
  determination_status: "exempt" | "subject_to_permitting" | "conditional" | "not_applicable" | "insufficient_data";
  analysis_narrative: string;
  compliance_paths?: CompliancePath[];
  applicable_rules?: RegulatoryCitation[];
  thresholds?: RegulatoryThreshold[];
  tables?: ReportTable[];
  permits_required?: PermitRequired[];
}

export interface ScopeExclusion {
  excluded_item: string;
  reason: string;
}

export interface ReportFootnote {
  marker: string;
  text: string;
}

export interface ReportNextStep {
  action: string;
  timing?: string;
  status?: "pending" | "complete" | "in_progress" | "blocked";
  status_note?: string;
  sub_actions?: { action: string; timing?: string }[];
}

export interface ReportMediaSection {
  section_title: string;
  regulatory_context: {
    governing_agency: {
      name: string;
      abbreviation: string;
      jurisdiction?: string;
    };
    legal_basis: string;
    primary_concern: string;
    context_narrative?: string;
  };
  applicability_analysis: ApplicabilityAnalysis;
  scope_exclusions?: ScopeExclusion[];
  footnotes?: ReportFootnote[];
  next_steps: ReportNextStep[];
}

export interface ReportDataGap {
  description: string;
  impacts_section: string;
  requested_from: string;
  date_requested?: string;
  blocking?: boolean;
}

export interface ReportAgencyRef {
  name: string;
  abbreviation: string;
  jurisdiction?: string;
  contact_url?: string;
}

export interface ReportMetadata {
  facility: {
    name: string;
    address: string;
    city?: string;
    county?: string;
    state?: string;
    sic_code: string;
    sic_description?: string;
    operations_description?: string;
  };
  analysis_date: string;
  data_gaps: ReportDataGap[];
  agencies_referenced?: ReportAgencyRef[];
  total_estimated_fees?: string;
}

export interface PermitReport {
  header: ReportHeader;
  background: ReportBackground;
  media_sections: ReportMediaSection[];
  path_forward: string;
  metadata: ReportMetadata;
}
