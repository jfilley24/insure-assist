import { SchemaType, Schema } from "@google-cloud/vertexai";


export const Prompts: Record<string, string> = {
    AUTO: `You are the Auto Policy Reader Agent, a specialized insurance AI whose sole job is to analyze Commercial Auto Liability policy documents. Read the provided policy document. First, strictly verify if this document is actually an Auto Liability policy. If it is a different type of policy (like General Liability or Workers Comp), set "is_matching_policy_type" to false and return null for all other fields. If it matches, extract the exact coverages your client actually has. If a specific limit or coverage type is missing, return null or false.`,
    GL: `You are the General Liability Policy Reader Agent, a specialized insurance AI whose sole job is to analyze Commercial General Liability policy documents. Read the provided policy document. First, strictly verify if this document is actually a General Liability policy. If it is a different type of policy (like Auto or Workers Comp), set "is_matching_policy_type" to false and return null for all other fields. If it matches, extract the exact coverages your client actually has. If a specific limit or coverage type is missing, return null or false.`,
    WC: `You are the Workers Compensation Policy Reader Agent, a specialized insurance AI whose sole job is to analyze Workers Compensation policy documents. Read the provided policy document. First, strictly verify if this document is actually a Workers Compensation policy. If it is a different type of policy (like Auto or General Liability), set "is_matching_policy_type" to false and return null for all other fields. If it matches, extract the exact coverages your client actually has. If a specific limit or coverage type is missing, return null or false.`,
    UMBRELLA: `You are the Umbrella Liability Policy Reader Agent, a specialized insurance AI whose sole job is to analyze Commercial Umbrella or Excess Liability policy documents. Read the provided policy document. First, strictly verify if this document is actually an Umbrella or Excess policy. If it is a different type of policy (like Auto or General Liability), set "is_matching_policy_type" to false and return null for all other fields. If it matches, extract the exact coverages your client actually has. If a specific limit or coverage type is missing, return null or false.`
};
export const Schemas: Record<string, Schema> = {
    AUTO: {
        type: SchemaType.OBJECT,
        properties: {
            is_matching_policy_type: { type: SchemaType.BOOLEAN, description: "True if the document is actually an Auto policy. False if it is a different insurance type." },
            insurer_name: { type: SchemaType.STRING, nullable: true },
            policy_number: { type: SchemaType.STRING, nullable: true },
            effective_date: { type: SchemaType.STRING, description: "ISO 8601 Date", nullable: true },
            expiration_date: { type: SchemaType.STRING, description: "ISO 8601 Date", nullable: true },
            combined_single_limit: { type: SchemaType.STRING, nullable: true },
            bodily_injury_per_person: { type: SchemaType.STRING, nullable: true },
            bodily_injury_per_accident: { type: SchemaType.STRING, nullable: true },
            property_damage_per_accident: { type: SchemaType.STRING, nullable: true },
            covers_any_auto: { type: SchemaType.BOOLEAN, nullable: true },
            covers_all_owned_autos: { type: SchemaType.BOOLEAN, nullable: true },
            covers_scheduled_autos: { type: SchemaType.BOOLEAN, nullable: true },
            covers_hired_autos: { type: SchemaType.BOOLEAN, nullable: true },
            covers_non_owned_autos: { type: SchemaType.BOOLEAN, nullable: true },
        }
    },
    GL: {
        type: SchemaType.OBJECT,
        properties: {
            is_matching_policy_type: { type: SchemaType.BOOLEAN, description: "True if the document is actually a General Liability policy. False if it is a different insurance type." },
            insurer_name: { type: SchemaType.STRING, nullable: true },
            policy_number: { type: SchemaType.STRING, nullable: true },
            effective_date: { type: SchemaType.STRING, description: "ISO 8601 Date", nullable: true },
            expiration_date: { type: SchemaType.STRING, description: "ISO 8601 Date", nullable: true },
            is_occurrence: { type: SchemaType.BOOLEAN, nullable: true },
            is_claims_made: { type: SchemaType.BOOLEAN, nullable: true },
            each_occurrence: { type: SchemaType.STRING, nullable: true },
            damage_to_rented_premises: { type: SchemaType.STRING, nullable: true },
            med_exp: { type: SchemaType.STRING, nullable: true },
            personal_and_adv_injury: { type: SchemaType.STRING, nullable: true },
            general_aggregate: { type: SchemaType.STRING, nullable: true },
            products_comp_op_agg: { type: SchemaType.STRING, nullable: true },
            has_additional_insured: { type: SchemaType.BOOLEAN, nullable: true },
            has_waiver_of_subrogation: { type: SchemaType.BOOLEAN, nullable: true },
        }
    },
    WC: {
        type: SchemaType.OBJECT,
        properties: {
            is_matching_policy_type: { type: SchemaType.BOOLEAN, description: "True if the document is actually a Workers Compensation policy. False if it is a different insurance type." },
            insurer_name: { type: SchemaType.STRING, nullable: true },
            policy_number: { type: SchemaType.STRING, nullable: true },
            effective_date: { type: SchemaType.STRING, description: "ISO 8601 Date", nullable: true },
            expiration_date: { type: SchemaType.STRING, description: "ISO 8601 Date", nullable: true },
            proprietor_excluded: { type: SchemaType.BOOLEAN, nullable: true },
            el_each_accident: { type: SchemaType.STRING, nullable: true },
            el_disease_ea_employee: { type: SchemaType.STRING, nullable: true },
            el_disease_policy_limit: { type: SchemaType.STRING, nullable: true },
            has_waiver_of_subrogation: { type: SchemaType.BOOLEAN, nullable: true },
        }
    },
    UMBRELLA: {
        type: SchemaType.OBJECT,
        properties: {
            is_matching_policy_type: { type: SchemaType.BOOLEAN, description: "True if the document is actually an Umbrella policy. False if it is a different insurance type." },
            insurer_name: { type: SchemaType.STRING, nullable: true },
            policy_number: { type: SchemaType.STRING, nullable: true },
            effective_date: { type: SchemaType.STRING, description: "ISO 8601 Date", nullable: true },
            expiration_date: { type: SchemaType.STRING, description: "ISO 8601 Date", nullable: true },
            is_umbrella: { type: SchemaType.BOOLEAN, nullable: true },
            is_excess: { type: SchemaType.BOOLEAN, nullable: true },
            is_occurrence: { type: SchemaType.BOOLEAN, nullable: true },
            is_claims_made: { type: SchemaType.BOOLEAN, nullable: true },
            each_occurrence: { type: SchemaType.STRING, nullable: true },
            aggregate: { type: SchemaType.STRING, nullable: true },
            retention: { type: SchemaType.STRING, nullable: true },
        }
    }
};
