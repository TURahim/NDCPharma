/**
 * Output Formatting Utilities
 * Provides consistent formatting for API responses and data presentation
 */
/**
 * Format number with specified decimal places
 */
export declare function formatNumber(value: number, decimals?: number): number;
/**
 * Format percentage
 */
export declare function formatPercentage(value: number, decimals?: number): string;
/**
 * Format currency (USD)
 */
export declare function formatCurrency(value: number): string;
/**
 * Format NDC for display (ensure consistent format)
 */
export declare function formatNDCForDisplay(ndc: string): string;
/**
 * Format quantity with unit
 */
export declare function formatQuantity(quantity: number, unit: string): string;
/**
 * Format date to ISO string
 */
export declare function formatDateISO(date: Date): string;
/**
 * Format date to human-readable string
 */
export declare function formatDateHuman(date: Date): string;
/**
 * Format execution time in milliseconds
 */
export declare function formatExecutionTime(ms: number): string;
/**
 * Capitalize first letter of each word
 */
export declare function capitalizeWords(text: string): string;
/**
 * Truncate text with ellipsis
 */
export declare function truncateText(text: string, maxLength: number): string;
/**
 * Format API success response
 */
export declare function formatSuccessResponse<T>(data: T, message?: string): {
    data: T;
    message?: string | undefined;
    success: boolean;
};
/**
 * Format API error response
 */
export declare function formatErrorResponse(code: string, message: string, statusCode: number, details?: unknown): {
    success: boolean;
    error: {
        details?: {} | null | undefined;
        code: string;
        message: string;
        statusCode: number;
    };
};
/**
 * Format warning message
 */
export interface Warning {
    type: string;
    message: string;
    severity: "low" | "medium" | "high";
}
export declare function createWarning(type: string, message: string, severity?: "low" | "medium" | "high"): Warning;
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
export declare function formatPackageInfo(ndc: string, packageSize: number, unit: string, isActive: boolean): FormattedPackage;
