# 🏛️ Municipalidad de Concordia — Sistema de Registro de Incidencias

Este repositorio contiene la solución para el **Trabajo Final Integrador de Programación**, desarrollado específicamente para la **Municipalidad de Concordia (Entre Ríos, Argentina)**.

El proyecto consiste en una aplicación web integral disponible en la intranet del municipio que permite gestionar, reportar y hacer seguimiento de incidencias técnicas en el equipamiento informático e infraestructura de la institución.

---

## 📋 1. Descripción General del Sistema

El sistema fue diseñado bajo una arquitectura cliente-servidor (**API REST**) dividida en capas, utilizando **Bootstrap 5** para una interfaz moderna, limpia y altamente responsiva, personalizada con la paleta de colores institucional verde de la Municipalidad.

### 🎭 Roles y Módulos del Sistema
1. **Empleados Municipales (Módulo Implementado):**
   - **Listar artículos/equipos:** Ver la lista de equipamientos activos por área y categoría en tarjetas interactivas de Bootstrap.
   - **Reportar una incidencia:** Crear un nuevo ticket de fallas para un artículo específico mediante un formulario estilizado en Bootstrap.
   - **Listar incidencias propias:** Consultar el historial de incidencias creadas por el empleado en una tabla interactiva con badges de estado en tiempo real (Pendiente, En Proceso, Finalizada, Cancelada).
   - **Cancelar incidencia propia:** Permitido únicamente para incidencias que se encuentren en estado *"Pendiente"*.

2. **Empleado de Sistemas (Módulo Implementado):**
   - **Listar incidencias asignadas:** Consultar en tiempo real los tickets técnicos asignados a su cargo filtrados por estado y prioridad en tarjetas interactivas y tablas de Bootstrap.
   - **Finalizar incidencias:** Finalizar incidencias asignadas registrando obligatoriamente la descripción detallada de la solución técnica aplicada (actualizando el estado a *Resuelta/Finalizada* y su trazabilidad).
   - **Notificaciones por Correo Electrónico:** Envío automático de correo electrónico al empleado solicitante al finalizar la incidencia (con la resolución técnica) o al cancelarse la misma.

3. **Director de Sistemas (Módulo Implementado):**
   - Dashboard con indicadores y estadísticas por estado, fecha y prioridad.
   - Asignar incidencias a los empleados del área de Sistemas.
   - Cancelar incidencias y generar reportes estadísticos en PDF.

---

## 🏗️ 2. Estructura del Código y Archivos Clave

```text
├── database/
│   └── incidencias_db.sql   # Dump de PostgreSQL con la estructura de tablas y datos iniciales de la Municipalidad de Concordia
├── public/                  # FRONTEND (Cliente Web)
│   ├── index.html           # Interfaz para empleados municipales y login de acceso
│   ├── director.html        # Panel de supervisión del Director de Sistemas
│   ├── sistemas.html        # Panel del Empleado de Sistemas (Incidencias asignadas y resolución)
│   ├── css/styles.css       # Estilos y personalización de la paleta verde institucional
│   └── js/
│       ├── app.js           # Lógica cliente y navegación de empleados municipales
│       ├── director.js      # Lógica del dashboard de Director
│       └── sistemas.js      # Lógica de incidencias asignadas, finalización y modal
├── src/                     # BACKEND (Servidor Node.js + Express)
│   ├── config/
│   │   └── db.js            # Conexión a la base de datos PostgreSQL mediante el módulo 'pg'
│   ├── controllers/
│   │   ├── authController.js     # Autenticación, JWT y hashing SHA-256
│   │   ├── directorController.js # Lógica de métricas y asignaciones
│   │   ├── empleadoController.js # Incidencias y artículos municipales
│   │   └── sistemasController.js # Incidencias asignadas y finalización
│   ├── middlewares/
│   │   └── authMiddleware.js     # Validación de JWT y control de acceso (RBAC)
│   ├── routes/
│   │   ├── authRoutes.js         # Rutas de autenticación (/api/v1/auth)
│   │   ├── directorRoutes.js     # Rutas de Director (/api/v1/director)
│   │   ├── empleadoRoutes.js     # Rutas de Empleados (/api/v1)
│   │   └── sistemasRoutes.js     # Rutas de Empleado de Sistemas (/api/v1/sistemas)
│   ├── services/
│   │   └── emailService.js       # Servicio Nodemailer para envío de correos
│   └── server.js            # Archivo PRINCIPAL del servidor Express
├── tests/
│   ├── empleado.test.js               # Pruebas integradas del módulo Empleados
│   └── sistemas_notificaciones.test.js # Pruebas integradas de Sistemas y Correos
├── .env                     # Archivo de configuración de variables de entorno
├── .env.example             # Ejemplo de variables de entorno (incluye SMTP)
├── package.json             # Dependencias del proyecto
└── README.md                # Instrucciones del proyecto
```

