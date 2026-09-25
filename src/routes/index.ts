import { Router } from "express";
import categoryRoutes from "./category.routes.ts";
import healthRoutes from "./health.routes.ts";
import taskRoutes from "./task.routes.ts";

const router = Router();

router.use(healthRoutes);
router.use(taskRoutes);
router.use(categoryRoutes);

export default router;
