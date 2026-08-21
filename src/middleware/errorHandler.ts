import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.ts";

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
}