---

## 🛢️ 3. Cómo Conectar la Base de Datos PostgreSQL con el Código

La conexión entre el servidor Node.js/Express y PostgreSQL se realiza mediante el cliente nativo de Node `pg` (`Pool`).

### Paso A: Crear la Base de Datos en PostgreSQL
Abre tu consola de PostgreSQL (`psql` o PgAdmin) y crea la base de datos:
```sql
CREATE DATABASE incidencias_concordia;
```

### Paso B: Ejecutar el Dump de Base de Datos
Ejecuta el archivo `incidencias_db.sql` contenido en la carpeta `database/` para crear las tablas e insertar los datos iniciales de prueba:

```bash
psql -U postgres -d incidencias_concordia -f database/incidencias_db.sql
```

### Paso C: Configurar las Credenciales en el Código (`.env`)
El código lee las credenciales del archivo `.env` mediante la librería `dotenv` en el archivo `src/config/db.js`.

Crea un archivo llamado `.env` en la raíz del proyecto (o edita el existente) con tus credenciales locales de PostgreSQL:

```env
PORT=3000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=tu_contraseña_aqui
PGDATABASE=incidencias_concordia
```

> 💡 **Nota de Resiliencia:** Si la base de datos PostgreSQL no se encuentra ejecutándose al momento de iniciar el servidor, el sistema activará automáticamente un **modo de simulación en memoria** con los mismos datos iniciales, permitiendo probar la interfaz y los endpoints sin bloquear la ejecución.

---

## 🚀 4. Qué Archivos Ejecutar y Cómo Iniciar el Sistema

### 1. Instalación de Dependencias
Abre una terminal en la carpeta raíz del proyecto y ejecuta:
```bash
npm install
```

### 2. Archivo a Ejecutar para Iniciar el Servidor
El archivo principal de la aplicación es **`src/server.js`**. Puedes ejecutarlo de cualquiera de las siguientes formas:

- **Opción Estándar:**
  ```bash
  npm start
  ```
  *(Internamente ejecuta `node src/server.js`)*

- **Opción Modo Desarrollo (Recarga Automática):**
  ```bash
  npm run dev
  ```

En la consola verás un mensaje indicando que el servidor está activo:
```text
Servidor corriendo en el puerto 3000
Accede a la interfaz web en http://localhost:3000
```

### 3. Abrir la Aplicación Web en el Navegador
Una vez iniciado el servidor, abre tu navegador (Chrome, Firefox, Edge, etc.) e ingresa a:
👉 **`http://localhost:3000`**

### 4. Ejecución de Pruebas Automáticas (Opcional)
Para verificar que todos los endpoints de la API funcionen correctamente, ejecuta en la terminal:
```bash
# Ejecutar suite completa (Empleados, Sistemas, Entidades Base):
npm test

# O ejecutar específicamente la suite de BREAD de Categorías y Artículos con Soft Deletes:
npm run test:entidades
```

---

## 📖 5. Guía de Uso del Panel de Empleados Municipales

Una vez cargada la página web en `http://localhost:3000`:

1. **Selector de Empleado (Simulación de Sesión):**
   En la esquina superior derecha del encabezado en Bootstrap, verás un desplegable con el **"Empleado activo"** (ej: *María González*, *Juan Pérez*). Puedes cambiar de empleado para ver cómo cambian automáticamente sus incidencias asignadas.

2. **Sección "Mis Incidencias":**
   - Muestra la tabla en Bootstrap con las incidencias reportadas por el empleado activo.
   - Cada fila incluye la fecha, artículo, descripción, etiqueta de prioridad (Alta, Media, Baja) y estado (Pendiente, Cancelada, etc.).
   - Si una incidencia tiene el estado **"Pendiente"**, aparecerá el botón rojo **"Cancelar"**. Al presionar este botón, el estado cambiará inmediatamente a "Cancelada".

3. **Sección "Reportar Nueva Incidencia":**
   - Haz clic en la pestaña *"Reportar Nueva Incidencia"*.
   - Selecciona el artículo o equipo que presenta la falla.
   - Selecciona el nivel de prioridad.
   - Escribe una descripción detallada del problema y presiona **"Enviar Incidencia"**.
   - El sistema registrará el ticket en estado "Pendiente" y te redirigirá a la tabla de mis incidencias notificando con un Toast de Bootstrap.

