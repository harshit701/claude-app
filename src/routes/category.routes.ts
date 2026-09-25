import { Router } from "express";
import { getCategories, postCategory } from "../controllers/category.controller.ts";
import { validate } from "../middleware/validate.ts";
import { createCategorySchema } from "../schemas/category.schema.ts";

const router = Router();

router.post("/categories", validate(createCategorySchema), postCategory);
router.get("/categories", getCategories);

export default router;
