import type { NextFunction, Request, Response } from "express";
import {
  createCategory,
  getAllCategories,
} from "../services/category.service.ts";
import type { CreateCategoryInput } from "../types/category.types.ts";
import { sendSuccess } from "../utils/response.ts";

export async function postCategory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const category = await createCategory(req.body as CreateCategoryInput);
    sendSuccess(res, 201, "Category created successfully", category);
  } catch (error) {
    next(error);
  }
}

export async function getCategories(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const categories = await getAllCategories();
    sendSuccess(res, 200, "Categories retrieved successfully", categories);
  } catch (error) {
    next(error);
  }
}
