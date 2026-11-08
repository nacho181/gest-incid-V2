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
- **Reporte de Incidencias**: Alta de tickets seleccionando el artículo afectado mediante buscador predictivo, nivel de prioridad (*Alta*, *Media*, *Baja*) y descripción del inconveniente. Toda nueva solicitud se registra en estado **Pendiente** (`id_estado = 1`) y asignada al usuario comodín *Sin Asignar* (`asignado_a = 0`).
- **Seguimiento y Cancelación**: Historial paginado de incidencias propias con indicadores visuales de estado y posibilidad de cancelar solicitudes que aún permanezcan en estado *Pendiente*.

### 2.2. Empleado de Sistemas (`rol = 2`) — `sistemas.html` y `entidades.html`
- **Mesa de Ayuda Técnica (`sistemas.html`)**: Bandeja de trabajo ordenada automáticamente por criticidad operativa (estado *Pendiente* -> *En Proceso* -> *Resuelta*, prioridad y antigüedad), con contadores en tiempo real y filtros rápidos por estado.
- **Resolución y Notificación**: Cierre técnico de incidencias asignadas registrando la solución aplicada (`descripcion_resolucion`), actualizando la trazabilidad en `incidencias_estados` y enviando automáticamente un correo electrónico institucional al empleado solicitante.
- **Gestión del Catálogo (`entidades.html`)**: Operaciones **BREAD** (*Browse, Read, Edit, Add, Delete*) sobre **Categorías** y **Artículos** con paginación y filtrado en base de datos. La eliminación implementa **baja lógica** (`activo = 0`) preservando la integridad referencial histórica de las incidencias registradas, con opción de reactivación (`activo = 1`).

### 2.3. Director de Sistemas (`rol = 1`) — `director.html`
- **Dashboard de Supervisión**: Resumen ejecutivo con distribución de incidencias por estado, volumen diario por fecha y listado destacado de incidentes urgentes (*Prioridad Alta* pendientes o en curso).
- **Gestión y Asignación de Técnicos**: Vista general paginada de todas las incidencias del municipio, asignación o reasignación de técnicos activos del Área de Sistemas (transicionando automáticamente el ticket a *En Proceso*) y cancelación supervisada de solicitudes pendientes.
- **Exportación de Reportes en PDF**: Generación y descarga directa de informes oficiales en formato PDF combinando filtros por rango de fechas (`desde`, `hasta`), estado y técnico responsable.

### Credenciales de Prueba (Incluidas en `incidencias_db.sql`)

| Rol | Nombre Completo | Usuario / Correo | Contraseña | Panel Asignado |
| :--- | :--- | :--- | :--- | :--- |
| **Director de Sistemas** (`1`) | Pamela Almeida | `pamalm@correo.com` | `pamalm` | `director.html` |
| **Empleado de Sistemas** (`2`) | Carlos Pérez | `carper@correo.com` | `carper` | `sistemas.html` / `entidades.html` |
| **Empleado de Sistemas** (`2`) | Carmen Gómez | `cargom@correo.com` | `cargom` | `sistemas.html` / `entidades.html` |
| **Empleado Municipal** (`3`) | Esteban Reniero | `estren@correo.com` | `estren` | `index.html` |

---

## 3. Instalación y Puesta en Marcha

### Requisitos Previos
- **Node.js** v18.0.0 o superior.
- **PostgreSQL** v14 o superior en ejecución.

### Paso 1: Crear e Inicializar la Base de Datos PostgreSQL

Crear la base de datos `incidencias_concordia` e importar el esquema y los datos semilla desde `backend/database/incidencias_db.sql`:

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE incidencias_concordia;"

# Ejecutar el script de estructura y datos iniciales
psql -U postgres -d incidencias_concordia -f backend/database/incidencias_db.sql
```

### Paso 2: Configurar Variables de Entorno del Backend

Copiar el archivo de ejemplo `backend/.env.example` hacia `backend/.env` y ajustar las credenciales de conexión a PostgreSQL:

```bash
cd backend
cp .env.example .env
```

Contenido de referencia de `backend/.env`:

```env
# Configuración del Servidor HTTP
PORT=3000

# Configuración de Base de Datos PostgreSQL
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=tu_contraseña_aqui
PGDATABASE=incidencias_concordia

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

## 4. Contrato de API REST y Documentación Interactiva

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
| **Incidencias** | `POST` | `/api/v1/incidencias` | Municipal (`3`) | Registra una nueva incidencia en estado *Pendiente* con trazabilidad inicial |
| **Incidencias** | `PATCH` | `/api/v1/incidencias/:id` | `1, 2, 3` (según acción) | Asigna técnico (`{ asignado_a }`), finaliza (`{ id_estado: 3, descripcion_resolucion }`) o cancela (`{ id_estado: 4 }`) |
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
| **Usuarios** | `GET` | `/api/v1/usuarios?rol=2` | Director (`1`) | Lista el personal técnico activo del Área de Sistemas |
| **Director** | `GET` | `/api/v1/dashboard` | Director (`1`) | Resumen de métricas por estado, evolución por fecha e incidencias urgentes |
| **Director** | `GET` | `/api/v1/reportes` | Director (`1`) | Estadísticas agregadas de incidencias por área y categoría |
| **Director** | `GET` | `/api/v1/reportes/pdf` | Director (`1`) | Genera y transmite por stream el reporte oficial en PDF (`desde`, `hasta`, `id_estado`, `asignado_a`) |

---

## 5. Créditos Institucionales

- **Proyecto**: Sistema Integral de Registro de Incidencias — Intranet Municipal
- **Institución**: Municipalidad de Concordia (Entre Ríos, Argentina) — Dirección de Sistemas
- **Contexto Académico**: Trabajo Final Integrador Universitario
