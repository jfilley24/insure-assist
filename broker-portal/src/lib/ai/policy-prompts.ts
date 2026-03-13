export enum SchemaType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
}

export interface Schema {
  type: SchemaType;
  format?: string;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  properties?: { [k: string]: Schema };
  items?: Schema;
}


export const Prompts: Record<string, string> = {
    AUTO: `You are an expert commercial insurance agent. Read the attached Auto Insurance Policy.
Extract the key details and map them to the provided schema.

Extract the 5-digit NAIC Code ONLY if it is explicitly written on the document. If it is not explicitly written, return null. Do NOT guess or use internal knowledge to hallucinate NAIC codes.

CRITICAL INSTRUCTION - AUTO COVERAGE FLAGS:
When evaluating the boolean flags for Auto coverages (covers_any_auto, covers_all_owned_autos, covers_scheduled_autos, covers_hired_autos, covers_non_owned_autos):
1. Look for checkboxes, "X" marks, or explicit "Covered Auto Symbols" (like Symbol 1 for Any Auto, Symbol 2 for Owned Autos, Symbol 7 for Scheduled, 8 for Hired, 9 for Non-Owned).
2. If the box is checked, or the symbol is explicitly listed next to a coverage line, set the field to "true".
3. If the box is explicitly empty, or the limits are blank/nil for that specific auto symbol, set the field to "false".
4. If you cannot find any section regarding this specific coverage type on the document, or if the symbol is completely missing, return "false". Do not return null.`,

    GL: `You are an expert commercial insurance agent. Read the attached General Liability Insurance Policy.
Extract the key details and map them to the provided schema.

Extract the 5-digit NAIC Code ONLY if it is explicitly written on the document. If it is not explicitly written, return null. Do NOT guess or use internal knowledge to hallucinate NAIC codes.

CRITICAL INSTRUCTION - BOOLEAN FLAGS:
For fields like is_occurrence, is_claims_made, has_additional_insured, and has_waiver_of_subrogation:
1. If the checkbox is checked, marked with an X or Y, or explicitly confirmed on the document, set it to "true".
2. If the box is explicitly unchecked, or if there is no mention of this specific coverage/flag anywhere on the document, return "false". Do not return null.`,

    WC: `You are an expert commercial insurance agent. Read the attached Workers Compensation Insurance Policy.
Extract the key details and map them to the provided schema.

Extract the 5-digit NAIC Code ONLY if it is explicitly written on the document. If it is not explicitly written, return null. Do NOT guess or use internal knowledge to hallucinate NAIC codes.

CRITICAL INSTRUCTION - BOOLEAN FLAGS:
For fields like proprietor_excluded and has_waiver_of_subrogation:
1. If the checkbox is checked, marked with an X or Y, or explicitly confirmed on the document, set it to "true".
2. If the box is explicitly unchecked, or if there is no mention of this specific flag anywhere on the document, return "false". Do not return null.`,

    UMBRELLA: `You are an expert commercial insurance agent. Read the attached Umbrella / Excess Liability Insurance Policy.
Extract the key details and map them to the provided schema.

Extract the 5-digit NAIC Code ONLY if it is explicitly written on the document. If it is not explicitly written, return null. Do NOT guess or use internal knowledge to hallucinate NAIC codes.

CRITICAL INSTRUCTION - BOOLEAN FLAGS:
For fields like is_umbrella, is_excess, is_occurrence, and is_claims_made:
1. If the checkbox is checked, marked with an X or Y, or explicitly confirmed on the document, set it to "true".
2. If the box is explicitly unchecked, or if there is no mention of this specific flag anywhere on the document, return "false". Do not return null.`,
};
export const Schemas: Record<string, Schema> = {
    AUTO: {
        type: SchemaType.OBJECT,
        properties: {
            is_matching_policy_type: { type: SchemaType.BOOLEAN, description: "True if the document is actually an Auto policy. False if it is a completely different insurance type like GL or Workers Comp." },
            insurer_name: { type: SchemaType.STRING, description: "REQUIRED: Name of the Insurance Company." },
            naic_code: { type: SchemaType.STRING, nullable: true },
            policy_number: { type: SchemaType.STRING, description: "REQUIRED: The policy number." },
            effective_date: { type: SchemaType.STRING, description: "REQUIRED: ISO 8601 Date" },
            expiration_date: { type: SchemaType.STRING, description: "REQUIRED: ISO 8601 Date" },
            combined_single_limit: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            bodily_injury_per_person: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            bodily_injury_per_accident: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            property_damage_per_accident: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            covers_any_auto: { type: SchemaType.BOOLEAN, description: "True if 'Any Auto' is checked or Symbol 1 is present. False if explicitly unchecked, blank, or missing entirely.", nullable: false },
            covers_all_owned_autos: { type: SchemaType.BOOLEAN, description: "True if 'All Owned Autos' is checked or Symbol 2 is present. False if explicitly unchecked, blank, or missing entirely.", nullable: false },
            covers_scheduled_autos: { type: SchemaType.BOOLEAN, description: "True if 'Scheduled Autos' is checked or Symbol 7 is present. False if explicitly unchecked, blank, or missing entirely.", nullable: false },
            covers_hired_autos: { type: SchemaType.BOOLEAN, description: "True if 'Hired Autos' is checked or Symbol 8 is present. False if explicitly unchecked, blank, or missing entirely.", nullable: false },
            covers_non_owned_autos: { type: SchemaType.BOOLEAN, description: "True if 'Non-Owned Autos' is checked or Symbol 9 is present. False if explicitly unchecked, blank, or missing entirely.", nullable: false },
        }
    },
    GL: {
        type: SchemaType.OBJECT,
        properties: {
            is_matching_policy_type: { type: SchemaType.BOOLEAN, description: "True if the document is actually a General Liability policy. False if it is a completely different insurance type like Auto or Workers Comp.", nullable: false },
            insurer_name: { type: SchemaType.STRING, description: "REQUIRED: Name of the Insurance Company." },
            naic_code: { type: SchemaType.STRING, nullable: true },
            policy_number: { type: SchemaType.STRING, description: "REQUIRED: The policy number." },
            effective_date: { type: SchemaType.STRING, description: "REQUIRED: ISO 8601 Date" },
            expiration_date: { type: SchemaType.STRING, description: "REQUIRED: ISO 8601 Date" },
            is_occurrence: { type: SchemaType.BOOLEAN, description: "True if occurrence checkbox is checked. False if unchecked or missing.", nullable: false },
            is_claims_made: { type: SchemaType.BOOLEAN, description: "True if claims-made checkbox is checked. False if unchecked or missing.", nullable: false },
            each_occurrence: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            damage_to_rented_premises: { type: SchemaType.INTEGER, description: "Raw number, e.g. 100000. Do not use abbreviations. If missing, return null.", nullable: true },
            med_exp: { type: SchemaType.INTEGER, description: "Raw number, e.g. 5000. Do not use abbreviations. If missing, return null.", nullable: true },
            personal_and_adv_injury: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            general_aggregate: { type: SchemaType.INTEGER, description: "Raw number, e.g. 2000000. Do not use abbreviations. If missing, return null.", nullable: true },
            products_comp_op_agg: { type: SchemaType.INTEGER, description: "Raw number, e.g. 2000000. Do not use abbreviations. If missing, return null.", nullable: true },
            has_additional_insured: { type: SchemaType.BOOLEAN, description: "True if Additional Insured is marked Y or explicitly covered. False if N, unchecked, or missing.", nullable: false },
            has_waiver_of_subrogation: { type: SchemaType.BOOLEAN, description: "True if Waiver of Subrogation is marked Y or explicitly covered. False if N, unchecked, or missing.", nullable: false },
        }
    },
    WC: {
        type: SchemaType.OBJECT,
        properties: {
            is_matching_policy_type: { type: SchemaType.BOOLEAN, description: "True if the document is actually a Workers Compensation policy. False if it is a completely different insurance type like Auto or GL.", nullable: false },
            insurer_name: { type: SchemaType.STRING, description: "REQUIRED: Name of the Insurance Company." },
            naic_code: { type: SchemaType.STRING, nullable: true },
            policy_number: { type: SchemaType.STRING, description: "REQUIRED: The policy number." },
            effective_date: { type: SchemaType.STRING, description: "REQUIRED: ISO 8601 Date" },
            expiration_date: { type: SchemaType.STRING, description: "REQUIRED: ISO 8601 Date" },
            proprietor_excluded: { type: SchemaType.BOOLEAN, description: "True if proprietor/partners/officers are explicitly excluded. False if not excluded or missing.", nullable: false },
            el_each_accident: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            el_disease_ea_employee: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            el_disease_policy_limit: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            has_waiver_of_subrogation: { type: SchemaType.BOOLEAN, description: "True if Waiver of Subrogation is marked Y or explicitly covered. False if N, unchecked, or missing.", nullable: false },
        }
    },
    UMBRELLA: {
        type: SchemaType.OBJECT,
        properties: {
            is_matching_policy_type: { type: SchemaType.BOOLEAN, description: "True if the document is an Umbrella OR Excess Liability policy. False if it is a completely different insurance type like Auto or Workers Comp.", nullable: false },
            insurer_name: { type: SchemaType.STRING, description: "REQUIRED: Name of the Insurance Company." },
            naic_code: { type: SchemaType.STRING, nullable: true },
            policy_number: { type: SchemaType.STRING, description: "REQUIRED: The policy number." },
            effective_date: { type: SchemaType.STRING, description: "REQUIRED: ISO 8601 Date" },
            expiration_date: { type: SchemaType.STRING, description: "REQUIRED: ISO 8601 Date" },
            is_umbrella: { type: SchemaType.BOOLEAN, description: "True if Umbrella checkbox is checked. False if unchecked or missing.", nullable: false },
            is_excess: { type: SchemaType.BOOLEAN, description: "True if Excess checkbox is checked. False if unchecked or missing.", nullable: false },
            is_occurrence: { type: SchemaType.BOOLEAN, description: "True if occurrence checkbox is checked. False if unchecked or missing.", nullable: false },
            is_claims_made: { type: SchemaType.BOOLEAN, description: "True if claims-made checkbox is checked. False if unchecked or missing.", nullable: false },
            each_occurrence: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            aggregate: { type: SchemaType.INTEGER, description: "Raw number, e.g. 1000000. Do not use abbreviations. If missing, return null.", nullable: true },
            retention: { type: SchemaType.INTEGER, description: "Raw number, e.g. 10000. Do not use abbreviations. If missing, return null.", nullable: true },
        }
    }
};
