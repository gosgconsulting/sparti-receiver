// Error handling utilities
import { Response } from "express";
import { ErrorResponse, SuccessResponse } from "../types";

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a standardized error response object
 */
export function createErrorResponse(
  error: string,
  message?: string,
  statusCode: number = 500
): ErrorResponse {
  return {
    success: false,
    error,
    message: message || error,
  };
}

/**
 * Create a standardized success response object
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string
): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
  };

  if (message) {
    response.message = message;
  }

  if (data !== undefined) {
    response.data = data;
  }

  return response;
}

/**
 * Send error response to client
 */
export function sendErrorResponse(
  res: Response,
  error: string,
  statusCode: number = 500,
  message?: string
): void {
  const errorResponse = createErrorResponse(error, message, statusCode);
  res.status(statusCode).json(errorResponse);
}

/**
 * Send success response to client
 */
export function sendSuccessResponse<T>(
  res: Response,
  data?: T,
  statusCode: number = 200,
  message?: string
): void {
  const successResponse = createSuccessResponse(data, message);
  res.status(statusCode).json(successResponse);
}

/**
 * Format error message with context
 */
export function formatErrorMessage(
  operation: string,
  details?: string
): string {
  if (details) {
    return `${operation}: ${details}`;
  }
  return operation;
}

/**
 * Check if error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

