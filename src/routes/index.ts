import { Router } from "express";
import healthRoutes from "./health.routes.ts";
import taskRoutes from "./task.routes.ts";

const router = Router();

router.use(healthRoutes);
router.use(taskRoutes);

export default router;
