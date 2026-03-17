interface CEQAInput {
  project_type: string;
  square_footage?: number;
  is_new_construction: boolean;
  in_urbanized_area?: boolean;
  near_sensitive_environment?: boolean;
  on_cortese_list?: boolean;
  has_historical_resources?: boolean;
  involves_discretionary_action?: boolean;
}

interface CEQAResult {
  exempt: boolean;
  exemption_class: string | null;
  exemption_name: string | null;
  exceptions_triggered: string[];
  ceqa_document_type: "Exempt" | "Negative Declaration" | "Mitigated Negative Declaration" | "Environmental Impact Report";
  estimated_timeline_weeks: number;
  reasoning: string[];
}

export function ceqaExemptionCheck(input: CEQAInput): CEQAResult {
  const reasoning: string[] = [];
  const exceptions: string[] = [];

  // Step 1: Check if project is ministerial
  const ministerialTypes = ["building permit", "grading permit", "plumbing permit", "electrical permit"];
  const isMinisterial = ministerialTypes.some((t) => input.project_type.toLowerCase().includes(t));

  if (isMinisterial && !input.involves_discretionary_action) {
    reasoning.push("Project appears to be a ministerial action (building permit only) — exempt from CEQA.");
    return {
      exempt: true,
      exemption_class: "Ministerial",
      exemption_name: "Ministerial Exemption (PRC §21080(b)(1))",
      exceptions_triggered: [],
      ceqa_document_type: "Exempt",
      estimated_timeline_weeks: 0,
      reasoning,
    };
  }

  // Step 2: Check categorical exemptions
  const projectLower = input.project_type.toLowerCase();
  const sqft = input.square_footage || 0;
  const inUrban = input.in_urbanized_area !== false; // default to true for LA County

  // Class 1 — Existing Facilities
  const class1Keywords = ["repair", "maintenance", "renovation", "remodel", "retrofit", "upgrade", "alteration", "tenant improvement"];
  if (!input.is_new_construction && class1Keywords.some((kw) => projectLower.includes(kw))) {
    reasoning.push("Project involves alteration/repair of existing facilities — checking Class 1 exemption (§15301).");
    reasoning.push("Class 1 covers operation, repair, maintenance, or minor alteration of existing structures.");

    // Check exceptions
    checkExceptions(input, exceptions, reasoning);

    if (exceptions.length === 0) {
      return {
        exempt: true,
        exemption_class: "Class 1",
        exemption_name: "Existing Facilities (14 CCR §15301)",
        exceptions_triggered: [],
        ceqa_document_type: "Exempt",
        estimated_timeline_weeks: 0,
        reasoning,
      };
    }
  }

  // Class 3 — New Small Structures
  if (input.is_new_construction && inUrban) {
    const isSmallResidential = projectLower.includes("residential") && sqft <= 10000;
    const isSmallCommercial = !projectLower.includes("residential") && sqft <= 10000;

    if (isSmallResidential || isSmallCommercial) {
      reasoning.push(`Project is new construction, ${sqft} sqft in urbanized area — checking Class 3 exemption (§15303).`);
      reasoning.push("Class 3 covers new small structures: ≤4 units residential, ≤10,000 sqft commercial in urbanized areas.");

      checkExceptions(input, exceptions, reasoning);

      if (exceptions.length === 0) {
        return {
          exempt: true,
          exemption_class: "Class 3",
          exemption_name: "New Construction of Small Structures (14 CCR §15303)",
          exceptions_triggered: [],
          ceqa_document_type: "Exempt",
          estimated_timeline_weeks: 0,
          reasoning,
        };
      }
    }
  }

  // Class 32 — Infill Development
  if (input.is_new_construction && inUrban && sqft <= 217800) { // 5 acres
    reasoning.push("Checking Class 32 infill exemption (§15332) — urban infill on ≤5 acres.");
    checkExceptions(input, exceptions, reasoning);
  }

  // Check for warehouse conversion
  if (projectLower.includes("convert") || projectLower.includes("conversion") || projectLower.includes("adaptive reuse")) {
    reasoning.push("Project involves conversion/adaptive reuse — may qualify for Class 1 or Class 3 depending on scope.");
  }

  // Step 3: Check exceptions to exemptions
  checkExceptions(input, exceptions, reasoning);

  // Step 4: Determine document type based on impact severity
  const hasHazmat = projectLower.includes("hazmat") || projectLower.includes("hazardous") || projectLower.includes("chemical") || projectLower.includes("battery") || projectLower.includes("recycl");
  const isLargeProject = sqft > 50000 || (input.is_new_construction && sqft > 10000);
  const nearSensitive = input.near_sensitive_environment || false;

  if (exceptions.length > 2 || (hasHazmat && nearSensitive)) {
    reasoning.push("Multiple exception conditions triggered AND/OR hazardous materials near sensitive environment — likely requires full Environmental Impact Report.");
    return {
      exempt: false,
      exemption_class: null,
      exemption_name: null,
      exceptions_triggered: exceptions,
      ceqa_document_type: "Environmental Impact Report",
      estimated_timeline_weeks: 78,
      reasoning,
    };
  }

  if (exceptions.length > 0 || hasHazmat || isLargeProject) {
    reasoning.push("Some significant impacts possible but likely mitigable — Mitigated Negative Declaration (MND) expected.");
    return {
      exempt: false,
      exemption_class: null,
      exemption_name: null,
      exceptions_triggered: exceptions,
      ceqa_document_type: "Mitigated Negative Declaration",
      estimated_timeline_weeks: 26,
      reasoning,
    };
  }

  if (input.is_new_construction) {
    reasoning.push("New construction with no significant impact triggers identified — Negative Declaration may suffice.");
    return {
      exempt: false,
      exemption_class: null,
      exemption_name: null,
      exceptions_triggered: [],
      ceqa_document_type: "Negative Declaration",
      estimated_timeline_weeks: 16,
      reasoning,
    };
  }

  reasoning.push("Project does not clearly qualify for an exemption — further analysis needed.");
  return {
    exempt: false,
    exemption_class: null,
    exemption_name: null,
    exceptions_triggered: exceptions,
    ceqa_document_type: "Mitigated Negative Declaration",
    estimated_timeline_weeks: 26,
    reasoning,
  };
}

function checkExceptions(input: CEQAInput, exceptions: string[], reasoning: string[]): void {
  // (a) Sensitive environment
  if (input.near_sensitive_environment) {
    exceptions.push("§15300.2(a) — Project may impact sensitive environment (wetlands, habitat, scenic area)");
    reasoning.push("Exception (a): Near sensitive environment — wetlands, habitat, or scenic area identified.");
  }

  // (e) Cortese List
  if (input.on_cortese_list) {
    exceptions.push("§15300.2(e) — Project site is on the Cortese List (hazardous waste/substances site)");
    reasoning.push("Exception (e): Site appears on Cortese List — known hazardous waste/substance contamination.");
  }

  // (f) Historical resources
  if (input.has_historical_resources) {
    exceptions.push("§15300.2(f) — Project may affect a historical resource");
    reasoning.push("Exception (f): Historical resources may be present at or near the project site.");
  }
}
