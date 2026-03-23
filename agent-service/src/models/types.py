from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── SSE Event Types ──


class AgentEventType(str, Enum):
    agent_start = "agent_start"
    thought = "thought"
    tool_call = "tool_call"
    tool_result = "tool_result"
    agent_complete = "agent_complete"
    final_result = "final_result"
    error = "error"
    model_route = "model_route"


class AgentEvent(BaseModel):
    type: AgentEventType
    agent: str | None = None
    model: str | None = None
    content: str | None = None
    tool: str | None = None
    input: dict[str, Any] | None = None
    output: dict[str, Any] | None = None
    result: Any | None = None
    data: dict[str, Any] | None = None
    error: str | None = None


# ── Classification Types ──


class ProjectClassification(BaseModel):
    sic_code: str
    sic_description: str
    land_use_type: str
    estimated_disturbance_acres: float = 0
    near_school: bool = False
    near_waterway: bool = False
    involves_hazmat: bool = False
    location_type: str = "Urbanized"
    waterway_name: str | None = None
    school_distance_ft: float | None = None
    county: str | None = None
    city: str | None = None
    document_extracted_details: str | None = None


class ClassifierResult(BaseModel):
    reasoning_trace: list[str] = []
    classification: ProjectClassification


# ── Expanded Classification ──


class EmissionsProfile(BaseModel):
    likely_air_pollutants: list[str] = []
    likely_tacs: list[str] = []
    wastewater_types: list[str] = []
    has_fog: bool = False


class ExpandedClassification(ProjectClassification):
    project_summary: str = ""
    key_operations: list[str] = []
    emissions_profile: EmissionsProfile = EmissionsProfile()
    building_sqft: float | None = None
    stories: int | None = None
    occupancy_type: str | None = None
    is_new_construction: bool | None = None


# ── Permit Analysis Instruction Set ──


class RuleToEvaluate(BaseModel):
    rule_id: str
    rule_name: str
    applies: bool
    reason: str
    key_threshold: str


class AgencyInstruction(BaseModel):
    agency_id: str
    agency_name: str
    triggered: bool
    priority: Literal["critical", "important", "recommended", "not_applicable"]
    analysis_instructions: str
    rules_to_evaluate: list[RuleToEvaluate] = []
    expected_permits: list[str] = []
    key_questions: list[str] = []


class LocationContext(BaseModel):
    county: str
    county_name: str
    air_district: str
    air_district_code: str
    water_board: str
    water_board_code: str
    watershed: str | None = None
    nearest_303d_waterbody: str | None = None
    waterbody_impairments: list[str] = []
    is_303d_watershed: bool = False
    near_school_1000ft: bool = False
    school_distance_ft: float | None = None
    near_waterway_50ft: bool = False
    in_coastal_zone: bool = False


class ProjectScale(BaseModel):
    facility_sqft: float | None = None
    land_disturbance_acres: float = 0
    is_new_construction: bool | None = None
    is_renovation: bool = False
    stories: int | None = None
    occupancy_type: str | None = None


class PermitAnalysisInstructionSet(BaseModel):
    case_id: str = ""
    generated_by: str = "classifier-agent"
    timestamp: str = ""
    confidence: Literal["high", "medium", "low"] = "medium"
    project_summary: str = ""
    classification: ExpandedClassification = Field(
        default_factory=lambda: ExpandedClassification(
            sic_code="", sic_description="", land_use_type=""
        )
    )
    emissions_profile: EmissionsProfile = Field(default_factory=EmissionsProfile)
    location_context: LocationContext = Field(
        default_factory=lambda: LocationContext(
            county="", county_name="", air_district="",
            air_district_code="", water_board="", water_board_code=""
        )
    )
    scale: ProjectScale = ProjectScale()
    agency_instructions: list[AgencyInstruction] = []
    warnings: list[str] = []
    unknowns: list[str] = []


# ── Permit Analysis Types ──


class ReasoningStep(BaseModel):
    type: Literal["thought", "action", "observation"]
    content: str


class PermitDetermination(BaseModel):
    permit_name: str
    required: bool
    confidence: Literal["high", "medium", "low"] = "medium"
    reason: str = ""
    timeline_weeks: int = 0
    forms: list[str] = []
    priority: Literal["critical", "high", "medium", "low"] = "medium"
    estimated_cost: str = "$0"


class AgencyAnalysis(BaseModel):
    agency: str
    agency_code: str
    reasoning_chain: list[ReasoningStep] = []
    permits: list[PermitDetermination] = []


class PermitReasonerResult(BaseModel):
    agency_analyses: list[AgencyAnalysis] = []


# ── Synthesis Types ──


class SynthesisResult(BaseModel):
    synthesis_reasoning: list[str] = []
    recommended_sequence: list[str] = []
    parallel_tracks: list[list[str]] = []
    critical_path: list[str] = []
    estimated_total_timeline_months: int = 12
    warnings: list[str] = []
    cost_estimate_range: str = "Contact agencies for exact costs"


# ── Request/Response ──


class AnalyzeRequest(BaseModel):
    projectDescription: str
    county: str = "la"
    city: str = ""


# ── County/City Config Types (received from Next.js) ──


class AirDistrict(BaseModel):
    name: str
    code: str
    rules: dict[str, str]


class WaterBoard(BaseModel):
    name: str
    code: str
    region: int


class AgencyInfo(BaseModel):
    name: str
    code: str


class WaterbodyData(BaseModel):
    name: str
    impairments: list[str] = []
    drainage_area: list[str] = []
    keywords: list[str] = []
    tmdl: bool = False


class CountyConfig(BaseModel):
    id: str
    name: str
    airDistrict: AirDistrict
    waterBoard: WaterBoard
    wastewater: AgencyInfo
    fireCupa: AgencyInfo
    waterbodies: list[WaterbodyData] = []
    locationAreas: list[str] = []
    regulationsKB: str = ""


class CityFireDept(BaseModel):
    name: str
    planCheckRequired: bool = True
    sprinklerThresholdSqft: int = 5000
    alarmOccupancyTypes: list[str] = []
    fireFlowRequired: bool = True
    fees: str = ""


class CityBuildingDept(BaseModel):
    name: str
    permitTypes: list[str] = []
    fees: str = ""
    planCheckTimelineWeeks: int = 4
    forms: list[str] = []


class CityPlanningDept(BaseModel):
    name: str
    zoningTypes: list[str] = []
    usePermitRequired: bool = True
    siteReviewThresholdSqft: int = 10000
    fees: str = ""


class CityPublicWorks(BaseModel):
    name: str
    gradingPermitThresholdCuYd: int = 50
    encroachmentPermit: bool = True
    sewerConnection: bool = True
    fees: str = ""


class CityConfig(BaseModel):
    cityName: str
    county: str
    population: int = 0
    buildingDept: CityBuildingDept
    fireDept: CityFireDept
    planningDept: CityPlanningDept
    publicWorks: CityPublicWorks
