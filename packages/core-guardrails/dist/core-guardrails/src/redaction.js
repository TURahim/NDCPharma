"use strict";
/**
 * PHI Redaction Middleware
 * Ensures no Protected Health Information (PHI) appears in logs or cache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactPHI = redactPHI;
exports.redactObjectPHI = redactObjectPHI;
exports.createSafeCacheKey = createSafeCacheKey;
exports.isComplianceMode = isComplianceMode;
exports.sanitizeLogContext = sanitizeLogContext;
/**
 * PHI patterns to redact
 */
const PHI_PATTERNS = [
    // Names (basic pattern - may need refinement)
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
    // Phone numbers (various formats)
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    // SSN
    /\b\d{3}-\d{2}-\d{4}\b/g,
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // MRN (Medical Record Number) - common patterns
    /\b(MRN|mrn):?\s*\d+\b/gi,
    // Patient ID patterns
    /\b(patient[-_]?id|patientId):?\s*[\w-]+\b/gi,
    // Date of birth patterns
    /\b(dob|date[-_]?of[-_]?birth):?\s*[\d/\-]+\b/gi,
    // Address components (zip codes)
    /\b\d{5}(-\d{4})?\b/g,
];
/**
 * Replacement token for redacted PHI
 */
const REDACTED = '[REDACTED]';
/**
 * Redact PHI from a string
 *
 * @param text - Text that may contain PHI
 * @returns Text with PHI redacted
 */
function redactPHI(text) {
    if (!text)
        return text;
    let redacted = text;
    for (const pattern of PHI_PATTERNS) {
        redacted = redacted.replace(pattern, REDACTED);
    }
    return redacted;
}
/**
 * Redact PHI from an object (deep)
 *
 * @param obj - Object that may contain PHI
 * @returns Object with PHI redacted
 */
function redactObjectPHI(obj) {
    if (!obj)
        return obj;
    if (typeof obj === 'string') {
        return redactPHI(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => redactObjectPHI(item));
    }
    if (typeof obj === 'object') {
        const redacted = {};
        for (const [key, value] of Object.entries(obj)) {
            // Redact keys that are known PHI fields
            if (isKnownPHIField(key)) {
                redacted[key] = REDACTED;
            }
            else if (typeof value === 'string') {
                redacted[key] = redactPHI(value);
            }
            else if (typeof value === 'object' && value !== null) {
                redacted[key] = redactObjectPHI(value);
            }
            else {
                redacted[key] = value;
            }
        }
        return redacted;
    }
    return obj;
}
/**
 * Check if a field name indicates PHI
 *
 * @param fieldName - Field name to check
 * @returns True if field contains PHI
 */
function isKnownPHIField(fieldName) {
    const phiFields = [
        'patientName',
        'patient_name',
        'firstName',
        'first_name',
        'lastName',
        'last_name',
        'fullName',
        'full_name',
        'email',
        'phone',
        'phoneNumber',
        'phone_number',
        'ssn',
        'socialSecurityNumber',
        'social_security_number',
        'mrn',
        'medicalRecordNumber',
        'medical_record_number',
        'patientId',
        'patient_id',
        'dob',
        'dateOfBirth',
        'date_of_birth',
        'birthDate',
        'birth_date',
        'address',
        'streetAddress',
        'street_address',
        'zipCode',
        'zip_code',
        'postalCode',
        'postal_code',
    ];
    return phiFields.includes(fieldName);
}
/**
 * Create a cache key with PHI redacted
 * Ensures cache keys never contain identifiable information
 *
 * @param parts - Parts of the cache key
 * @returns Safe cache key
 */
function createSafeCacheKey(...parts) {
    const sanitized = parts.map(part => {
        if (typeof part === 'string') {
            // Redact any potential PHI
            let safe = redactPHI(part);
            // Additional sanitization for drug names (keep as-is)
            // But ensure no patient-specific info
            safe = safe.toLowerCase().trim();
            return safe;
        }
        return String(part);
    });
    return sanitized.join(':');
}
/**
 * Compliance mode check
 * When enabled, minimal logging and aggressive PHI filtering
 */
function isComplianceMode() {
    return process.env.COMPLIANCE_MODE === 'true';
}
/**
 * Sanitize log context for compliance
 * Removes all potentially sensitive fields
 *
 * @param context - Log context object
 * @returns Sanitized context
 */
function sanitizeLogContext(context) {
    if (!isComplianceMode()) {
        // In non-compliance mode, still redact known PHI
        return redactObjectPHI(context);
    }
    // In compliance mode, be extra cautious
    const allowedFields = [
        'requestId',
        'method',
        'path',
        'statusCode',
        'executionTime',
        'errorCode',
        'drugName', // Drug names are not PHI
        'rxcui', // RxCUIs are not PHI
        'ndc', // NDCs are not PHI
    ];
    const sanitized = {};
    for (const [key, value] of Object.entries(context)) {
        if (allowedFields.includes(key)) {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
