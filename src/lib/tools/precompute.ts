import { CountyConfig, CityConfig } from "../types";
import { thresholdCheck } from "./threshold-check";
import { ceqaExemptionCheck } from "./ceqa-exemption-check";
import { fireReviewCheck } from "./fire-review-check";
import { cityPermitCheck } from "./city-permit-check";

export function preComputeToolResults(classification: Record<string, unknown>, countyConfig: CountyConfig, cityConfig: CityConfig) {
  const c = (classification as { classification?: Record<string, unknown> })?.classification || classification;
  const sicCode = (c.sic_code as string) || "9999";
  const acres = (c.estimated_disturbance_acres as number) || 0;
  const nearWaterway = (c.near_waterway as boolean) || false;
  const involvesHazmat = (c.involves_hazmat as boolean) || false;

  const airAgency = countyConfig.airDistrict.code;
  const waterAgency = countyConfig.waterBoard.code;
  const wastewaterAgency = countyConfig.wastewater.code;
  const fireAgency = countyConfig.fireCupa.code;

  const buildingSqft = (c.building_sqft as number) || (c.buildingSizeSqft as number) || null;
  const stories = (c.stories as number) || null;
  const occupancyType = (c.occupancy_type as string) || (c.occupancyType as string) || null;
  const isNewConstruction = (c.is_new_construction as boolean) ?? (c.isNewConstruction as boolean) ?? null;

  const missingFields: string[] = [];
  if (buildingSqft === null) missingFields.push("building_sqft");
  if (stories === null) missingFields.push("stories");
  if (occupancyType === null) missingFields.push("occupancy_type");
  if (isNewConstruction === null) missingFields.push("is_new_construction");

  return {
    air_permit: thresholdCheck({ agency: airAgency, check_type: "air_permit", sic_code: sicCode, has_emissions_equipment: true, countyConfig }),
    dust: thresholdCheck({ agency: airAgency, check_type: "fugitive_dust", disturbance_acres: acres, countyConfig }),
    tac: thresholdCheck({ agency: airAgency, check_type: "toxic_air_contaminant", sic_code: sicCode, countyConfig }),
    igp: thresholdCheck({ agency: waterAgency, check_type: "industrial_stormwater", sic_code: sicCode, countyConfig }),
    cgp: thresholdCheck({ agency: waterAgency, check_type: "construction_stormwater", disturbance_acres: acres, countyConfig }),
    sanitation: thresholdCheck({ agency: wastewaterAgency, check_type: "wastewater_discharge", sic_code: sicCode, discharges_to_sewer: true, countyConfig }),
    cdfw: thresholdCheck({ agency: "CDFW", check_type: "streambed_alteration", near_waterway: nearWaterway, countyConfig }),
    usace: thresholdCheck({ agency: "USACE", check_type: "section_404", near_waterway: nearWaterway, countyConfig }),
    fire_hazmat: thresholdCheck({ agency: fireAgency, check_type: "hazmat_storage", stores_hazmat: involvesHazmat, countyConfig }),
    fire_hazwaste: thresholdCheck({ agency: fireAgency, check_type: "hazwaste_generator", stores_hazmat: involvesHazmat, countyConfig }),
    ceqa: ceqaExemptionCheck({
      project_type: (c.sic_description as string) || "",
      is_new_construction: true,
      in_urbanized_area: true,
      near_sensitive_environment: nearWaterway,
    }),
    city_permits: cityPermitCheck({
      projectType: (c.sic_description as string) || "",
      buildingSizeSqft: buildingSqft,
      isNewConstruction: isNewConstruction,
      cityConfig,
    }),
    fire_review: fireReviewCheck({
      projectType: (c.sic_description as string) || "",
      buildingSizeSqft: buildingSqft,
      stories,
      occupancyType,
      isNewConstruction: isNewConstruction,
      cityConfig,
    }),
    ...(missingFields.length > 0 ? { missing_classification_fields: missingFields } : {}),
  };
}
