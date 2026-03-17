"use client";

export interface GuidedAnswers {
  projectType: string;
  locationArea: string;
  siteSize: string;
  nearWaterway: string;
  waterwayDetails: string;
  nearSchool: string;
  schoolDistance: string;
  involvesHazmat: string;
  hazmatDetails: string;
  hasEmissions: string;
  emissionsDetails: string;
  wastewater: string;
  wastewaterDetails: string;
  isNewConstruction: string;
  disturbanceAcres: string;
}

export const INITIAL_ANSWERS: GuidedAnswers = {
  projectType: "",
  locationArea: "",
  siteSize: "",
  nearWaterway: "",
  waterwayDetails: "",
  nearSchool: "",
  schoolDistance: "",
  involvesHazmat: "",
  hazmatDetails: "",
  hasEmissions: "",
  emissionsDetails: "",
  wastewater: "",
  wastewaterDetails: "",
  isNewConstruction: "",
  disturbanceAcres: "",
};

interface Question {
  key: keyof GuidedAnswers;
  label: string;
  type: "select" | "text" | "number";
  options?: string[];
  placeholder?: string;
  showIf?: (answers: GuidedAnswers) => boolean;
  helpText?: string;
}

const QUESTIONS: Question[] = [
  {
    key: "projectType",
    label: "What type of project is this?",
    type: "select",
    options: [
      "",
      "Manufacturing / Assembly",
      "Food Processing / Manufacturing",
      "Chemical Processing",
      "Metal Fabrication / Finishing",
      "Recycling / Waste Processing",
      "Warehouse / Distribution",
      "Residential Development",
      "Commercial Construction",
      "Restaurant / Food Service",
      "Auto Repair / Body Shop",
      "Other",
    ],
  },
  {
    key: "locationArea",
    label: "Where in LA County is the project?",
    type: "select",
    options: [
      "",
      "Downtown LA",
      "South Bay (Torrance, Carson, Gardena)",
      "San Fernando Valley",
      "Westside (West LA, Culver City)",
      "Long Beach / Harbor Area",
      "San Gabriel Valley",
      "Vernon / Commerce / Bell",
      "Compton / Lynwood / Paramount",
      "Unincorporated LA County",
      "Other / Not Sure",
    ],
  },
  {
    key: "siteSize",
    label: "What is the approximate site/building size?",
    type: "text",
    placeholder: "e.g., 15,000 sqft, 2 acres",
  },
  {
    key: "isNewConstruction",
    label: "Is this new construction or modification of an existing facility?",
    type: "select",
    options: ["", "New construction", "Modification / renovation", "Conversion / change of use", "Expansion of existing"],
  },
  {
    key: "disturbanceAcres",
    label: "Estimated land disturbance area (acres)?",
    type: "text",
    placeholder: "e.g., 1.5 acres (triggers stormwater permits at 1+ acre)",
    helpText: "Construction General Permit required for 1+ acre disturbance",
  },
  {
    key: "nearWaterway",
    label: "Is the site near any waterway, channel, creek, or drainage?",
    type: "select",
    options: ["", "Yes", "No", "Not sure"],
  },
  {
    key: "waterwayDetails",
    label: "Which waterway or describe proximity:",
    type: "text",
    placeholder: "e.g., Adjacent to Dominguez Channel, 500ft from LA River",
    showIf: (a) => a.nearWaterway === "Yes",
  },
  {
    key: "nearSchool",
    label: "Is the site near any school or daycare?",
    type: "select",
    options: ["", "Yes", "No", "Not sure"],
    helpText: "SCAQMD Rule 1401.1 applies within 1,000 ft of schools",
  },
  {
    key: "schoolDistance",
    label: "Approximate distance to nearest school (feet):",
    type: "text",
    placeholder: "e.g., 800",
    showIf: (a) => a.nearSchool === "Yes",
  },
  {
    key: "involvesHazmat",
    label: "Will the facility store or use hazardous materials?",
    type: "select",
    options: ["", "Yes", "No", "Not sure"],
    helpText: "Includes chemicals, solvents, acids, flammables, batteries, etc.",
  },
  {
    key: "hazmatDetails",
    label: "What hazardous materials? (list types and approximate quantities)",
    type: "text",
    placeholder: "e.g., Solvents (200 gal), acids (50 gal), lithium batteries",
    showIf: (a) => a.involvesHazmat === "Yes",
  },
  {
    key: "hasEmissions",
    label: "Will there be air emissions from equipment or processes?",
    type: "select",
    options: ["", "Yes", "No", "Not sure"],
    helpText: "Includes paint booths, ovens, boilers, generators, soldering, welding",
  },
  {
    key: "emissionsDetails",
    label: "What equipment or processes produce emissions?",
    type: "text",
    placeholder: "e.g., Soldering stations, paint booth, natural gas boiler",
    showIf: (a) => a.hasEmissions === "Yes",
  },
  {
    key: "wastewater",
    label: "Will the facility discharge process wastewater to the sewer?",
    type: "select",
    options: ["", "Yes", "No", "Not sure"],
    helpText: "Process wastewater = anything beyond normal restroom/kitchen use",
  },
  {
    key: "wastewaterDetails",
    label: "Describe wastewater sources:",
    type: "text",
    placeholder: "e.g., Equipment wash water, cooling water, chemical rinse",
    showIf: (a) => a.wastewater === "Yes",
  },
];

