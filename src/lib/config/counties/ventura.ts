import { CountyConfig } from "../../types";

export const VENTURA_COUNTY_CONFIG: CountyConfig = {
  id: "ventura",
  name: "Ventura County",

  airDistrict: {
    name: "Ventura County Air Pollution Control District",
    code: "VCAPCD",
    rules: {
      dust: "Rule 51",
      tac: "Rule 26.11",
      nsr: "Rule 26",
    },
  },

  waterBoard: {
    name: "Central Coast RWQCB Region 3",
    code: "RWQCB-3",
    region: 3,
  },

  wastewater: {
    name: "Ventura County Environmental Health",
    code: "VC_EH",
  },

  fireCupa: {
    name: "Ventura County Environmental Health CUPA",
    code: "VC_EH_CUPA",
  },

  waterbodies: [
    {
      name: "Santa Clara River",
      impairments: [
        "chloride",
        "nutrients",
        "toxicity",
        "trash",
      ],
      drainage_area: [
        "Santa Clara River corridor",
        "Fillmore area",
        "Santa Paula area",
        "East Ventura rivermouth",
      ],
      keywords: [
        "santa clara",
        "fillmore",
        "santa paula",
        "santa clara river",
      ],
      tmdl: true,
    },
    {
      name: "Ventura River",
      impairments: [
        "algae",
        "pumping",
        "trash",
        "nutrients",
      ],
      drainage_area: [
        "Ventura River watershed",
        "Ojai Valley",
        "Casitas Springs",
        "West Ventura rivermouth",
      ],
      keywords: [
        "ventura river",
        "ojai valley",
        "casitas springs",
      ],
      tmdl: true,
    },
    {
      name: "Calleguas Creek",
      impairments: [
        "chlordane",
        "DDT",
        "metals",
        "pesticides",
        "nutrients",
      ],
      drainage_area: [
        "Conejo Valley (Thousand Oaks)",
        "Simi Valley (Calleguas watershed)",
        "Pleasant Valley (Camarillo)",
        "South Oxnard coast",
        "Moorpark (Arroyo Las Posas)",
      ],
      keywords: [
        "calleguas",
        "conejo",
        "las posas",
        "pleasant valley",
      ],
      tmdl: true,
    },
    {
      name: "Mugu Lagoon",
      impairments: [
        "pesticides",
        "sedimentation",
        "metals",
      ],
      drainage_area: [
        "Point Mugu",
        "Naval Base Ventura County",
      ],
      keywords: [
        "mugu",
        "point mugu",
        "naval base ventura",
      ],
      tmdl: true,
    },
    {
      name: "Revolon Slough",
      impairments: [
        "pesticides",
        "nutrients",
        "trash",
      ],
      drainage_area: [
        "Oxnard Plain agricultural",
        "South Camarillo drainage",
      ],
      keywords: [
        "revolon",
        "oxnard plain",
        "revolon slough",
      ],
      tmdl: true,
    },
    {
      name: "Lake Casitas",
      impairments: [
        "mercury",
      ],
      drainage_area: [
        "Casitas Springs (Lake Casitas)",
        "Upper Ojai watershed",
      ],
      keywords: [
        "lake casitas",
        "casitas dam",
        "casitas reservoir",
      ],
      tmdl: false,
    },
    {
      name: "Arroyo Simi",
      impairments: [
        "chloride",
        "nutrients",
        "trash",
      ],
      drainage_area: [
        "Simi Valley (Arroyo Simi corridor)",
        "East Moorpark drainage",
      ],
      keywords: [
        "arroyo simi",
        "simi hills",
        "simi valley arroyo",
      ],
      tmdl: true,
    },
  ],

  locationAreas: [
    "Oxnard",
    "Ventura (San Buenaventura)",
    "Thousand Oaks",
    "Simi Valley",
    "Camarillo",
    "Moorpark",
    "Ojai",
    "Santa Paula",
    "Fillmore",
    "Unincorporated Ventura County",
    "Other / Not Sure",
  ],

  regulationsKB: `
# Ventura County Environmental Permit Regulatory Knowledge Base

## Agency 1: Ventura County Air Pollution Control District (VCAPCD)
Jurisdiction: Ventura County (entirely within Ventura County boundaries)

### Key Rules:
- **Rule 26 — New Source Review (NSR)**: New or modified stationary sources of air pollution must obtain an Authority to Construct (ATC) and a Permit to Operate (PTO). NSR applies to any new emissions unit or modification that increases emissions. BACT (Best Available Control Technology) required for new/modified sources exceeding NSR thresholds.
- **Rule 26.11 — Toxic Air Contaminants — New Source Review**: New or modified sources emitting toxic air contaminants must undergo a Health Risk Assessment (HRA). Maximum Individual Cancer Risk (MICR) must not exceed 10-in-a-million. Near-school threshold of 1-in-a-million applies within 1,000 feet of K-12 schools. Listed TACs include: lead, hexavalent chromium, benzene, formaldehyde, perchloroethylene, trichloroethylene, cadmium, arsenic, nickel.
- **Rule 51 — Nuisance / Fugitive Dust**: No person shall discharge air contaminants that cause injury, detriment, nuisance, or annoyance. Applies to all ground-disturbing activities — dust control measures (watering, stabilization, wind barriers) required for any construction or grading. Large operations (≥10 acres) require enhanced dust control plans submitted to VCAPCD.
- **Rule 10 — Permits Required**: Authority to Construct required before installing, altering, or replacing any equipment that may emit air contaminants. Permit to Operate required before operating such equipment.
- **Rule 74.2 — Architectural Coatings**: Limits VOC content of architectural coatings.
- **Rule 74.6 — Surface Coating of Metal Parts and Products**: Limits VOC emissions from industrial coating operations on metal substrates.
- **Rule 74.12 — Surface Cleaning and Degreasing**: Limits VOC emissions from solvent cleaning operations.
- **Rule 74.15 — Boilers, Steam Generators, and Process Heaters**: NOx emission limits for combustion equipment rated ≥5 MMBtu/hr.
- **Rule 33 — Stack Monitoring**: Continuous emissions monitoring requirements for major sources.
- **Rule 26.2 — Federal NSR / PSD**: Prevention of Significant Deterioration requirements for major sources in attainment areas.

### Permit Process:
1. Submit Authority to Construct (ATC) application
2. Engineering evaluation and BACT analysis (6-12 weeks)
3. HRA if toxic air contaminant emissions apply (8-16 weeks additional)
4. Public notice if significant risk identified
5. ATC issued
6. Install/modify equipment and pass inspection
7. Permit to Operate (PTO) issued

## Agency 2: Central Coast Regional Water Quality Control Board (RWQCB Region 3)
Jurisdiction: Ventura County watersheds (Santa Clara River, Ventura River, Calleguas Creek, coastal lagoons)

### Key Permits:
- **Industrial General Permit (IGP)**: Required for facilities with SIC codes in regulated categories (2000-3999 manufacturing, 4000-4999 transportation/utilities, 5015 motor vehicle parts, 5093 scrap/waste materials, etc.). File Notice of Intent (NOI) via SMARTS online portal, develop Stormwater Pollution Prevention Plan (SWPPP), conduct quarterly visual monitoring and annual sampling.
- **Construction General Permit (CGP)**: Required for construction projects disturbing ≥1 acre of land. File NOI via SMARTS, prepare SWPPP with site-specific BMPs, implement erosion and sediment controls. Risk Level 1/2/3 determined by sediment risk and receiving water risk — Ventura County projects near impaired waterbodies (Santa Clara River, Calleguas Creek) often classified as Risk Level 2 or 3, requiring additional monitoring and reporting.
- **303(d) Listed Waterbodies**: Projects discharging to impaired waterbodies must implement enhanced BMPs and comply with established Total Maximum Daily Loads (TMDLs). Key TMDLs in Ventura County include: Santa Clara River chloride TMDL, Calleguas Creek metals and pesticides TMDLs, Ventura River algae TMDL.
- **NPDES Individual Permit**: For significant industrial or municipal discharges not covered by general permits. Requires individual application to RWQCB Region 3.
- **WDRs (Waste Discharge Requirements)**: Required for discharges of waste to land, including process wastewater percolation ponds, land application of treated wastewater, and landfills.

### Ventura County MS4 Permit (Order R4-2010-0108):
Ventura County stormwater permitting falls under the Ventura Countywide Stormwater Quality Management Program:
- New development and significant redevelopment must implement post-construction BMPs
- Retain the 85th percentile 24-hour storm event on-site using LID techniques
- Biofiltration required for flows exceeding retention capacity
- Hydromodification controls to maintain pre-development runoff conditions
- Technical Guidance Manual for Stormwater Quality Control Measures provides BMP sizing and design criteria

## Agency 3: Ventura County Environmental Health (Wastewater)
Jurisdiction: Onsite wastewater treatment systems (septic), small community sewer systems, and industrial wastewater oversight in unincorporated Ventura County

### Key Permits and Programs:
- **Onsite Wastewater Treatment System (OWTS) Permit**: Required for new or replacement septic systems in areas not served by municipal sewer. Permit includes site evaluation, percolation testing, and system design review. Must comply with Ventura County OWTS Manual and State Water Board OWTS Policy.
- **Industrial Wastewater Discharge Permit**: Required for any non-domestic (process) wastewater discharged to a sanitary sewer system. Includes cooling water, wash water, process rinse water. Permit sets discharge limits for pollutants based on the receiving POTW's capacity and pretreatment program.
- **Categorical Pretreatment Standards**: Federal standards (40 CFR Parts 405-471) apply to specific industrial categories — Metal Finishing (40 CFR 433), Electroplating (40 CFR 413), Organic Chemicals/Plastics/Synthetic Fibers (40 CFR 414). Local limits may be more stringent.
- **FOG (Fats, Oils, Grease) Control**: Food service establishments must install and maintain grease interceptors/traps. Sizing requirements based on fixture capacity and flow rates.
- **Sewer Connection Permits**: New connections to municipal sewer systems require permits through the applicable sanitation district (Ventura County Waterworks Districts or city sewer utilities).
- **Significant Industrial User (SIU)**: Facilities subject to categorical pretreatment standards or discharging ≥25,000 gpd of process wastewater require enhanced monitoring and reporting.

## Agency 4: CEQA Lead Agency
California Environmental Quality Act applies to all discretionary projects statewide — same requirements in Ventura County as in LA County.

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

### Ventura County CEQA Notes:
- Ventura County has significant agricultural land — projects converting farmland may require additional CEQA review under the Agricultural Resources checklist
- Coastal Zone projects in Ventura County may require Coastal Development Permits in addition to CEQA review
- Santa Clara River corridor projects often require biological resource assessments for endangered species (arroyo toad, steelhead trout, least Bell's vireo)

## Agency 5: CDFW + US Army Corps of Engineers
### CDFW — California Department of Fish and Wildlife:
- **Section 1602 Streambed Alteration Agreement (SAA)**: Required for any activity that substantially diverts or obstructs the natural flow of any river, stream, or lake, or changes the bed, channel, or bank. In Ventura County, key regulated waterways include the Santa Clara River, Ventura River, Calleguas Creek, Arroyo Simi, and numerous tributaries.
- Jurisdiction: Top-of-bank to top-of-bank plus associated riparian vegetation.
- Ventura County has significant natural (non-channelized) streams — riparian habitat along the Santa Clara River and Ventura River is particularly sensitive due to endangered species (steelhead trout, arroyo toad, least Bell's vireo, southwestern willow flycatcher).
- SAA processing time: typically 60-90 days after complete application.

### USACE — US Army Corps of Engineers:
- **Section 404 Permit**: Required for discharge of dredged or fill material into waters of the United States. In Ventura County, many watercourses remain natural (not concrete-lined) and are clearly jurisdictional.
- **Nationwide Permits (NWPs)**: Pre-authorized for minimal impact activities (e.g., NWP 12 for utility line crossings, NWP 39 for commercial/institutional developments, NWP 29 for residential developments). Subject to Regional Conditions for the Los Angeles District.
- **Individual Permit (IP)**: Required for larger impacts not covered by NWPs. Processing time 6-12+ months, may require public notice and comment period.
- **Section 408 Permission**: Required for activities that alter or temporarily or permanently occupy USACE civil works projects (levees, dams, flood control channels). Relevant for projects near Santa Clara River levees.

### Additional Wildlife Considerations for Ventura County:
- Endangered Species Act (ESA) Section 7 consultation may be required for federal permits if the project area contains critical habitat or listed species.
- California Endangered Species Act (CESA) — CDFW Incidental Take Permit (ITP) may be required under Fish and Game Code §2081 if project may result in take of state-listed species.
- Key listed species in Ventura County: Southern California steelhead trout (endangered), arroyo toad (endangered), California red-legged frog (threatened), least Bell's vireo (endangered), southwestern willow flycatcher (endangered), California condor (endangered — in upper watersheds).

## Agency 6: Ventura County Environmental Health CUPA (Certified Unified Program Agency)
Jurisdiction: Ventura County Environmental Health Division serves as the CUPA for all of Ventura County, administering the six unified program elements.

### Key Programs:
- **Hazardous Materials Business Plan (HMBP)**: Required if a facility stores hazardous materials at or above reportable quantities: >55 gallons liquid, >500 lbs solid, or >200 cubic feet gas. Must file and update annually via CERS (California Environmental Reporting System). Includes chemical inventory, emergency response plan, site map, and employee training records.
- **California Accidental Release Prevention (CalARP) / Risk Management Plan**: Required for facilities with extremely hazardous substances above CalARP threshold quantities (e.g., chlorine >2,500 lbs, ammonia >10,000 lbs, sulfuric acid >10,000 lbs). Program levels 1-4 based on offsite consequence analysis. Requires Risk Management Plan filed with CUPA.
- **Underground Storage Tank (UST) Program**: Permit required for installation, operation, modification, or removal of any UST containing hazardous substances or petroleum. Annual operating permits, monitoring requirements, financial responsibility requirements. Leak detection and secondary containment required for all USTs.
- **Aboveground Petroleum Storage Act (APSA)**: Applies to facilities with aggregate aboveground petroleum storage >1,320 gallons or any single container >660 gallons. Requires Spill Prevention Control and Countermeasure (SPCC) plan. Inspection and reporting requirements.
- **Hazardous Waste Generator Program**: Facilities generating hazardous waste must obtain EPA ID number, determine generator category (Very Small Quantity Generator/Small Quantity Generator/Large Quantity Generator), comply with accumulation time limits (VSQG: no time limit up to 2,200 lbs; SQG: 270 days; LQG: 90 days). Proper labeling, manifesting, and recordkeeping required.
- **Tiered Permitting for On-Site Hazardous Waste Treatment**: Facilities treating hazardous waste on-site must obtain appropriate tier authorization:
  - Conditionally Exempt (CE): Small volume treatment meeting specific conditions
  - Conditionally Authorized (CA): Treatment operations meeting specified conditions with CUPA notification
  - Permit by Rule (PBR): Treatment requiring CUPA permit and RWQCB concurrence
`,
};
