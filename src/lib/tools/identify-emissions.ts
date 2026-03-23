interface IdentifyEmissionsInput {
  sic_code: string;
  operations: string[];
  has_boiler_or_generator?: boolean;
  has_refrigeration?: boolean;
  stores_chemicals?: boolean;
}

interface IdentifyEmissionsResult {
  air_pollutants: string[];
  wastewater_types: string[];
  hazardous_materials: string[];
  solid_waste: string[];
  regulatory_triggers: {
    has_tac: boolean;
    has_voc: boolean;
    has_hazardous_waste: boolean;
    has_process_wastewater: boolean;
    has_fog: boolean;
    has_heavy_metals_in_water: boolean;
    exceeds_hazmat_thresholds: boolean;
  };
}

const OPERATION_EMISSIONS: Record<string, { air: string[]; water: string[]; hazmat: string[]; waste: string[] }> = {
  soldering: {
    air: ["lead fumes (TAC)", "tin fumes", "rosin flux fumes (VOC)"],
    water: ["flux residue wash water"],
    hazmat: ["solder paste (lead-containing)", "flux"],
    waste: ["solder dross (hazardous if leaded)", "flux residue"],
  },
  wave_soldering: {
    air: ["lead fumes (TAC)", "tin fumes", "VOCs from flux"],
    water: ["equipment cleaning wastewater"],
    hazmat: ["solder bars", "liquid flux"],
    waste: ["solder dross (hazardous)", "spent flux"],
  },
  spray_painting: {
    air: ["VOCs", "PM10 (overspray)", "HAPs (depending on paint type)"],
    water: ["paint booth water curtain waste (if wet booth)"],
    hazmat: ["paint/coatings", "solvents/thinners", "catalysts"],
    waste: ["paint sludge", "spent filters (hazardous if contains metals)", "waste solvents"],
  },
  chemical_etching: {
    air: ["acid mist", "metal fumes"],
    water: ["spent etchant (heavy metals)", "rinse water (metals, acids)"],
    hazmat: ["ferric chloride", "cupric chloride", "ammonium persulfate", "sulfuric acid", "hydrochloric acid"],
    waste: ["spent etchant (hazardous)", "sludge from wastewater treatment"],
  },
  metal_finishing: {
    air: ["chromium mist (TAC)", "nickel compounds (TAC)", "acid mist"],
    water: ["plating rinse water (heavy metals)", "spent plating solutions"],
    hazmat: ["chromic acid", "nickel sulfate", "cyanide compounds", "acids", "alkalis"],
    waste: ["F006 sludge (hazardous)", "spent solutions (hazardous)", "filter cake"],
  },
  electroplating: {
    air: ["chromium (TAC)", "cadmium (TAC)", "cyanide", "acid mist"],
    water: ["plating bath dragout", "rinse water with heavy metals"],
    hazmat: ["cyanide compounds", "chromic acid", "cadmium compounds", "nickel salts"],
    waste: ["F006-F009 listed hazardous waste", "spent plating solutions"],
  },
  welding: {
    air: ["metal fumes (manganese, chromium, nickel)", "ozone", "nitrogen oxides"],
    water: [],
    hazmat: ["welding rods/wire", "shielding gases"],
    waste: ["welding slag", "metal scraps"],
  },
  metal_grinding: {
    air: ["PM10 (metal dust)", "silica dust (if grinding stone/concrete)"],
    water: ["coolant/cutting fluid waste"],
    hazmat: ["cutting oils/fluids"],
    waste: ["metal swarf/chips", "spent cutting fluid (may be hazardous)"],
  },
  machining: {
    air: ["cutting fluid mist", "metal particulates"],
    water: ["spent cutting fluid", "wash water"],
    hazmat: ["cutting oils", "coolants"],
    waste: ["metal chips/swarf", "spent cutting fluid", "oily rags"],
  },
  chemical_cleaning: {
    air: ["VOCs (solvent vapors)", "HAPs"],
    water: ["spent cleaning solutions", "rinse water with contaminants"],
    hazmat: ["solvents (TCE, MEK, acetone, IPA)", "alkaline cleaners", "acid cleaners"],
    waste: ["spent solvents (hazardous)", "contaminated wipes"],
  },
  food_processing: {
    air: ["odors", "PM (flour dust, etc.)", "VOCs from cooking"],
    water: ["high-BOD wastewater", "FOG (fats, oils, grease)"],
    hazmat: ["cleaning chemicals (sanitizers, degreasers)"],
    waste: ["organic waste", "packaging waste"],
  },
  battery_manufacturing: {
    air: ["lead fumes (TAC)", "sulfuric acid mist", "lithium dust"],
    water: ["acid wash water", "process wastewater with heavy metals"],
    hazmat: ["sulfuric acid", "lead compounds", "lithium compounds", "electrolyte solutions"],
    waste: ["lead waste (hazardous)", "spent acid (hazardous)", "defective batteries (hazardous)"],
  },
  battery_recycling: {
    air: ["lead fumes (TAC)", "acid mist", "particulates"],
    water: ["acid wash water with heavy metals"],
    hazmat: ["sulfuric acid", "lead", "lithium", "cobalt", "nickel"],
    waste: ["lead-acid batteries (universal waste)", "lithium batteries (hazardous)", "slag (hazardous)"],
  },
  woodworking: {
    air: ["PM10 (sawdust)", "VOCs (from finishes/adhesives)"],
    water: [],
    hazmat: ["wood stains", "lacquers", "adhesives"],
    waste: ["sawdust", "wood scraps", "spent finishing materials"],
  },
  concrete_batching: {
    air: ["PM10 (cement dust, silica)", "NOx (from vehicles)"],
    water: ["concrete washout water (high pH)"],
    hazmat: ["cement (irritant)", "admixtures"],
    waste: ["returned concrete", "washout solids"],
  },
  auto_body_repair: {
    air: ["VOCs (paint)", "PM (sanding dust)", "isocyanates (TAC from urethane paints)"],
    water: ["paint booth water"],
    hazmat: ["paints", "primers", "solvents", "body filler"],
    waste: ["paint waste", "spent solvent", "sanding dust", "masking materials"],
  },
  dry_cleaning: {
    air: ["perchloroethylene (TAC)", "petroleum solvent VOCs"],
    water: ["separator water (perc operations)"],
    hazmat: ["perchloroethylene", "petroleum solvents"],
    waste: ["still bottoms (hazardous)", "spent filters", "separator water"],
  },
  construction_general: {
    air: ["fugitive dust (PM10)", "equipment exhaust (NOx, PM2.5)"],
    water: ["sediment-laden runoff", "construction dewatering"],
    hazmat: ["diesel fuel", "hydraulic fluid", "paint/coatings"],
    waste: ["demolition debris", "excavated soil (test for contamination)"],
  },
  chemical_storage: {
    air: ["potential fugitive emissions from tanks/containers"],
    water: [],
    hazmat: ["stored chemicals (type depends on business)"],
    waste: ["expired/off-spec chemicals"],
  },
  refrigeration_large: {
    air: ["refrigerant leaks (CFCs, HCFCs, HFCs, ammonia)"],
    water: ["condenser blowdown"],
    hazmat: ["refrigerants", "compressor oils"],
    waste: ["spent refrigerant", "used compressor oil"],
  },
  printing: {
    air: ["VOCs (inks, solvents, fountain solution)", "IPA vapors"],
    water: ["fountain solution waste", "press wash water"],
    hazmat: ["inks", "solvents", "fountain solution"],
    waste: ["waste ink", "spent solvents (hazardous)", "cleaning rags"],
  },
};