export function buildGuidedDescription(answers: GuidedAnswers): string {
  const parts: string[] = [];

  if (answers.projectType) parts.push(`Project type: ${answers.projectType}.`);
  if (answers.locationArea) parts.push(`Location: ${answers.locationArea}.`);
  if (answers.siteSize) parts.push(`Site/building size: ${answers.siteSize}.`);
  if (answers.isNewConstruction) parts.push(`Construction type: ${answers.isNewConstruction}.`);
  if (answers.disturbanceAcres) parts.push(`Land disturbance: ${answers.disturbanceAcres} acres.`);
  if (answers.nearWaterway === "Yes" && answers.waterwayDetails) {
    parts.push(`Near waterway: ${answers.waterwayDetails}.`);
  } else if (answers.nearWaterway === "Yes") {
    parts.push("Site is near a waterway/channel.");
  }
  if (answers.nearSchool === "Yes" && answers.schoolDistance) {
    parts.push(`Within ${answers.schoolDistance} ft of a school.`);
  } else if (answers.nearSchool === "Yes") {
    parts.push("Site is near a school.");
  }
  if (answers.involvesHazmat === "Yes" && answers.hazmatDetails) {
    parts.push(`Hazardous materials: ${answers.hazmatDetails}.`);
  } else if (answers.involvesHazmat === "Yes") {
    parts.push("Facility will store/use hazardous materials.");
  }
  if (answers.hasEmissions === "Yes" && answers.emissionsDetails) {
    parts.push(`Air emissions sources: ${answers.emissionsDetails}.`);
  } else if (answers.hasEmissions === "Yes") {
    parts.push("Facility will have equipment with air emissions.");
  }
  if (answers.wastewater === "Yes" && answers.wastewaterDetails) {
    parts.push(`Process wastewater: ${answers.wastewaterDetails}.`);
  } else if (answers.wastewater === "Yes") {
    parts.push("Facility will discharge process wastewater to sewer.");
  }

  return parts.join(" ");
}

export default function GuidedQuestions({
  answers,
  onChange,
  isLoading,
}: {
  answers: GuidedAnswers;
  onChange: (answers: GuidedAnswers) => void;
  isLoading: boolean;
}) {
  const safeAnswers = answers || INITIAL_ANSWERS;

  const update = (key: keyof GuidedAnswers, value: string) => {
    onChange({ ...safeAnswers, [key]: value });
  };

  const answeredCount = Object.values(safeAnswers).filter((v) => v.trim() !== "").length;
  const visibleQuestions = QUESTIONS.filter((q) => !q.showIf || q.showIf(safeAnswers));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm">&#9783;</span>
          <span className="text-sm font-semibold text-slate-300">Project Details</span>
        </div>
        {answeredCount > 0 && (
          <span className="text-xs bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded font-mono">
            {answeredCount} answered
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Fill in what you know — the more detail, the more accurate the permit analysis.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleQuestions.map((q) => (
          <div key={q.key} className={q.type === "text" && q.showIf ? "md:col-span-2" : ""}>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {q.label}
            </label>
            {q.helpText && (
              <p className="text-xs text-slate-600 mb-1">{q.helpText}</p>
            )}
            {q.type === "select" ? (
              <select
                value={safeAnswers[q.key]}
                onChange={(e) => update(q.key, e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#080A0F] border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50"
              >
                {q.options!.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "\u2014 Select \u2014"}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={q.type === "number" ? "number" : "text"}
                value={safeAnswers[q.key]}
                onChange={(e) => update(q.key, e.target.value)}
                placeholder={q.placeholder}
                disabled={isLoading}
                className="w-full bg-[#080A0F] border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 disabled:opacity-50 font-mono"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
