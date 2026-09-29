import { z } from 'zod';

const optionalPositiveNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().positive('Укажите ставку').optional(),
);

export const specialDaySchema = z.object({
  weekday: z.coerce.number().int().min(1).max(7),
  rate: z.coerce.number().positive('Укажите ставку'),
});

export const createClientSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя'),
  regularRate: z.coerce.number().positive('Укажите ставку'),
  weekendRate: optionalPositiveNumber,
  specialDays: z.array(specialDaySchema).superRefine((specialDays, context) => {
    const seen = new Set<number>();

    specialDays.forEach((specialDay, index) => {
      if (seen.has(specialDay.weekday)) {
        context.addIssue({
          code: 'custom',
          message: 'Этот день уже добавлен',
          path: [index, 'weekday'],
        });
      }

      seen.add(specialDay.weekday);
    });
  }),
  notes: z.string().trim().optional(),
});

export type CreateClientFormInput = z.input<typeof createClientSchema>;
export type CreateClientFormValues = z.output<typeof createClientSchema>;

export type SpecialDayFormInput = z.input<typeof specialDaySchema>;
export type SpecialDayFormValues = z.output<typeof specialDaySchema>;
