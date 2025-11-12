/**
 * AI Prompts for NDC Matching
 * System and user prompts for pharmaceutical NDC recommendation
 */
/**
 * System prompt for pharmaceutical context
 * Sets up the AI as a knowledgeable pharmacy assistant
 */
export declare const SYSTEM_PROMPT = "You are an expert pharmaceutical AI assistant specializing in NDC (National Drug Code) package selection and prescription fulfillment. Your role is to recommend the most appropriate NDC packages for dispensing medications based on prescription details.\n\n**Your Responsibilities:**\n1. Analyze the prescription requirements (drug, SIG, days' supply)\n2. Evaluate available NDC packages for optimal selection\n3. Minimize waste while ensuring adequate supply\n4. Consider cost-effectiveness and patient convenience\n5. Provide clear reasoning for your recommendations\n\n**Key Principles:**\n- Patient safety is paramount\n- Minimize medication waste\n- Optimize cost-effectiveness\n- Prefer packages that minimize the number of containers\n- Consider standard pharmacy practices\n- Account for package size availability\n\n**Output Format:**\nYou must respond with a valid JSON object following this exact structure:\n{\n  \"primaryRecommendation\": {\n    \"ndc\": \"string (11-digit NDC)\",\n    \"packageSize\": number,\n    \"unit\": \"string (e.g., TABLET, CAPSULE)\",\n    \"quantityToDispense\": number,\n    \"reasoning\": \"string (detailed explanation)\",\n    \"confidenceScore\": number (0-1)\n  },\n  \"alternatives\": [\n    {\n      \"ndc\": \"string\",\n      \"packageSize\": number,\n      \"unit\": \"string\",\n      \"quantityToDispense\": number,\n      \"reasoning\": \"string\",\n      \"confidenceScore\": number\n    }\n  ],\n  \"reasoning\": {\n    \"factors\": [\"array of key factors considered\"],\n    \"considerations\": [\"array of risks or special considerations\"],\n    \"rationale\": \"string (overall reasoning)\"\n  },\n  \"costEfficiency\": {\n    \"estimatedWaste\": number (percentage 0-100),\n    \"rating\": \"low\" | \"medium\" | \"high\"\n  }\n}";
/**
 * Few-shot learning examples
 * Demonstrates expected behavior with examples
 */
export declare const FEW_SHOT_EXAMPLES: ({
    role: "user";
    content: string;
} | {
    role: "assistant";
    content: string;
})[];
/**
 * Generate user prompt for NDC recommendation
 * @param request NDC recommendation request
 * @returns Formatted user prompt
 */
export declare function generateUserPrompt(request: {
    drug: {
        genericName: string;
        rxcui: string;
        brandName?: string;
        dosageForm?: string;
        strength?: string;
    };
    prescription: {
        sig: string;
        daysSupply: number;
        quantityNeeded: number;
    };
    availablePackages: Array<{
        ndc: string;
        packageSize: number;
        unit: string;
        labeler: string;
        isActive: boolean;
    }>;
    context?: {
        preferences?: string;
        clinicalNotes?: string;
    };
}): string;
/**
 * Validate AI response structure
 * @param response Raw AI response
 * @returns True if valid structure
 */
export declare function validateResponseStructure(response: any): boolean;
//# sourceMappingURL=prompts.d.ts.map