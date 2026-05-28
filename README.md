# TP Sprint 6 - Frontend

Aplicación frontend desarrollada con React + Vite para la gestión académica, con autenticación y vistas según rol.

## Descripción del proyecto

Este frontend consume una API backend para administrar:

- Usuarios (admin)
- Cursos y estudiantes
- Evaluaciones numéricas, por rúbrica y checklist
- Plantillas de rúbricas (generales y por colegio)
- Configuración de perfil
- Modo oscuro

La interfaz distingue permisos por rol, principalmente administrador y docente.

## Tecnologías

- React
- Vite
- React Router
- Tailwind CSS
- SweetAlert2
- Zod

## Scripts disponibles

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## Variables de entorno

Crear archivo `.env.local` con:

```env
VITE_API_URL=http://localhost:3000
```

## Deploy

URL pública del frontend:

https://sprint6morelli.netlify.app

Para copiar rápido (botón Copy en GitHub):

```txt
FRONTEND_URL=https://sprint6morelli.netlify.app
```

Si también quieres documentar la API desplegada:

```txt
FRONTEND_URL=https://sprint6morelli.netlify.app
BACKEND_URL=https://tp-sprint6-backend.onrender.com
```
