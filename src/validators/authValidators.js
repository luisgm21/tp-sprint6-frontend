import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio')
  .email('Email inválido')

const passwordSchema = z
  .string()
  .min(1, 'La contraseña es obligatoria')

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio'),
    email: emailSchema,
    password: z
      .string()
      .min(1, 'La contraseña es obligatoria')
      .min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmá la contraseña'),
    role: z.enum(['teacher', 'admin'], { message: 'Seleccioná un rol válido' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  email: emailSchema,
  role: z.string().min(1, 'Seleccioná un rol'),
})

export const zodToFieldErrors = (zodError) => {
  const flat = zodError.flatten().fieldErrors
  const entries = Object.entries(flat).map(([field, messages]) => [field, messages?.[0] || ''])
  return Object.fromEntries(entries)
}