4. **Sección "Catálogo de Artículos":**
   - Muestra un Grid responsivo de Bootstrap con tarjetas para los equipos registrados por categoría y área.
   - Puedes usar el campo de búsqueda en tiempo real.
   - Cada artículo cuenta con un botón *"Reportar Falla"* que te lleva directamente al formulario con ese artículo preseleccionado.

---

## 🛰️ 6. Resumen de Endpoints de la API REST

| Método | Endpoint | Parámetros / Body | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | `{ usuario, contrasenia }` | Inicio de sesión con SHA-256 y retorno de token JWT |
| `GET` | `/api/v1/auth/me` | Header `Authorization: Bearer <token>` | Obtiene los datos del usuario autenticado |
| `GET` | `/api/v1/usuarios/empleados` | Ninguno | Devuelve la lista de empleados municipales activos |
| `GET` | `/api/v1/categorias` | `?incluir_inactivos=true&buscar=...` | **[BREAD - Categorías]** Browse: Lista categorías (activas por defecto) |
| `GET` | `/api/v1/categorias/:id` | Ninguno | **[BREAD - Categorías]** Read: Detalle de categoría por ID |
| `POST` | `/api/v1/categorias` | `{ descripcion }` | **[BREAD - Categorías]** Add: Crea nueva categoría activa (`activo = 1`) |
| `PUT` | `/api/v1/categorias/:id` | `{ descripcion, activo }` | **[BREAD - Categorías]** Edit: Actualiza categoría existente |
| `DELETE` | `/api/v1/categorias/:id`| Ninguno | **[BREAD - Categorías]** Delete: **Soft Delete** (baja lógica `activo = 0`, sin borrado físico) |
| `PUT` | `/api/v1/categorias/:id/reactivar` | Ninguno | Reactiva una categoría en baja lógica (`activo = 1`) |
| `GET` | `/api/v1/articulos` | `?incluir_inactivos=true&id_categoria=..&id_area=..` | **[BREAD - Artículos]** Browse: Lista artículos con categoría y área |
| `GET` | `/api/v1/articulos/:id` | Ninguno | **[BREAD - Artículos]** Read: Detalle de artículo por ID con relaciones |
| `POST` | `/api/v1/articulos` | `{ descripcion, id_categoria, id_area }` | **[BREAD - Artículos]** Add: Crea nuevo artículo activo (`activo = 1`) |
| `PUT` | `/api/v1/articulos/:id` | `{ descripcion, id_categoria, id_area, activo }` | **[BREAD - Artículos]** Edit: Actualiza artículo existente |
| `DELETE` | `/api/v1/articulos/:id` | Ninguno | **[BREAD - Artículos]** Delete: **Soft Delete** (baja lógica `activo = 0`, sin borrado físico) |
| `PUT` | `/api/v1/articulos/:id/reactivar` | Ninguno | Reactiva un artículo en baja lógica (`activo = 1`) |
| `GET` | `/api/v1/areas` | Ninguno | Devuelve las áreas municipales activas |
| `GET` | `/api/v1/incidencias/mis-incidencias` | `?id_usuario=1` | Devuelve las incidencias creadas por el empleado |
| `POST` | `/api/v1/incidencias` | `{ id_articulo, creado_por, prioridad, descripcion_pedido }` | Crea una nueva incidencia técnica |
| `PUT` | `/api/v1/incidencias/:id/cancelar` | `{ id_usuario }` | Cancela incidencia propia en Pendiente y notifica por email |
| `GET` | `/api/v1/sistemas/incidencias` | JWT (Rol 2 o 3) | Lista incidencias asignadas al empleado de Sistemas (Int. 4) |
| `PUT` | `/api/v1/sistemas/incidencias/:id/finalizar` | `{ descripcion_resolucion }` | Finaliza la incidencia y envía notificación por correo (Int. 4) |
| `GET` | `/api/v1/director/dashboard` | JWT (Rol 3) | Resumen del dashboard de dirección |
| `GET` | `/api/v1/director/empleados-sistemas`| JWT (Rol 3) | Lista empleados del área de Sistemas |
| `GET` | `/api/v1/director/incidencias` | JWT (Rol 3) | Todas las incidencias del municipio |
| `PUT` | `/api/v1/director/incidencias/:id/asignar` | `{ asignado_a }` | Asigna incidencia a técnico de Sistemas |
| `PUT` | `/api/v1/director/incidencias/:id/cancelar`| Ninguno | Cancela incidencia y notifica por email |
| `GET` | `/api/v1/director/reportes` | JWT (Rol 3) | Métricas para reporte PDF |
| `GET` | `/api/v1/health` | Ninguno | Estado de salud del servidor y la API |

---

## 👥 Datos para la Entrega Académica
- **Trabajo Final Integrador — Programación**
- **Institución:** Municipalidad de Concordia - Entre Ríos.
