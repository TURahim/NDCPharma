/**
 * AI Prompts for NDC Matching
 * System and user prompts for pharmaceutical NDC recommendation
 */

/**
 * System prompt for pharmaceutical context
 * Sets up the AI as a knowledgeable pharmacy assistant
 */
export const SYSTEM_PROMPT = `You are an expert pharmaceutical AI assistant specializing in NDC (National Drug Code) package selection and prescription fulfillment. Your role is to recommend the most appropriate NDC packages for dispensing medications based on prescription details.

**Your Responsibilities:**
1. Analyze the prescription requirements (drug, SIG, days' supply)
2. Evaluate available NDC packages for optimal selection
3. Minimize waste while ensuring adequate supply
4. Consider cost-effectiveness and patient convenience
5. Provide clear reasoning for your recommendations

**Key Principles:**
- Patient safety is paramount
- Minimize medication waste
- Optimize cost-effectiveness
- Prefer packages that minimize the number of containers
- Consider standard pharmacy practices
- Account for package size availability

**Output Format:**
You must respond with a valid JSON object following this exact structure:
{
  "primaryRecommendation": {
    "ndc": "string (11-digit NDC)",
    "packageSize": number,
    "unit": "string (e.g., TABLET, CAPSULE)",
    "quantityToDispense": number,
    "reasoning": "string (detailed explanation)",
    "confidenceScore": number (0-1)
  },
  "alternatives": [
    {
      "ndc": "string",
      "packageSize": number,
      "unit": "string",
      "quantityToDispense": number,
      "reasoning": "string",
      "confidenceScore": number
    }
  ],
  "reasoning": {
    "factors": ["array of key factors considered"],
    "considerations": ["array of risks or special considerations"],
    "rationale": "string (overall reasoning)"
  },
  "costEfficiency": {
    "estimatedWaste": number (percentage 0-100),
    "rating": "low" | "medium" | "high"
  }
}`;

/**
 * Few-shot learning examples
 * Demonstrates expected behavior with examples
 */
export const FEW_SHOT_EXAMPLES = [
  {
    role: 'user' as const,
    content: JSON.stringify({
      drug: {
        genericName: 'LISINOPRIL',
        rxcui: '104377',
        dosageForm: 'TABLET',
        strength: '10 mg',
      },
      prescription: {
        sig: '1 tablet daily',
        daysSupply: 90,
        quantityNeeded: 90,
      },
      availablePackages: [
        { ndc: '00071-0156-23', packageSize: 100, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        { ndc: '00071-0156-30', packageSize: 30, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
      ],
    }),
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      primaryRecommendation: {
        ndc: '00071-0156-90',
        packageSize: 90,
        unit: 'TABLET',
        quantityToDispense: 90,
        reasoning: 'The 90-tablet package exactly matches the 90-day supply requirement with zero waste. This is the most cost-effective option and simplifies dispensing with a single container.',
        confidenceScore: 0.98,
      },
      alternatives: [
        {
          ndc: '00071-0156-23',
          packageSize: 100,
          unit: 'TABLET',
          quantityToDispense: 100,
          reasoning: 'The 100-tablet package provides slight overage (10 tablets, 11% waste) but may be more cost-effective depending on pricing. Acceptable alternative if 90-count is unavailable.',
          confidenceScore: 0.85,
        },
      ],
      reasoning: {
        factors: [
          'Exact match with prescription requirement (90 tablets)',
          'Zero medication waste',
          'Single container for patient convenience',
          'Standard 90-day supply for chronic medication',
        ],
        considerations: [
          'Verify package availability with distributor',
          'Confirm pricing competitiveness vs. 100-count',
          'Patient may prefer smaller packages for first fill',
        ],
        rationale: 'The 90-tablet package is optimal because it precisely matches the prescription requirement with no waste, uses a single container for patient convenience, and aligns with standard 90-day supply practices for chronic medications like antihypertensives.',
      },
      costEfficiency: {
        estimatedWaste: 0,
        rating: 'high',
      },
    }),
  },
];

/**
 * Generate user prompt for NDC recommendation
 * @param request NDC recommendation request
 * @returns Formatted user prompt
 */
export function generateUserPrompt(request: {
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
}): string {
  const { drug, prescription, availablePackages, context } = request;

  let prompt = `Please recommend the most appropriate NDC package(s) for the following prescription:

**Drug Information:**
- Generic Name: ${drug.genericName}
- RxCUI: ${drug.rxcui}`;

  if (drug.brandName) {
    prompt += `\n- Brand Name: ${drug.brandName}`;
  }

  if (drug.dosageForm) {
    prompt += `\n- Dosage Form: ${drug.dosageForm}`;
  }

  if (drug.strength) {
    prompt += `\n- Strength: ${drug.strength}`;
  }

  prompt += `

**Prescription Details:**
- SIG (Directions): ${prescription.sig}
- Days' Supply: ${prescription.daysSupply} days
- Total Quantity Needed: ${prescription.quantityNeeded}

**Available NDC Packages:**`;

  availablePackages.forEach((pkg, index) => {
    prompt += `
${index + 1}. NDC: ${pkg.ndc}
   - Package Size: ${pkg.packageSize} ${pkg.unit}
   - Manufacturer: ${pkg.labeler}
   - Status: ${pkg.isActive ? 'Active' : 'Inactive'}`;
  });

  if (context?.preferences) {
    prompt += `

**Patient Preferences:**
${context.preferences}`;
  }

  if (context?.clinicalNotes) {
    prompt += `

**Clinical Considerations:**
${context.clinicalNotes}`;
  }

  prompt += `

Please analyze these options and provide your recommendation in the specified JSON format. Consider:
1. Minimizing waste while meeting the prescription requirement
2. Cost-effectiveness (fewer, larger packages when appropriate)
3. Patient convenience (minimize number of containers)
4. Standard pharmacy practices
5. Any special considerations mentioned above

Respond with a valid JSON object only.`;

  return prompt;
}

/**
 * Validate AI response structure
 * @param response Raw AI response
 * @returns True if valid structure
 */
export function validateResponseStructure(response: any): boolean {
  if (!response || typeof response !== 'object') return false;

  // Check primary recommendation
  if (
    !response.primaryRecommendation ||
    !response.primaryRecommendation.ndc ||
    typeof response.primaryRecommendation.packageSize !== 'number' ||
    !response.primaryRecommendation.unit ||
    typeof response.primaryRecommendation.quantityToDispense !== 'number' ||
    !response.primaryRecommendation.reasoning ||
    typeof response.primaryRecommendation.confidenceScore !== 'number'
  ) {
    return false;
  }

  // Check alternatives
  if (!Array.isArray(response.alternatives)) return false;

  // Check reasoning
  if (
    !response.reasoning ||
    !Array.isArray(response.reasoning.factors) ||
    !Array.isArray(response.reasoning.considerations) ||
    !response.reasoning.rationale
  ) {
    return false;
  }

  // Check cost efficiency (optional)
  if (response.costEfficiency) {
    if (
      typeof response.costEfficiency.estimatedWaste !== 'number' ||
      !['low', 'medium', 'high'].includes(response.costEfficiency.rating)
    ) {
      return false;
    }
  }

  return true;
}

