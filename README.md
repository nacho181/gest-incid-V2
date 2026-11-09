# Municipalidad de Concordia — Sistema Integral de Registro de Incidencias

Aplicación web full-stack desarrollada para el **Trabajo Final Integrador Universitario**, destinada a la **Municipalidad de Concordia (Entre Ríos, Argentina)**. Permite registrar, asignar, resolver y auditar incidencias técnicas sobre el parque informático y equipamiento de las distintas áreas municipales.

---

## 1. Arquitectura y Stack Tecnológico

El proyecto está organizado como un **monorepo desacoplado** en dos directorios principales (`/backend` y `/frontend`), utilizando **ECMAScript Modules (ESM)** nativo (`"type": "module"`) en todo el stack.

```text
gest-incid-V2/
├── backend/                        # API REST (Node.js + Express + PostgreSQL)
│   ├── database/
│   │   └── incidencias_db.sql      # Esquema relacional PostgreSQL y lote de datos iniciales
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # Pool de conexiones PostgreSQL (pg) y helper de transacciones ACID
│   │   ├── controllers/            # Capa de Presentación HTTP (recepción de req y respuesta JSON/Stream)
│   │   ├── services/               # Capa de Negocio pura (reglas de estado, permisos, PDF y correos)
│   │   ├── repositories/           # Capa de Persistencia (SQL parametrizado $1..$n, LIMIT/OFFSET, FOR UPDATE)
│   │   ├── middlewares/            # Autenticación JWT, autorización RBAC, validación y manejo global de errores
│   │   ├── validators/             # Reglas declarativas con express-validator
│   │   ├── routes/                 # Definición de rutas REST (/api/v1/*) y anotaciones OpenAPI 3.0
│   │   ├── utils/                  # Paginación segura, generador PDF (PDFKit), correo (Nodemailer) y Swagger
│   │   └── server.js               # Punto de entrada HTTP Express
│   ├── tests/                      # Suites de pruebas de integración automatizadas
│   ├── .env.example                # Plantilla de variables de entorno
│   └── package.json
├── frontend/                       # Cliente Web Multipágina (Vite 5 + Bootstrap 5 + Vanilla JS ESM)
│   ├── index.html                  # Portal de acceso (Login) y autogestión del Empleado Municipal
│   ├── sistemas.html               # Mesa de ayuda y resolución técnica del Empleado de Sistemas
│   ├── entidades.html              # Administración (BREAD) de Categorías y Artículos con baja lógica
│   ├── director.html               # Dashboard ejecutivo, asignación de técnicos y reportes PDF
│   ├── css/
│   │   └── styles.css              # Identidad visual institucional (Verde Concordia) e imports locales
│   ├── js/
│   │   ├── app.js                  # Lógica de sesión y portal del Empleado Municipal
│   │   ├── sistemas.js             # Lógica de atención técnica y cierre de incidencias
│   │   ├── entidades.js            # Lógica de catálogo de equipamiento y categorías
│   │   └── director.js             # Lógica de supervisión, asignaciones y descarga de reportes PDF
│   ├── vite.config.js              # Configuración de bundler multipágina y proxy de desarrollo (/api)
│   └── package.json
└── README.md
```

### Separación Estricta en 3 Capas (Backend)

