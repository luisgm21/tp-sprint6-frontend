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

Agrega aquí el enlace real de tu deploy frontend:

```txt
https://sprint6morelli.netlify.app
```

En GitHub, puedes usar el icono de copiar del bloque de código para copiar el vínculo rápidamente.

Si también quieres documentar la API desplegada, agrega otra línea en este formato:

```txt
Frontend: https://sprint6morelli.netlify.app
Backend API: https://tp-sprint6-backend.onrender.com
```
