import { z } from 'zod';

const optionalPositiveNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().positive('Укажите ставку').optional(),
);

export const createClientSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя'),
  regularRate: z.coerce.number().positive('Укажите ставку'),
  weekendRate: optionalPositiveNumber,
  notes: z.string().trim().optional(),
});

export type CreateClientFormInput = z.input<typeof createClientSchema>;
export type CreateClientFormValues = z.output<typeof createClientSchema>;