1. **Controladores (`src/controllers/`)**: Reciben las solicitudes HTTP, extraen parámetros de `req.body`, `req.params` y `req.query`, y delegan el procesamiento al servicio correspondiente devolviendo códigos de estado HTTP semánticos (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`).
2. **Servicios (`src/services/`)**: Contienen exclusivamente las reglas de negocio (transiciones de estado permitidas, control de propiedad del recurso, validaciones de dominio, disparo de correos con Nodemailer y orquestación de reportes PDF con PDFKit). No contienen consultas SQL ni manipulación de conexiones.
3. **Repositorios (`src/repositories/`)**: Encapsulan el acceso a datos mediante consultas SQL parametrizadas (`$1, $2, ...`), bloqueo pesimista de filas (`SELECT ... FOR UPDATE`), trazabilidad histórica en `incidencias_estados`, bajas lógicas (`activo = 0`) y paginación en base de datos (`LIMIT` y `OFFSET`).

### Stack Principal

| Componente | Tecnología | Detalle de Implementación |
| :--- | :--- | :--- |
| **Entorno de Ejecución** | Node.js (ESM) | Módulos nativos `import` / `export` |
| **Framework Backend** | Express 4 | API RESTful versionada bajo `/api/v1` |
| **Motor de Base de Datos** | PostgreSQL 16+ | Conector `pg` (`Pool`) con soporte transaccional (`BEGIN` / `COMMIT` / `ROLLBACK`) |
| **Seguridad y Validación** | JWT + `express-validator` | Autenticación Bearer (`jsonwebtoken`), RBAC por rol y sanitización de entradas |
| **Reportes y Notificaciones** | PDFKit + Nodemailer | Streaming binario de reportes PDF institucionales y avisos automáticos por correo |
| **Documentación API** | Swagger (`swagger-ui-express`) | Especificación OpenAPI 3.0 interactiva en `/api-docs` y `/api/v1/docs` |
| **Frontend & Bundler** | Vite 5 + Vanilla JS | Empaquetado multipágina sin dependencias de CDN externas |
| **UI / UX Institucional** | Bootstrap 5.3 + Bootstrap Icons | Tipografía `@fontsource/inter`, selectores `tom-select`, modales y Toasts locales |

---

## 2. Roles y Módulos del Sistema

El control de acceso basado en roles (**RBAC**) distingue tres perfiles operativos dentro de la estructura municipal:

### 2.1. Empleado Municipal (`rol = 3`) — `index.html`
- **Exploración de Equipamiento**: Consulta interactiva del catálogo de artículos activos con búsqueda instantánea por descripción, categoría o área municipal.
- **Reporte de Incidencias**: Alta de tickets seleccionando el artículo afectado mediante buscador predictivo, nivel de prioridad (*Alta*, *Media*, *Baja*) y descripción del inconveniente. Toda nueva solicitud se registra en estado **Pendiente** (`id_estado = 1`) y sin técnico asignado (`asignado_a = NULL` / `0`).
- **Seguimiento y Cancelación**: Historial paginado de incidencias propias con indicadores visuales de estado y posibilidad de cancelar solicitudes propias mientras permanezcan en estado **Pendiente**.

### 2.2. Empleado de Sistemas (`rol = 2`) — `sistemas.html` y `entidades.html`
- **Mesa de Ayuda Técnica (`sistemas.html`)**: Bandeja de trabajo ordenada automáticamente por criticidad operativa (estado *Pendiente* -> *En Proceso* -> *Resuelta*, prioridad y antigüedad), con contadores en tiempo real y filtros rápidos por estado.
- **Inicio de Atención ("En Proceso")**: El técnico revisa las incidencias asignadas en estado *Pendiente* y las transiciona manualmente al estado **"En Proceso"** (`id_estado = 2`) cuando comienza efectivamente a repararlas o atenderlas. Una vez en este estado, la solicitud queda bloqueada contra cancelaciones.
- **Resolución y Notificación**: Concluida la reparación técnica de una incidencia *En Proceso*, la transiciona al estado **"Resuelta"** (`id_estado = 3`) ingresando obligatoriamente la solución técnica aplicada (`descripcion_resolucion`). Esta acción actualiza la trazabilidad en `incidencias_estados` y dispara de forma automática un correo electrónico institucional al empleado solicitante.
- **Gestión del Catálogo (`entidades.html`)**: Operaciones **BREAD** (*Browse, Read, Edit, Add, Delete*) sobre **Categorías** y **Artículos** con paginación y filtrado en base de datos. La eliminación implementa **baja lógica** (`activo = 0`) preservando la integridad referencial histórica de las incidencias registradas, con opción de reactivación (`activo = 1`).

### 2.3. Director de Sistemas (`rol = 1`) — `director.html`
- **Dashboard de Supervisión**: Resumen ejecutivo con métricas de incidencias por estado, evolución diaria por fecha y listado destacado de incidentes urgentes (*Prioridad Alta* pendientes o en curso).
- **Gestión y Asignación de Técnicos**: Vista general paginada de todas las incidencias de la Municipalidad. Permite asignar o reasignar técnicos activos del Área de Sistemas manteniendo el estado **"Pendiente"** (ya que el técnico aún no comenzó a trabajar en ella). Permite además la cancelación supervisada de cualquier solicitud que se encuentre en estado **Pendiente**.
- **Generación y Descarga de Reportes en PDF**: Panel de exportación oficial con filtros paramétricos por rango de fechas (`desde`, `hasta`), estado de incidencia y técnico responsable, generando documentos PDF vectoriales mediante streaming directo con PDFKit.

### Credenciales de Prueba (Incluidas en `incidencias_db.sql`)

| Rol | Nombre Completo | Usuario / Correo | Contraseña | Panel Asignado |
| :--- | :--- | :--- | :--- | :--- |
| **Director de Sistemas** (`1`) | Pamela Almeida | `pamalm@correo.com` | `pamalm` | `director.html` |
| **Empleado de Sistemas** (`2`) | Carlos Pérez | `carper@correo.com` | `carper` | `sistemas.html` / `entidades.html` |
| **Empleado de Sistemas** (`2`) | Carmen Gómez | `cargom@correo.com` | `cargom` | `sistemas.html` / `entidades.html` |
| **Empleado Municipal** (`3`) | Esteban Reniero | `estren@correo.com` | `estren` | `index.html` |

---

## 3. Ciclo de Vida y Máquina de Estados de una Incidencia

El sistema implementa una máquina de estados estricta y trazable con auditoría histórica en base de datos (`incidencias_estados`):

```text
  [Empleado Municipal]
     Reporta Incidencia
             │
             ▼
   ┌──────────────────┐           Cancela Solicitante
   │  1. PENDIENTE    │────────────────────────────────────────┐
   │ (Sin Asignar o   │           Cancela Director             │
   │ Técnico Asignado)│                                        │
   └──────────────────┘                                        │
             │                                                 │
             │  Técnico inicia atención                        │
             │  (PUT /:id/en-proceso o PATCH {id_estado: 2})   ▼
             ▼                                        ┌──────────────────┐
   ┌──────────────────┐                               │   4. CANCELADA   │
   │  2. EN PROCESO   │                               │  (Baja lógica de │
   │ (Bloqueada contra│                               │    la solicitud) │
   │   cancelaciones) │                               └──────────────────┘
   └──────────────────┘
             │
             │  Técnico finaliza con solución técnica obligatoria
             │  (PUT /:id/finalizar o PATCH {id_estado: 3, descripcion_resolucion})
             ▼
   ┌──────────────────┐
   │   3. RESUELTA    │ ───► Disparo automático de correo institucional (Nodemailer)
   │  (Finalizada con │      al Empleado Municipal solicitante
   │  solución técnica│
   │   documentada)   │
   └──────────────────┘
```

### Reglas de Negocio del Flujo de Estados

1. **Pendiente (`id_estado = 1`)**:
   - Toda nueva incidencia reportada por un Empleado Municipal nace en estado **Pendiente** y sin técnico asignado (`asignado_a = NULL` / `0`).
   - Cuando el **Director de Sistemas** le asigna la incidencia a un técnico del Área de Sistemas, la incidencia **permanece en estado "Pendiente"** (dado que el técnico asignado aún no comenzó formalmente a trabajar en ella).
   - Mientras la incidencia se encuentre en estado **"Pendiente"**, tanto el **empleado solicitante** (únicamente sobre sus incidencias propias) como el **Director de Sistemas** (sobre cualquier incidencia) tienen potestad para cancelarla.
2. **En Proceso (`id_estado = 2`)**:
   - El **Empleado de Sistemas (Técnico)** visualiza en su panel las incidencias asignadas en estado *Pendiente* y las pasa manualmente al estado **"En Proceso"** mediante la acción correspondiente (`PUT /api/v1/incidencias/:id/en-proceso` o `PATCH /api/v1/incidencias/:id` con `{ id_estado: 2 }`) en el momento en que inicia efectivamente su labor de reparación o atención.
   - Una vez en estado **"En Proceso"**, la incidencia **ya no puede ser cancelada** bajo ninguna circunstancia, resguardando la trazabilidad del trabajo técnico en desarrollo.
3. **Resuelta / Finalizada (`id_estado = 3`)**:
   - Cuando el técnico concluye la reparación de una incidencia que estaba en estado **"En Proceso"**, la transiciona a estado **"Resuelta"** (`PUT /api/v1/incidencias/:id/finalizar` o `PATCH /api/v1/incidencias/:id` con `{ id_estado: 3, descripcion_resolucion }`), siendo obligatorio ingresar la descripción de la solución técnica aplicada (`descripcion_resolucion`).
   - Esta acción dispara automáticamente la **notificación por correo electrónico** al empleado solicitante a través de Nodemailer, informando la resolución técnica y fecha de cierre.
   - Una incidencia resuelta no puede ser reabierta, re-finalizada ni cancelada.
4. **Cancelada (`id_estado = 4`)**:
   - Baja lógica de la solicitud (aplicable **únicamente** cuando la incidencia se encontraba en estado **"Pendiente"**). Registra el cambio en el historial de estados y genera una notificación por correo electrónico de aviso de cancelación.

---

## 4. Instalación y Puesta en Marcha

### Requisitos Previos
- **Node.js** v18.0.0 o superior.
- **PostgreSQL** v14 o superior en ejecución.

### Paso 1: Crear e Inicializar la Base de Datos PostgreSQL

Crear la base de datos `incidencias_db` e importar el esquema y los datos semilla desde `backend/database/incidencias_db.sql`:

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE incidencias_db;"

# Ejecutar el script de estructura y datos iniciales
psql -U postgres -d incidencias_db -f backend/database/incidencias_db.sql
```

### Paso 2: Configurar Variables de Entorno del Backend

Editá directamente el archivo `backend/.env.example` y configurá las variables de conexión con tus credenciales locales de PostgreSQL (`DB_USER`, `DB_PASSWORD`, `DB_NAME`, etc.).

Contenido de referencia de `backend/.env`:

```env
# Configuración del Servidor HTTP
PORT=3000

# Configuración de Base de Datos PostgreSQL
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=tu_contraseña_aqui
PGDATABASE=incidencias_db

# Clave Secreta para Tokens JWT
JWT_SECRET=secreto_concordia_jwt_2026

# Configuración de Servidor de Correos (Nodemailer)
# Si no se configuran credenciales reales, opera en modo stream seguro sin bloquear las operaciones
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_password_de_aplicacion
EMAIL_FROM="Municipalidad de Concordia - Incidencias" <notificaciones@concordia.gob.ar>
```

### Paso 3: Instalar Dependencias e Iniciar el Backend

```bash
cd backend
npm install

# Iniciar en modo desarrollo con recarga automática (puerto 3000)
npm run dev

# O iniciar en modo producción
npm start
```

### Paso 4: Instalar Dependencias e Iniciar el Frontend (Vite)

En una segunda terminal, situarse en el directorio `frontend`:

```bash
cd frontend
npm install

# Iniciar servidor de desarrollo Vite con Hot Module Replacement (puerto 5173)
npm run dev
```

- **Acceso en Desarrollo (Vite con proxy a `/api`)**: `http://localhost:5173`
- **Compilación para Producción (servida por Express en `:3000`)**:
  ```bash
  cd frontend
  npm run build
  ```
  Una vez generado `frontend/dist`, el servidor Express en `http://localhost:3000` sirve tanto la aplicación web compilada como la API REST `/api/v1`.

### Paso 5: Ejecución de Pruebas de Integración

El backend incluye suites de pruebas automatizadas que verifican autenticación, RBAC, ciclo de vida de incidencias, notificaciones por correo, BREAD con bajas lógicas, paginación `LIMIT/OFFSET` y generación binaria de PDF:

```bash
cd backend
npm test
```

---

## 5. Contrato de API REST y Documentación Interactiva

### Documentación Swagger (OpenAPI 3.0)
Con el servidor backend en ejecución, la documentación interactiva para probar todos los endpoints se encuentra disponible en:
- **`http://localhost:3000/api-docs`** (también accesible en `http://localhost:3000/api/v1/docs`).

### Estándar de Paginación y Ordenamiento en Base de Datos
Todos los listados de colecciones aplican paginación a nivel SQL (`LIMIT` y `OFFSET`) y devuelven la siguiente estructura uniforme:

```json
{
  "data": [ ... ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

### Resumen de Endpoints (`/api/v1`)

| Recurso | Método | Endpoint | Roles Autorizados | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **Salud** | `GET` | `/api/v1/health` | Público | Comprobación de estado operativo del servidor |
| **Autenticación** | `POST` | `/api/v1/auth/login` | Público | Autentica credenciales y emite token Bearer JWT (8 h) |
| **Autenticación** | `GET` | `/api/v1/auth/me` | Autenticado (`1, 2, 3`) | Devuelve los datos del usuario asociado al token |
| **Autenticación** | `POST` | `/api/v1/auth/avatar` | Autenticado (`1, 2, 3`) | Actualiza la imagen de perfil (`multipart/form-data`, máx. 2 MB) |
| **Incidencias** | `GET` | `/api/v1/incidencias` | `1, 2, 3` | Lista incidencias paginadas según el rol (`page`, `limit`, `order_by`, `order_dir`, `id_estado`, `prioridad`, `buscar`) |
| **Incidencias** | `POST` | `/api/v1/incidencias` | Municipal (`3`) | Registra una nueva incidencia en estado *Pendiente* sin técnico asignado (`asignado_a = NULL`) |
| **Incidencias** | `PUT` | `/api/v1/incidencias/:id/en-proceso` | Sistemas (`2`), Director (`1`) | Pasa la incidencia de *Pendiente* (`1`) a *En Proceso* (`2`) al iniciar atención técnica |
| **Incidencias** | `PUT` | `/api/v1/incidencias/:id/finalizar` | Sistemas (`2`), Director (`1`) | Finaliza la incidencia en estado *Resuelta* (`3`), registra la solución técnica y envía email |
| **Incidencias** | `PATCH` | `/api/v1/incidencias/:id` | `1, 2, 3` (según acción) | Endpoint unificado: asigna técnico (`{ asignado_a }`), inicia atención (`{ id_estado: 2 }`), finaliza (`{ id_estado: 3, descripcion_resolucion }`) o cancela (`{ id_estado: 4 }`, solo en estado *Pendiente*) |
| **Artículos** | `GET` | `/api/v1/articulos` | `2, 3` | **[Browse]** Lista artículos paginados con categoría y área (`incluir_inactivos`, `id_categoria`, `id_area`, `buscar`) |
| **Artículos** | `GET` | `/api/v1/articulos/:id` | `2, 3` | **[Read]** Obtiene el detalle de un artículo por su identificador |
| **Artículos** | `POST` | `/api/v1/articulos` | Sistemas (`2`) | **[Add]** Registra un nuevo artículo activo (`activo = 1`) |
| **Artículos** | `PUT` / `PATCH` | `/api/v1/articulos/:id` | Sistemas (`2`) | **[Edit]** Actualiza datos o reactiva un artículo (`activo = 1`) |
| **Artículos** | `DELETE` | `/api/v1/articulos/:id` | Sistemas (`2`) | **[Delete]** Ejecuta la baja lógica del artículo (`activo = 0`) |
| **Categorías** | `GET` | `/api/v1/categorias` | Sistemas (`2`) | **[Browse]** Lista categorías paginadas (`incluir_inactivos`, `buscar`) |
| **Categorías** | `GET` | `/api/v1/categorias/:id` | Sistemas (`2`) | **[Read]** Obtiene el detalle de una categoría por su identificador |
| **Categorías** | `POST` | `/api/v1/categorias` | Sistemas (`2`) | **[Add]** Crea una nueva categoría activa (`activo = 1`) |
| **Categorías** | `PUT` / `PATCH` | `/api/v1/categorias/:id` | Sistemas (`2`) | **[Edit]** Modifica la descripción o reactiva una categoría (`activo = 1`) |
| **Categorías** | `DELETE` | `/api/v1/categorias/:id` | Sistemas (`2`) | **[Delete]** Ejecuta la baja lógica de la categoría (`activo = 0`) |
| **Áreas** | `GET` | `/api/v1/areas` | Público / Autenticado | Lista las áreas municipales activas con paginación y búsqueda |
| **Usuarios** | `GET` | `/api/v1/usuarios?rol=2` | Director (`1`) | Lista el personal técnico activo del Área de Sistemas para asignación |
| **Director** | `GET` | `/api/v1/dashboard` | Director (`1`) | Resumen de métricas por estado, evolución por fecha e incidencias urgentes |
| **Director** | `GET` | `/api/v1/director/reportes/pdf` | Director (`1`) | Genera y transmite por stream el reporte oficial en PDF con filtros (`desde`, `hasta`, `id_estado`, `asignado_a`). Alias: `/api/v1/reportes/pdf` |

---
