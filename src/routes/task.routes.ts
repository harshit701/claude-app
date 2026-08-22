import { Router } from "express";
import {
  getTask,
  getTasks,
  patchTask,
  postTask,
  removeTask,
} from "../controllers/task.controller.ts";
import { validate, validateQuery } from "../middleware/validate.ts";
import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
} from "../schemas/task.schema.ts";

const router = Router();

router.post("/tasks", validate(createTaskSchema), postTask);
router.get("/tasks", validateQuery(taskQuerySchema), getTasks);
router.get("/tasks/:id", getTask);
router.patch("/tasks/:id", validate(updateTaskSchema), patchTask);
router.delete("/tasks/:id", removeTask);

export default router;
