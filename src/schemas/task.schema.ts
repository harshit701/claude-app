import Joi from "joi";

export const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().optional(),
  completed: Joi.boolean().optional(),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).optional(),
  description: Joi.string().trim().optional(),
  completed: Joi.boolean().optional(),
});

export const taskQuerySchema = Joi.object({
  completed: Joi.boolean().optional(),
});
