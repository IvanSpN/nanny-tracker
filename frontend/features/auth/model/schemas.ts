import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().trim().min(3, 'Минимум 3 символа'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

export const registerWorkerSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя'),
  email: z.string().trim().email('Укажите email'),
  login: z.string().trim().min(3, 'Минимум 3 символа'),
  password: z.string().min(8, 'Минимум 8 символов'),
  phone: z.string().trim().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterWorkerFormValues = z.infer<typeof registerWorkerSchema>;
