# Promedio Notas - Sistema de Tracking de Notas Universitario

Sistema web para estudiantes universitarios que permite registrar, ponderar y calcular promedios de notas con porcentajes configurables. Soporta asignaturas simples y compuestas (catedra + laboratorio + terreno), con una interfaz moderna y amigable.


## Screenshots

> Los screenshots se agregaran proximamente.

## Stack Tecnologico

| Capa | Tecnologias |
|------|-------------|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, React Router 6, Headless UI, Lucide Icons |
| **Backend** | Node.js/Express, Prisma ORM, PostgreSQL 16 |
| **Autenticacion** | JWT (tokens de 7 dias), bcrypt, rate limiting |
| **Internacionalizacion** | i18n con deteccion automatica ES/EN |
| **Testing** | Vitest, React Testing Library |
| **Deployment** | Vercel (serverless functions + SPA) |
| **Monorepo** | npm workspaces |

## Caracteristicas Principales

- Escala de notas chilena (1.0 - 7.0)
- Pesos configurables como enteros de 1 a 100
- Asignaturas simples (una sola seccion de notas)
- Asignaturas compuestas con multiples componentes (ej: Catedra 60%, Laboratorio 30%, Terreno 10%)
- Calculo automatico de promedios ponderados
- Periodos academicos para organizar asignaturas por semestre
- Autenticacion de usuarios con JWT
- Rate limiting en endpoints de autenticacion (5 intentos/min)
- Interfaz mobile-first responsive
- Modo oscuro/claro con persistencia
- Paleta pastel rosa/morado
- Internacionalizacion automatica ES/EN segun idioma del dispositivo
- 23 tests automatizados (18 backend + 5 frontend)

## Requisitos Previos

