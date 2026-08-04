import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[Error] ${statusCode}: ${message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

export function createError(statusCode: number, message: string): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  return error;
}
