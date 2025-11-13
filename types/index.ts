// Shared type definitions for the application

/**
 * Type for individual sheet row data (flexible JSON object)
 */
export type SheetDataRow = Record<string, unknown>;

/**
 * Error information for a specific row that failed to insert
 */
export interface RowError {
  rowIndex: number;
  rowNumber: number;
  rowData: SheetDataRow;
  error: string;
}

/**
 * Result of storing sheet data
 */
export interface StoreSheetDataResult {
  success: boolean;
  batchId: number;
  inserted: number;
  errors: RowError[];
}

/**
 * Generic API response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  [key: string]: unknown;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
}

/**
 * Success response structure
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data?: T;
  [key: string]: unknown;
}


