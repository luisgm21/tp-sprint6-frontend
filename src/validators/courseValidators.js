import { z } from 'zod'

export const createCourseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().trim().optional(),
  schoolId: z.string().min(1, 'Seleccioná una escuela'),
})

export const zodToFieldErrors = (zodError) => {
  const flat = zodError.flatten().fieldErrors
  const entries = Object.entries(flat).map(([field, messages]) => [field, messages?.[0] || ''])
  return Object.fromEntries(entries)
}
