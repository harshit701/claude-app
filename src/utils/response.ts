import type { Response } from "express";

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
) {
  res.status(statusCode).json({ message, data });
}
