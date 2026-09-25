import Joi from "joi";

const priority = Joi.string().valid("low", "medium", "high");
const dueDate = Joi.string().isoDate();
// Capped at 20 so a client can't force an unbounded connect-many on create/update.
const categoryIds = Joi.array().items(Joi.string().guid()).max(20).unique();

export const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().optional(),
  completed: Joi.boolean().optional(),
  priority: priority.optional(),
  dueDate: dueDate.optional(),
  categoryIds: categoryIds.optional(),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).optional(),
  description: Joi.string().trim().optional(),
  completed: Joi.boolean().optional(),
  priority: priority.optional(),
  dueDate: dueDate.optional(),
  categoryIds: categoryIds.optional(),
});

export const taskQuerySchema = Joi.object({
  completed: Joi.boolean().optional(),
  priority: priority.optional(),
  categoryId: Joi.string().guid().optional(),
  sortBy: Joi.string()
    .valid("createdAt", "dueDate", "priority", "completed")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("asc"),
  limit: Joi.number().integer().min(1).max(100).default(20),
  cursor: Joi.string()
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional(),
});