- **Node.js** 18.0 o superior
- **PostgreSQL** (una de las siguientes opciones):
  - Docker (para base de datos local)
  - Cuenta gratuita en [Neon](https://neon.tech) (recomendado)
  - Cuenta gratuita en [Supabase](https://supabase.com)
- **npm** 9+ (incluido con Node.js 18+)

## Instalacion

### 1. Clonar el repositorio

```bash
git clone https://github.com/maatist/promedio-notas.git
cd promedio-notas
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instala las dependencias de todos los workspaces (frontend, backend y shared).

### 3. Configurar la base de datos

Ver la seccion [Configuracion de Base de Datos](#configuracion-de-base-de-datos) para detalles sobre cada opcion.

### 4. Crear archivo de variables de entorno

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus valores:

```env
DATABASE_URL=postgresql://user:password@host:5432/promedio_notas
JWT_SECRET=tu-clave-secreta-cambiar-en-produccion
```

### 5. Generar el cliente de Prisma y ejecutar migraciones

```bash
npx prisma generate --schema=packages/backend/prisma/schema.prisma
npx prisma migrate deploy --schema=packages/backend/prisma/schema.prisma
```

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Esto inicia el frontend (puerto 5173) y el backend (puerto 3001) simultaneamente.

> **Alternativa rapida:** Puedes usar el script de setup automatico:
> ```bash
> chmod +x scripts/setup.sh
> ./scripts/setup.sh
> ```

## Configuracion de Base de Datos

### Opcion 1: Neon (Recomendado - Gratuito)

[Neon](https://neon.tech) ofrece PostgreSQL serverless con un tier gratuito generoso. Es la opcion mas facil para empezar:

1. Crea una cuenta en [neon.tech](https://neon.tech)
2. Crea un nuevo proyecto (nombre sugerido: `promedio-notas`)
3. Copia el connection string que te proporciona Neon
4. Pegalo como `DATABASE_URL` en tu archivo `.env`:

```env
DATABASE_URL="postgresql://usuario:password@ep-example-123.us-east-2.aws.neon.tech/promedio_notas?sslmode=require"
```

### Opcion 2: Supabase (Alternativa gratuita)

[Supabase](https://supabase.com) tambien ofrece PostgreSQL gratuito:

1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a Settings > Database > Connection string
4. Usa el URI mode y pegalo como `DATABASE_URL`

### Opcion 3: Docker (Desarrollo local)

Si tienes Docker instalado, puedes usar el `docker-compose.yml` incluido:

```bash
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5432`. El `DATABASE_URL` por defecto ya apunta a este contenedor:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/promedio_notas?schema=public"
```

## Scripts Disponibles

Desde la raiz del proyecto:

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Inicia frontend y backend en modo desarrollo |
| `npm run build` | Compila todos los paquetes (shared, backend, frontend) |
| `npm test` | Ejecuta todos los tests (18 backend + 5 frontend) |
| `npm run lint` | Verifica tipos TypeScript en todos los paquetes |

Desde `packages/backend`:

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Inicia backend con hot-reload (tsx watch) |
| `npm run db:generate` | Genera el cliente Prisma |
| `npm run db:migrate` | Crea y aplica migraciones de desarrollo |
| `npm run db:push` | Sincroniza schema sin crear migracion |

Desde `packages/frontend`:

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Inicia Vite dev server con HMR |
| `npm run build` | Build de produccion |
| `npm run preview` | Preview del build de produccion |

## Variables de Entorno

El proyecto requiere las siguientes variables de entorno. Copia `.env.example` a `.env` y configura los valores:

| Variable | Descripcion | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | Connection string de PostgreSQL (Neon, Supabase o local) | Si |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | Si |
| `PORT` | Puerto del servidor backend (default: 3001) | No |
| `BREVO_API_KEY` | API key de [Brevo](https://brevo.com) para envio de emails | Si (para recovery) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (backend) | Si (para Google login) |
| `FRONTEND_URL` | URL del frontend para enlaces de reset de contraseña | Si (para recovery) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID (frontend, mismo valor) | Si (para Google login) |
| `VITE_API_URL` | URL del API (opcional con proxy de Vite en dev) | No |

### Configuracion de Brevo

1. Crea una cuenta en [brevo.com](https://brevo.com)
2. Genera una API key desde el dashboard (SMTP & API > API Keys)
3. Configura `BREVO_API_KEY` en tu `.env`

### Configuracion de Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita la API de Google Identity
4. Crea credenciales OAuth 2.0 (tipo: Web application)
5. Agrega `http://localhost:5173` en "Authorized JavaScript origins" (desarrollo)
6. Agrega tu dominio de produccion en "Authorized JavaScript origins"
7. Copia el Client ID y configuralo en `GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_ID`

## Estructura del Proyecto

```
promedio-notas/
├── api/
│   └── index.ts              # Serverless function para Vercel
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── types.ts      # Interfaces TypeScript compartidas
│   │       └── index.ts
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma # Schema de base de datos
│   │   │   └── seed.ts       # Datos de ejemplo
│   │   └── src/
│   │       ├── index.ts      # Express app setup
│   │       ├── lib/          # Prisma client, JWT helper
│   │       ├── middleware/   # Auth, validacion, error handler
│   │       ├── routes/       # auth, periods, subjects, grades
│   │       ├── services/     # Calculadora de promedios
│   │       ├── validators/   # Schemas Zod
│   │       └── __tests__/    # Tests unitarios
│   └── frontend/
│       └── src/
│           ├── App.tsx        # Router y providers
│           ├── api/           # Cliente HTTP y servicios
│           ├── components/    # UI components
│           ├── contexts/      # Auth y Theme contexts
│           ├── i18n/          # Traducciones ES/EN
│           ├── pages/         # Login y Dashboard
│           └── __tests__/     # Tests de componentes
├── scripts/
│   └── setup.sh              # Script de configuracion automatica
├── docker-compose.yml         # PostgreSQL local
├── vercel.json                # Configuracion de deployment
├── .env.example               # Variables de entorno de ejemplo
└── package.json               # Workspace root
```

## API Endpoints

Todas las rutas (excepto auth) requieren el header `Authorization: Bearer <token>`.

### Autenticacion

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar usuario (username, password) |
| POST | `/api/auth/login` | Iniciar sesion, retorna JWT |
| GET | `/api/auth/me` | Obtener usuario actual |

### Periodos

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/periods` | Listar periodos del usuario |
| POST | `/api/periods` | Crear periodo (name) |
| PUT | `/api/periods/:id` | Actualizar nombre del periodo |
| DELETE | `/api/periods/:id` | Eliminar periodo (cascada) |

### Asignaturas

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/periods/:periodId/subjects` | Listar asignaturas con notas y promedios |
| POST | `/api/periods/:periodId/subjects` | Crear asignatura (simple o compuesta) |
| PUT | `/api/subjects/:id` | Actualizar asignatura |
| DELETE | `/api/subjects/:id` | Eliminar asignatura (cascada) |

### Notas

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/components/:componentId/grades` | Listar notas de un componente |
| POST | `/api/components/:componentId/grades` | Agregar nota (name, value 1.0-7.0, weight 1-100) |
| PUT | `/api/grades/:id` | Actualizar nota |
| DELETE | `/api/grades/:id` | Eliminar nota |

### Health Check

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor |

## Despliegue en Vercel

### Pasos para deploy

1. **Fork o sube el repositorio** a tu cuenta de GitHub

2. **Importa el proyecto en Vercel:**
   - Ve a [vercel.com/new](https://vercel.com/new)
   - Selecciona tu repositorio
   - Vercel detectara automaticamente la configuracion desde `vercel.json`

3. **Configura las variables de entorno** en Vercel:
   - `DATABASE_URL` - Connection string de tu base de datos PostgreSQL (Neon recomendado)
   - `JWT_SECRET` - Una clave secreta segura para firmar tokens
   - `BREVO_API_KEY` - API key de Brevo para envio de emails de recuperacion
   - `GOOGLE_CLIENT_ID` - Client ID de Google OAuth (backend)
   - `FRONTEND_URL` - URL del frontend para enlaces de reset (ej: `https://tu-app.vercel.app`)
   - `VITE_GOOGLE_CLIENT_ID` - Client ID de Google OAuth (frontend, mismo valor que `GOOGLE_CLIENT_ID`)
   - `VERCEL=1` - Se establece automaticamente por Vercel

4. **Despliega:**
   - Vercel ejecutara `npm run build` automaticamente
   - El frontend se sirve como SPA estatica
   - El backend funciona como serverless function en `/api/*`

5. **Configura el schema en la base de datos de produccion:**

   Tienes dos opciones dependiendo de tu situacion:

   **Opcion A: `prisma db push` (recomendado para setup inicial)**
   
   Sincroniza el schema directamente con la base de datos sin necesidad de historial de migraciones. Ideal para el primer despliegue o cuando no tienes migraciones creadas:
   ```bash
   DATABASE_URL="<neon-connection-string>" npx prisma db push --schema=packages/backend/prisma/schema.prisma
   ```

   **Opcion B: `prisma migrate deploy` (para migraciones existentes)**
   
   Aplica migraciones previamente creadas con `prisma migrate dev`. Usar cuando ya tienes un historial de migraciones en `prisma/migrations/`:
   ```bash
   DATABASE_URL="<neon-connection-string>" npx prisma migrate deploy --schema=packages/backend/prisma/schema.prisma
   ```

   > **Nota:** Este paso es necesario ejecutarlo una sola vez antes del primer despliegue (o cada vez que cambies el schema). Sin las tablas creadas en la base de datos de produccion, las API requests fallaran con errores tipo `relation "User" does not exist`.

### Configuracion incluida (vercel.json)

- Framework: Vite
- Build output: `packages/frontend/dist`
- API routes: `/api/*` redirigen a la serverless function
- SPA fallback: todas las demas rutas sirven `index.html`

## Licencia

MIT License - ver [LICENSE](LICENSE) para mas detalles.
