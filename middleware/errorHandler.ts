// Express error handling middleware
import { Request, Response, NextFunction } from "express";
import { AppError, getErrorMessage, sendErrorResponse, isAppError } from "../utils/errors";

/**
 * Global error handling middleware
 * Handles all errors gracefully without crashing the application
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error for debugging
  const errorMessage = getErrorMessage(err);
  console.error("[testing] Unhandled error:", errorMessage);

  // Handle AppError instances
  if (isAppError(err)) {
    sendErrorResponse(res, err.message, err.statusCode, err.message);
    return;
  }

  // Handle known error types
  if (err instanceof Error) {
    // Check for database connection errors
    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("connection")) {
      sendErrorResponse(
        res,
        "Database connection failed",
        503,
        "Unable to connect to the database. Please check your database configuration."
      );
      return;
    }

    // Check for validation errors
    if (errorMessage.includes("validation") || errorMessage.includes("invalid")) {
      sendErrorResponse(res, "Validation error", 400, errorMessage);
      return;
    }
  }

  // Default error response for unknown errors
  sendErrorResponse(
    res,
    "Internal server error",
    500,
    "An unexpected error occurred. Please try again later."
  );
}

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

