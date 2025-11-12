/**
 * Shared API types
 */
export interface BaseAPIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        statusCode: number;
        details?: unknown;
    };
}
