"use strict";
/**
 * Output Formatting Utilities
 * Provides consistent formatting for API responses and data presentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatNumber = formatNumber;
exports.formatPercentage = formatPercentage;
exports.formatCurrency = formatCurrency;
exports.formatNDCForDisplay = formatNDCForDisplay;
exports.formatQuantity = formatQuantity;
exports.formatDateISO = formatDateISO;
exports.formatDateHuman = formatDateHuman;
exports.formatExecutionTime = formatExecutionTime;
exports.capitalizeWords = capitalizeWords;
exports.truncateText = truncateText;
exports.formatSuccessResponse = formatSuccessResponse;
exports.formatErrorResponse = formatErrorResponse;
exports.createWarning = createWarning;
exports.formatPackageInfo = formatPackageInfo;
/**
 * Format number with specified decimal places
 */
function formatNumber(value, decimals = 2) {
    return Number(value.toFixed(decimals));
}
/**
 * Format percentage
 */
function formatPercentage(value, decimals = 1) {
    return `${formatNumber(value, decimals)}%`;
}
/**
 * Format currency (USD)
 */
function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value);
}
/**
 * Format NDC for display (ensure consistent format)
 */
function formatNDCForDisplay(ndc) {
    // Remove all non-digit characters
    const digitsOnly = ndc.replace(/\D/g, "");
    // Handle different lengths
    if (digitsOnly.length === 10) {
        // 10-digit: XXXXX-XXX-XX
        return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 8)}-${digitsOnly.slice(8)}`;
    }
    else if (digitsOnly.length === 11) {
        // 11-digit: XXXXX-XXXX-XX
        return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 9)}-${digitsOnly.slice(9)}`;
    }
    // Return as-is if format is unexpected
    return ndc;
}
/**
 * Format quantity with unit
 */
function formatQuantity(quantity, unit) {
    const formattedQuantity = formatNumber(quantity, 2);
    const pluralUnit = quantity === 1 ? unit : `${unit}${unit.endsWith("S") ? "" : "S"}`;
    return `${formattedQuantity} ${pluralUnit.toUpperCase()}`;
}
/**
 * Format date to ISO string
 */
function formatDateISO(date) {
    return date.toISOString();
}
/**
 * Format date to human-readable string
 */
function formatDateHuman(date) {
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}
/**
 * Format execution time in milliseconds
 */
function formatExecutionTime(ms) {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}
/**
 * Capitalize first letter of each word
 */
function capitalizeWords(text) {
    return text
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
/**
 * Truncate text with ellipsis
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength - 3)}...`;
}
/**
 * Format API success response
 */
function formatSuccessResponse(data, message) {
    return {
        success: true,
        ...(message && { message }),
        data,
    };
}
/**
 * Format API error response
 */
function formatErrorResponse(code, message, statusCode, details) {
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
function createWarning(type, message, severity = "medium") {
    return {
        type,
        message,
        severity,
    };
}
function formatPackageInfo(ndc, packageSize, unit, isActive) {
    return {
        ndc: formatNDCForDisplay(ndc),
        packageSize,
        unit: unit.toUpperCase(),
        formattedSize: formatQuantity(packageSize, unit),
        isActive,
    };
}
//# sourceMappingURL=formatters.js.map