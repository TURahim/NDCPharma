/**
 * Output Formatting Utilities
 * Provides consistent formatting for API responses and data presentation
 */

/**
 * Format number with specified decimal places
 */
export function formatNumber(value: number, decimals: number = 2): number {
  return Number(value.toFixed(decimals));
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format currency (USD)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Format NDC for display (ensure consistent format)
 */
export function formatNDCForDisplay(ndc: string): string {
  // Remove all non-digit characters
  const digitsOnly = ndc.replace(/\D/g, "");

  // Handle different lengths
  if (digitsOnly.length === 10) {
    // 10-digit: XXXXX-XXX-XX
    return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 8)}-${digitsOnly.slice(8)}`;
  } else if (digitsOnly.length === 11) {
    // 11-digit: XXXXX-XXXX-XX
    return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 9)}-${digitsOnly.slice(9)}`;
  }

  // Return as-is if format is unexpected
  return ndc;
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit: string): string {
  const formattedQuantity = formatNumber(quantity, 2);
  const pluralUnit = quantity === 1 ? unit : `${unit}${unit.endsWith("S") ? "" : "S"}`;
  return `${formattedQuantity} ${pluralUnit.toUpperCase()}`;
}

/**
 * Format date to ISO string
 */
export function formatDateISO(date: Date): string {
  return date.toISOString();
}

/**
 * Format date to human-readable string
 */
export function formatDateHuman(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format execution time in milliseconds
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format API success response
 */
export function formatSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    ...(message && { message }),
    data,
  };
}

/**
 * Format API error response
 */
export function formatErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: unknown
) {
  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

/**
 * Format warning message
 */
export interface Warning {
  type: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export function createWarning(
  type: string,
  message: string,
  severity: "low" | "medium" | "high" = "medium"
): Warning {
  return {
    type,
    message,
    severity,
  };
}

/**
 * Format package information for display
 */
export interface FormattedPackage {
  ndc: string;
  packageSize: number;
  unit: string;
  formattedSize: string;
  isActive: boolean;
}

export function formatPackageInfo(
  ndc: string,
  packageSize: number,
  unit: string,
  isActive: boolean
): FormattedPackage {
  return {
    ndc: formatNDCForDisplay(ndc),
    packageSize,
    unit: unit.toUpperCase(),
    formattedSize: formatQuantity(packageSize, unit),
    isActive,
  };
}

