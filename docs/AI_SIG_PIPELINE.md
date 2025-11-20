# AI SIG Pipeline Documentation

## Overview

The AI SIG Pipeline is an intelligent system that converts free-text prescription directions (SIG - Signatura) into structured data using OpenAI's GPT-4o-mini model, with a regex-based fallback for high availability.

## Architecture

### Components

1. **Frontend**: SIG Entry Step & Quantity Review Step
2. **Backend**: Calculate Endpoint with integrated SIG Parser
3. **AI Service**: OpenAI GPT-4o-mini for text parsing
4. **Fallback**: Regex-based pattern matching parser
5. **Safety Layer**: Validation and guardrails

### Data Flow

```
User Input (Free-Text)
    ↓
Frontend Validation (length, format)
    ↓
Backend Calculate Endpoint
    ↓
AI SIG Parser Service
    ├→ OpenAI GPT-4o-mini (primary)
    └→ Regex Fallback (if AI unavailable)
    ↓
Parsed SIG (structured fields)
    ↓
Safety Checks & Validation
    ↓
Quantity Calculation
    ↓
Response with Metadata
    ↓
Frontend Display (Quantity Review)
```

## API Contract

### Request Format

```typescript
{
  drug: {
    name: "metformin",
    rxcui: "197381" // optional
  },
  sig: {
    mode: "freetext",
    text: "Take 1 tablet by mouth twice daily",
    drugContext?: { // optional, helps parser
      dosageForm: "Tablet",
      strength: "500 mg",
      route: "oral"
    }
  },
  daysSupply: 30
}
```

### Response Format

```typescript
{
  success: true,
  data: {
    totalQuantity: 60,
    metadata: {
      sigParser: {
        usedAI: true,
        parsed: {
          dose: 1,
          frequency: 2,
          unit: "tablet",
          route: "oral",
          confidence: 0.95
        },
        originalText: "Take 1 tablet by mouth twice daily",
        warnings: [],
        executionTime: 250,
        aiCost: 0.0012
      }
    },
    explanations: [
      {
        step: "parse_sig",
        description: "Parsed free-text SIG using AI (confidence: 95%)",
        details: {
          method: "ai",
          originalText: "...",
          parsed: {...},
          confidence: 0.95
        }
      }
    ]
  }
}
```

## Parsing Methods

### 1. AI Parsing (Primary)

**Model**: GPT-4o-mini
**Temperature**: 0.2 (low for consistency)
**Max Tokens**: 500
**Cost**: ~$0.001-0.002 per parse

**Advantages**:

- Understands complex instructions
- Handles abbreviations naturally
- Extracts nuanced details (PRN conditions, timing)
- High accuracy (typically >90% confidence)

**Example**:

```
Input: "Take 1-2 tablets every 4-6 hours as needed for pain"
Output: {
  dose: 1,
  frequency: 4,
  unit: "tablet",
  prn: "as needed for pain",
  additionalInstructions: "Use range: 1-2 tablets",
  confidence: 0.92
}
```

### 2. Regex Fallback

**Triggers when**: OpenAI unavailable or fails
**Confidence**: Fixed at 0.6
**Method**: Pattern matching on common structures

**Patterns Recognized**:

- Dose: First number in text (`/(\d+\.?\d*)/`)
- Frequency: Keywords (BID → 2, TID → 3, QID → 4, etc.)
- Unit: Keywords (tablet, mL, puff, unit, drop, etc.)
- Route: Keywords (oral, subcutaneous, topical, etc.)
- PRN: "as needed", "prn" patterns

**Limitations**:

- Less accurate for complex instructions
- May miss nuanced details
- Requires explicit keywords

## Safety Guardrails

### Input Validation

- **Minimum length**: 5 characters
- **Maximum length**: 500 characters
- **Days supply**: Must be positive integer

### Output Validation

- **Dose**: Must be positive number
- **Frequency**: Must be positive integer
- **Unit**: Must be non-empty string
- **Confidence**: Must be 0-1

### Safety Warnings

Automatically flagged:

1. **High tablet/capsule dose** (>10 units)
2. **High frequency** (>8 times/day)
3. **Large liquid dose** (>30 mL)
4. **High insulin dose** (>100 units) - CRITICAL ALERT
5. **Dose ranges** detected
6. **Low confidence** (<0.7)

## Configuration

### Feature Flag

Set in `packages/core-config/src/environment.ts`:

```typescript
ENABLE_SIG_AI: process.env.ENABLE_SIG_AI === "true";
```

