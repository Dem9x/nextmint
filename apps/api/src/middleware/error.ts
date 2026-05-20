import type { ErrorRequestHandler, RequestHandler } from "express";

export class AppError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof AppError ? err.statusCode : 500;
  res.status(status).json({
    error: err.message ?? "Internal server error",
    details: err instanceof AppError ? err.details : undefined
  });
};
