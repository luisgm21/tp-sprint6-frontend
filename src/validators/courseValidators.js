import { z } from 'zod'

export const createCourseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().trim().optional(),
  schoolId: z.string().min(1, 'Seleccioná una escuela'),
  startMonth: z.coerce.number().int().min(1, 'Mes inválido').max(12, 'Mes inválido'),
  endMonth: z.coerce.number().int().min(1, 'Mes inválido').max(12, 'Mes inválido'),
}).refine((data) => data.startMonth <= data.endMonth, {
  message: 'El mes de inicio debe ser menor o igual al mes de fin',
  path: ['endMonth'],
})

export const zodToFieldErrors = (zodError) => {
  const flat = zodError.flatten().fieldErrors
  const entries = Object.entries(flat).map(([field, messages]) => [field, messages?.[0] || ''])
  return Object.fromEntries(entries)
}
