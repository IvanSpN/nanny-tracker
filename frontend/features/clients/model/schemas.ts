import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя'),
  phone: z.string().trim().optional(),
  regularRate: z.coerce.number().positive('Укажите ставку'),
  weekendRate: z.coerce.number().positive('Укажите ставку').optional(),
  notes: z.string().trim().optional(),
});

export type CreateClientFormInput = z.input<typeof createClientSchema>;
export type CreateClientFormValues = z.output<typeof createClientSchema>;
