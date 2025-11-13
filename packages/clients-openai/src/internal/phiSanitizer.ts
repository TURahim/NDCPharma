/**
 * PHI/PII Sanitization Utilities
 * Removes or obfuscates protected health information before sending to OpenAI
 */

/**
 * Sanitize data before sending to AI
 * Removes patient identifiers, prescriber info, and timestamps
 * 
 * @param data - Request data to sanitize
 * @returns Sanitized data safe for AI processing
 */
export function sanitizeForAI<T extends Record<string, any>>(data: T): Partial<T> {
  const sanitized: any = {};
  
  // Allowed fields that are safe to send
  const allowedFields = new Set([
    'drug',
    'genericName',
    'brandName',
    'rxcui',
    'dosageForm',
    'strength',
    'prescription',
    'sig',
    'daysSupply',
    'quantityNeeded',
    'availablePackages',
    'ndc',
    'packageSize',
    'unit',
    'labeler',
    'isActive',
  ]);
  
  // Recursively copy allowed fields only
  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.has(key)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = sanitizeForAI(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? sanitizeForAI(item) : item
        );
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * Check if data contains potential PHI/PII
 * Returns warnings if sensitive data is detected
 * 
 * @param data - Data to check
 * @returns Array of warnings about detected PHI/PII
 */
export function detectPHI(data: any): string[] {
  const warnings: string[] = [];
  
  // List of field names that might contain PHI
  const phiFields = [
    'patient',
    'prescriber',
    'provider',
    'physician',
    'doctor',
    'name',
    'firstName',
    'lastName',
    'dob',
    'dateOfBirth',
    'ssn',
    'mrn',
    'medicalRecordNumber',
    'address',
    'phone',
    'email',
    'timestamp',
    'date',
    'created',
    'modified',
  ];
  
  const checkObject = (obj: any, path: string = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();
      
      // Check if field name suggests PHI
      if (phiFields.some(phi => lowerKey.includes(phi))) {
        warnings.push(`Potential PHI detected in field: ${fullPath}`);
      }
      
      // Recursively check nested objects
      if (value && typeof value === 'object') {
        checkObject(value, fullPath);
      }
    }
  };
  
  checkObject(data);
  
  return warnings;
}