function fuzzyMatchOperation(op: string): string | null {
  const normalized = op.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const opWords = normalized.split(/\s+/);

  let bestKey: string | null = null;
  let bestScore = 0;

  for (const key of Object.keys(OPERATION_EMISSIONS)) {
    const keyWords = key.split("_");
    let score = 0;
    for (const kw of keyWords) {
      for (const ow of opWords) {
        if (ow.includes(kw) || kw.includes(ow)) score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestScore > 0 ? bestKey : null;
}

export function identifyEmissions(input: IdentifyEmissionsInput): IdentifyEmissionsResult {
  const airSet = new Set<string>();
  const waterSet = new Set<string>();
  const hazmatSet = new Set<string>();
  const wasteSet = new Set<string>();
  const triggers = {
    has_tac: false,
    has_voc: false,
    has_hazardous_waste: false,
    has_process_wastewater: false,
    has_fog: false,
    has_heavy_metals_in_water: false,
    exceeds_hazmat_thresholds: false,
  };

  for (const op of input.operations) {
    const matchKey = fuzzyMatchOperation(op);
    if (!matchKey) continue;

    const emissions = OPERATION_EMISSIONS[matchKey];
    for (const e of emissions.air) {
      airSet.add(e);
      if (e.includes("TAC")) triggers.has_tac = true;
      if (e.includes("VOC")) triggers.has_voc = true;
    }
    for (const e of emissions.water) {
      waterSet.add(e);
      triggers.has_process_wastewater = true;
      if (e.toLowerCase().includes("metal")) triggers.has_heavy_metals_in_water = true;
      if (e.toLowerCase().includes("fog") || e.toLowerCase().includes("grease")) triggers.has_fog = true;
    }
    for (const e of emissions.hazmat) {
      hazmatSet.add(e);
      triggers.exceeds_hazmat_thresholds = true;
    }
    for (const e of emissions.waste) {
      wasteSet.add(e);
      if (e.toLowerCase().includes("hazardous")) triggers.has_hazardous_waste = true;
    }
  }

  if (input.has_boiler_or_generator) {
    airSet.add("NOx (combustion)");
    airSet.add("CO (combustion)");
    airSet.add("PM2.5 (combustion)");
    triggers.has_voc = true;
  }

  if (input.has_refrigeration) {
    airSet.add("refrigerant emissions (potential)");
    hazmatSet.add("refrigerants");
  }

  if (input.stores_chemicals) {
    triggers.exceeds_hazmat_thresholds = true;
    hazmatSet.add("stored chemicals (per business inventory)");
  }

  return {
    air_pollutants: Array.from(airSet),
    wastewater_types: Array.from(waterSet),
    hazardous_materials: Array.from(hazmatSet),
    solid_waste: Array.from(wasteSet),
    regulatory_triggers: triggers,
  };
}