### OpenAI Configuration

Set in environment variables:

```bash
OPENAI_API_KEY=sk-...
ENABLE_SIG_AI=true
```

### Cost Controls

- Model: `gpt-4o-mini` (cheaper option)
- Max tokens: 500 (limited response size)
- Timeout: 30 seconds
- Circuit breaker: Fails after 3 consecutive errors

## Monitoring & Observability

### Logs

All parsing attempts are logged with:

```typescript
{
  service: "SigParser",
  sigLength: 45,
  hasDrugContext: true,
  method: "ai" | "regex_fallback" | "failed",
  confidence: 0.95,
  executionTime: 250,
  aiCost: 0.0012,
  warningsCount: 0
}
```

### Metrics to Monitor

1. **Success rate**: % of successful parses
2. **AI usage rate**: % using AI vs regex
3. **Average confidence**: Mean confidence score
4. **Parse time**: P50, P95, P99 latency
5. **AI cost**: Total daily/monthly spend
6. **Warning frequency**: % with safety warnings
7. **Fallback rate**: % using regex fallback

## Error Handling

### Error Codes

- `INVALID_INPUT`: Missing or invalid request fields
- `TEXT_TOO_SHORT`: SIG < 5 characters
- `TEXT_TOO_LONG`: SIG > 500 characters
- `AI_SERVICE_UNAVAILABLE`: OpenAI not available
- `AI_PARSING_FAILED`: AI could not parse
- `AMBIGUOUS_SIG`: Multiple valid interpretations
- `MISSING_REQUIRED_FIELDS`: Parsed output incomplete
- `UNSAFE_DOSING`: Potentially dangerous dose

### Failure Modes

1. **AI unavailable** → Regex fallback → Success
2. **Regex fails** → Return 400 with manual entry prompt
3. **Parsing succeeds but low confidence** → Warnings shown
4. **Safety check fails** → Critical warnings shown

## Best Practices

### For Pharmacists

1. **Review parsed output** in Quantity Review step
2. **Check confidence scores** (aim for >80%)
3. **Verify warnings** before proceeding
4. **Use Structured Mode** for critical/complex prescriptions
5. **Report parsing errors** for system improvement

### For Developers

1. **Always sanitize** PHI before sending to AI
2. **Include drug context** when available
3. **Log all parsing attempts** for audit
4. **Monitor costs** and set alerts
5. **Test edge cases** regularly
6. **Update prompts** based on failure patterns

## Testing

### Unit Tests

Located in: `apps/functions/tests/sig-parser/`

Run tests:

```bash
cd apps/functions
npm test -- sig-parser
```

### Integration Tests

Located in: `apps/functions/tests/integration/`

Run tests:

```bash
npm test -- calculate-freetext-sig
```

### Test Coverage

- Input validation ✅
- Regex fallback ✅
- Safety checks ✅
- Drug context handling ✅
- Error scenarios ✅
- Structured vs free-text ✅
- Explanation steps ✅

## Troubleshooting

### Issue: AI parsing always fails

**Check**:

1. `OPENAI_API_KEY` is set correctly
2. `ENABLE_SIG_AI=true` in environment
3. OpenAI API is accessible (not blocked by firewall)
4. Circuit breaker hasn't opened (check logs)

**Solution**: Regex fallback should activate automatically

### Issue: Low confidence scores

**Possible causes**:

- Ambiguous wording
- Non-standard abbreviations
- Missing dose/frequency/unit
- Complex PRN conditions

**Solution**: Ask user to clarify or use Structured Mode

### Issue: Incorrect parsing

**Steps**:

1. Check logs for parsing details
2. Review AI response in logs
3. Update prompts if pattern detected
4. Add test case to prevent regression

### Issue: High costs

**Actions**:

1. Monitor usage patterns
2. Check for retry loops
3. Consider caching common SIGs
4. Adjust circuit breaker thresholds

## Future Enhancements

- [ ] Cache parsed results for common SIGs
- [ ] Learn from pharmacist corrections
- [ ] Support multi-language SIGs
- [ ] Integrate with EHR systems
- [ ] Add voice-to-text for SIG entry
- [ ] Provide suggested rewording for low-confidence parses
- [ ] A/B test different AI models
- [ ] Build internal dataset for fine-tuning

## References

- [FREE_TEXT_SIG_EXPLAINED.md](../FREE_TEXT_SIG_EXPLAINED.md) - User-facing explanation
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Pharmacy Abbreviations Guide](https://www.ismp.org/recommendations/error-prone-abbreviations-list)
