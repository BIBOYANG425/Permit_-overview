import { CountyConfig } from "../../types";

export const LA_COUNTY_CONFIG: CountyConfig = {
  id: "la",
  name: "Los Angeles County",

  airDistrict: {
    name: "South Coast Air Quality Management District",
    code: "SCAQMD",
    rules: {
      dust: "Rule 403",
      tac: "Rule 1401/1401.1",
      nsr: "Regulation XIII",
    },
  },

  waterBoard: {
    name: "LA RWQCB Region 4",
    code: "RWQCB",
    region: 4,
  },

  wastewater: {
    name: "LA County Sanitation Districts",
    code: "Sanitation",
  },

  fireCupa: {
    name: "LA County Fire / CUPA",
    code: "Fire_CUPA",
  },

  waterbodies: [
    {
      name: "Los Angeles River",
      impairments: [
        "metals (copper, lead, zinc)",
        "bacteria (E. coli)",
        "nutrients (nitrogen, phosphorus)",
        "trash",
        "ammonia",
      ],
      drainage_area: [
        "San Fernando Valley",
        "Glendale",
        "Burbank",
        "Downtown",
        "Vernon",
        "South Gate",
        "Compton",
        "Long Beach",
        "Atwater Village",
        "Elysian Valley",
      ],
      keywords: [
        "la river",
        "los angeles river",
        "river",
        "san fernando",
        "downtown",
        "vernon",
        "south gate",
      ],
      tmdl: true,
    },
    {
      name: "Dominguez Channel",
      impairments: [
        "copper",
        "zinc",
        "lead",
        "bacteria (E. coli, enterococcus)",
        "toxicity",
      ],
      drainage_area: [
        "South Bay",
        "Torrance",
        "Carson",
        "Wilmington",
        "Harbor City",
        "Gardena",
        "Hawthorne",
        "Lawndale",
        "Compton",
      ],
      keywords: [
        "dominguez",
        "south bay",
        "torrance",
        "carson",
        "harbor",
        "wilmington",
        "gardena",
      ],
      tmdl: true,
    },
    {
      name: "Ballona Creek",
      impairments: [
        "metals (copper, lead, zinc, silver)",
        "bacteria",
        "toxics (DDT, PCBs, chlordane)",
        "trash",
      ],
      drainage_area: [
        "Westside",
        "West LA",
        "Culver City",
        "Baldwin Hills",
        "Mar Vista",
        "Playa Del Rey",
        "Marina Del Rey",
      ],
      keywords: [
        "ballona",
        "westside",
        "west la",
        "culver",
        "baldwin",
        "marina",
        "playa",
      ],
      tmdl: true,
    },
    {
      name: "San Gabriel River",
      impairments: [
        "bacteria (E. coli)",
        "metals (copper, lead, zinc)",
        "cyanide",
      ],
      drainage_area: [
        "San Gabriel Valley",
        "Azusa",
        "Irwindale",
        "El Monte",
        "Whittier",
        "Pico Rivera",
        "Downey",
        "Lakewood",
        "Long Beach",
        "Seal Beach",
      ],
      keywords: [
        "san gabriel",
        "azusa",
        "irwindale",
        "el monte",
        "whittier",
        "pico rivera",
        "downey",
        "lakewood",
      ],
      tmdl: true,
    },
    {
      name: "Compton Creek",
      impairments: [
        "metals (copper, lead, zinc)",
        "bacteria",
        "trash",
      ],
      drainage_area: [
        "Compton",
        "Willowbrook",
        "Lynwood",
        "Paramount",
      ],
      keywords: [
        "compton",
        "willowbrook",
        "lynwood",
        "paramount",
      ],
      tmdl: true,
    },
    {
      name: "Santa Monica Bay",
      impairments: [
        "DDT",
        "PCBs",
        "bacteria",
        "debris",
      ],
      drainage_area: [
        "Santa Monica",
        "Malibu",
        "Pacific Palisades",
        "Venice",
        "El Segundo",
        "Manhattan Beach",
        "Hermosa Beach",
        "Redondo Beach",
      ],
      keywords: [
        "santa monica",
        "malibu",
        "venice",
        "beach",
        "bay",
        "coast",
        "ocean",
      ],
      tmdl: true,
    },
    {
      name: "Long Beach Harbor / San Pedro Bay",
      impairments: [
        "copper",
        "zinc",
        "lead",
        "PAHs",
        "DDT",
        "PCBs",
        "bacteria",
      ],
      drainage_area: [
        "Long Beach",
        "San Pedro",
        "Terminal Island",
        "Port of Long Beach",
        "Port of LA",
      ],
      keywords: [
        "long beach",
        "san pedro",
        "port",
        "harbor",
        "terminal island",
      ],
      tmdl: true,
    },
    {
      name: "Machado Lake",
      impairments: [
        "nutrients (nitrogen, phosphorus)",
        "trash",
        "odors",
        "algae",
      ],
      drainage_area: [
        "Harbor City",
        "Wilmington",
        "Ken Malloy Harbor Regional Park",
      ],
      keywords: [
        "machado",
        "harbor city",
        "harbor regional",
      ],
      tmdl: true,
    },
    {
      name: "Rio Hondo",
      impairments: [
        "metals",
        "bacteria",
        "nutrients",
      ],
      drainage_area: [
        "Montebello",
        "Pico Rivera",
        "South El Monte",
        "Whittier Narrows",
      ],
      keywords: [
        "rio hondo",
        "montebello",
        "whittier narrows",
      ],
      tmdl: true,
    },
  ],

  locationAreas: [
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

  regulationsKB: `
# LA County Environmental Permit Regulatory Knowledge Base

## Agency 1: South Coast Air Quality Management District (SCAQMD)
Jurisdiction: South Coast Air Basin (LA County, Orange County, western San Bernardino, western Riverside)

### Key Rules:
- **Rule 201/203 — Permits Required**: Any equipment that may emit air contaminants requires a Permit to Construct before installation and a Permit to Operate before use.
- **Rule 403 — Fugitive Dust**: ANY ground disturbance requires dust control. ≥50 acres = large operation notification.
- **Rule 1401 — New Source Review for Toxic Air Contaminants (TACs)**: New/modified facilities emitting listed TACs must conduct Health Risk Assessment. Maximum Individual Cancer Risk (MICR) ≤ 10-in-a-million. Listed TACs include: lead, hexavalent chromium, benzene, 1,3-butadiene, formaldehyde, perchloroethylene, trichloroethylene, cadmium, arsenic, nickel, beryllium.
- **Rule 1401.1 — Near Schools**: If facility is within 1,000 feet of a K-12 school or early learning center, MICR threshold drops to 1-in-a-million.
- **RECLAIM**: Facilities emitting >4 tons/yr of NOx or SOx must participate in RECLAIM trading credits program.
- **Rule 1171 — Solvent Cleaning**: Limits VOC content of solvents used for cleaning.
- **Rule 1107 — Coating of Metal Parts**: Limits VOC emissions from coating operations.
- **Rule 1469 — Hexavalent Chromium**: Specific controls for chrome plating and chromic acid anodizing.

### Permit Process:
1. Submit Form 400-A (Application for Permit to Construct)
2. Engineering evaluation (6-12 weeks)
3. BACT determination if applicable
4. HRA if TAC emissions (8-16 weeks additional)
5. Public notification if significant risk
6. Permit to Construct issued
7. Install equipment, pass inspection
8. Permit to Operate issued

## Agency 2: Los Angeles Regional Water Quality Control Board (RWQCB Region 4)
Jurisdiction: LA County coastal watersheds, part of Ventura County

### Key Permits:
- **Industrial General Permit (IGP)**: Required for facilities with SIC codes in regulated categories (2000-3999 manufacturing, 4000-4999 transportation/utilities, 5015 motor vehicle parts, 5093 scrap/waste materials, etc.). File NOI via SMARTS, develop SWPPP, quarterly monitoring.
- **Construction General Permit (CGP)**: Required for ≥1 acre of land disturbance. File NOI via SMARTS, prepare SWPPP, implement BMPs. Risk Level 1/2/3 based on sediment and receiving water risk.
- **303(d) Listed Waterbodies**: If project discharges to an impaired waterbody, enhanced monitoring and Numeric Action Levels (NALs) apply. Must demonstrate compliance with TMDLs.
- **NPDES Individual Permit**: For significant discharges not covered by general permits.
- **WDRs**: Waste Discharge Requirements for non-stormwater discharges to land.

### LA County MS4 Permit (Order R4-2012-0175-A01):
All new development and redevelopment must comply with Low Impact Development (LID) requirements:
- Retain 85th percentile storm on-site
- Biofiltration for flows exceeding retention capacity
- Hydromodification controls

## Agency 3: LA County Sanitation Districts
Jurisdiction: Sewer connections and industrial wastewater in their service area

### Key Permits:
- **Industrial Wastewater Discharge Permit (IWDP)**: Required for ANY process wastewater (non-domestic) discharged to the sewer. Includes wash water, cooling water, process rinse water.
- **Categorical Pretreatment Standards**: Federal standards (40 CFR Parts 405-471) set effluent limits for specific industry categories. Examples: Metal Finishing (40 CFR 433), Electroplating (40 CFR 413), Electrical/Electronic Components (40 CFR 469).
- **Local Limits**: Sanitation Districts set local discharge limits that may be more stringent than federal standards.
- **FOG (Fats, Oils, Grease)**: Food service facilities must install and maintain grease interceptors.
- **Significant Industrial User (SIU)**: Facilities subject to categorical standards OR discharging ≥25,000 gpd process wastewater.

## Agency 4: CEQA Lead Agency
California Environmental Quality Act applies to discretionary projects.

### Document Types (from least to most intensive):
1. **Exempt**: Ministerial actions, categorical exemptions (Classes 1-33), statutory exemptions
2. **Negative Declaration (ND)**: No significant environmental impact (4-6 months)
3. **Mitigated Negative Declaration (MND)**: Significant impacts can be mitigated (6-9 months)
4. **Environmental Impact Report (EIR)**: Significant unavoidable impacts (12-18+ months)

### Categorical Exemptions (most common):
- Class 1 (§15301): Existing facilities — repair, maintenance, minor alteration
- Class 3 (§15303): New small structures — ≤4 units residential, ≤10,000 sqft commercial in urbanized area
- Class 4 (§15304): Minor alterations to land — <10,000 sqft grading on <10% slope
- Class 11 (§15311): Accessory structures
- Class 32 (§15332): In-fill development — within city, <5 acres, consistent with GP, no habitat, utilities available

### Exceptions to Exemptions (§15300.2):
(a) Sensitive environment (b) Cumulative impacts (c) Unusual circumstances (d) Scenic highway (e) Cortese List (f) Historical resource

## Agency 5: CDFW + US Army Corps of Engineers
### CDFW — California Department of Fish and Wildlife:
- **Section 1602 Streambed Alteration Agreement**: Required for any activity that substantially diverts or obstructs the natural flow of any river, stream, or lake, or changes the bed, channel, or bank. In LA County, this includes concrete-lined channels.
- Jurisdiction: Top-of-bank to top-of-bank plus riparian vegetation.

### USACE — US Army Corps of Engineers:
- **Section 404 Permit**: Required for discharge of dredged or fill material into waters of the United States. In LA County, many concrete flood control channels are jurisdictional.
- **Nationwide Permits (NWPs)**: Pre-authorized for minimal impact activities (e.g., NWP 12 for utility crossings, NWP 39 for commercial/institutional, NWP 29 for residential).
- **Individual Permit**: For larger impacts not covered by NWPs (6-12+ months).

## Agency 6: LA County Fire / CUPA (Certified Unified Program Agency)
### Key Programs:
- **Hazardous Materials Business Plan (HMBP)**: Required if facility stores >55 gallons liquid, >500 lbs solid, or >200 cubic feet gas of any hazardous material. Filed via CERS (California Environmental Reporting System).
- **California Accidental Release Prevention (CalARP)**: Required for extremely hazardous substances above threshold quantities.
- **Underground Storage Tank (UST)**: Permit for any UST containing hazardous substances or petroleum.
- **Aboveground Petroleum Storage Act (APSA)**: >1,320 gallons aggregate petroleum storage or any single tank >660 gallons.
- **Hazardous Waste Generator**: Must obtain EPA ID number, determine generator status (VSQG/SQG/LQG), comply with storage time limits.
- **Tiered Permitting**: For facilities treating hazardous waste on-site — Conditionally Exempt, Conditionally Authorized, or Permit by Rule.
`,
};
