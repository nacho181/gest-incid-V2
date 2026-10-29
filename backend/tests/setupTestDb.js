/**
 * ============================================================================
 * TEST HELPER: DB SETUP PARA PRUEBAS INTEGRADAS EN SANDBOX
 * Inicializa pg-mem si no hay servidor PostgreSQL activo en el puerto local.
 * ============================================================================
 */

const db = require('../src/config/db');
const { newDb, DataType } = require('pg-mem');

let initialized = false;

async function setupTestDb() {
  if (initialized) return;
  initialized = true;

  try {
    // Intentar conectar a PostgreSQL real
    await db.query('SELECT 1');
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message.includes('connect ECONNREFUSED')) {
      console.log('[TEST SETUP] Servidor PostgreSQL no detectado. Inicializando base de datos en memoria para pruebas...');
      const dbMem = newDb();

      dbMem.public.registerFunction({
        name: 'to_char',
        args: [DataType.timestamp, DataType.text],
        returns: DataType.text,
        implementation: (ts, fmt) => ts ? new Date(ts).toISOString().slice(0, 10) : ''
      });
      dbMem.public.registerFunction({
        name: 'to_char',
        args: [DataType.timestamptz, DataType.text],
        returns: DataType.text,
        implementation: (ts, fmt) => ts ? new Date(ts).toISOString().slice(0, 10) : ''
      });

      dbMem.public.none(`
        CREATE SEQUENCE IF NOT EXISTS public.areas_id_area_seq START WITH 10;
        CREATE SEQUENCE IF NOT EXISTS public.articulos_id_articulo_seq START WITH 10;
        CREATE SEQUENCE IF NOT EXISTS public.categorias_id_categoria_seq START WITH 20;
        CREATE SEQUENCE IF NOT EXISTS public.estados_id_estado_seq START WITH 10;
        CREATE SEQUENCE IF NOT EXISTS public.incidencias_id_incidencia_seq START WITH 10;
        CREATE SEQUENCE IF NOT EXISTS public.usuarios_id_usuario_seq START WITH 10;

        CREATE TABLE IF NOT EXISTS public.areas (
            id_area INTEGER PRIMARY KEY DEFAULT nextval('public.areas_id_area_seq'),
            descripcion VARCHAR(250) NOT NULL,
            activo SMALLINT DEFAULT 1 NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.articulos (
            id_articulo INTEGER PRIMARY KEY DEFAULT nextval('public.articulos_id_articulo_seq'),
            id_area INTEGER NOT NULL,
            id_categoria INTEGER NOT NULL,
            descripcion VARCHAR(250) NOT NULL,
            activo SMALLINT DEFAULT 1 NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.categorias (
            id_categoria INTEGER PRIMARY KEY DEFAULT nextval('public.categorias_id_categoria_seq'),
            descripcion VARCHAR(255) NOT NULL,
            activo SMALLINT DEFAULT 1 NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.estados (
            id_estado INTEGER PRIMARY KEY DEFAULT nextval('public.estados_id_estado_seq'),
            descripcion VARCHAR(255) NOT NULL,
            activo SMALLINT DEFAULT 1 NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.incidencias (
            id_incidencia INTEGER PRIMARY KEY DEFAULT nextval('public.incidencias_id_incidencia_seq'),
            id_articulo INTEGER NOT NULL,
            id_estado INTEGER NOT NULL,
            creado_por INTEGER NOT NULL,
            asignado_a INTEGER NOT NULL,
            creado TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            prioridad INTEGER DEFAULT 1 NOT NULL,
            descripcion_pedido VARCHAR(250),
            descripcion_resolucion VARCHAR(250)
        );
        CREATE TABLE IF NOT EXISTS public.incidencias_estados (
            id_pedidos_estados SERIAL PRIMARY KEY,
            id_incidencia INTEGER NOT NULL,
            id_estado INTEGER NOT NULL,
            fecha_hora_estado TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.usuarios (
            id_usuario INTEGER PRIMARY KEY DEFAULT nextval('public.usuarios_id_usuario_seq'),
            id_area INTEGER NOT NULL,
            nombres VARCHAR(250) NOT NULL,
            apellidos VARCHAR(250) NOT NULL,
            usuario VARCHAR(255) UNIQUE NOT NULL,
            contrasenia VARCHAR(255) NOT NULL,
            avatar VARCHAR(255) NOT NULL,
            rol INTEGER NOT NULL,
            activo SMALLINT DEFAULT 1 NOT NULL
        );

        INSERT INTO public.areas (id_area, descripcion, activo) VALUES
        (1, 'Legales', 1), (2, 'Personal', 1), (3, 'Sistemas', 1), (4, 'Hacienda', 1), (5, 'Finanzas', 1), (6, 'Salud y Accion Social', 1), (7, 'Desarrollo Urbano', 0);

        INSERT INTO public.articulos (id_articulo, id_area, id_categoria, descripcion, activo) VALUES
        (1, 1, 1, 'Mouse sin pilas', 1), (2, 1, 1, 'Monitor LG', 1), (3, 1, 1, 'Notebook HP', 1);

        INSERT INTO public.categorias (id_categoria, descripcion, activo) VALUES
        (1, 'Perifericos', 1), (2, 'Notebooks', 1), (3, 'PC Escritorio', 1), (4, 'CPU', 1), (5, 'Almacenamiento', 1), (6, 'Equipos de Red', 1);

        INSERT INTO public.estados (id_estado, descripcion, activo) VALUES
        (1, 'Pendiente', 1), (2, 'En Proceso', 1), (3, 'Resuela', 1), (4, 'Cancelada', 1);

        INSERT INTO public.usuarios (id_usuario, id_area, nombres, apellidos, usuario, contrasenia, avatar, rol, activo) VALUES
        (1, 3, 'Carlos', 'Perez', 'carper@correo.com', 'fcaddfce9c7c894c376cf085b51ee37b851e89477a2986d2a26b8cc1f484eaf8', '', 2, 1),
        (2, 3, 'Carmen', 'Gomez', 'cargom@correo.com', 'be4288567c04f9b827ff17cad92f29fc8ab6667bf235e7ebba558588e2606ee2', '', 2, 1),
        (3, 3, 'Pamela', 'Almeida', 'pamalm@correo.com', 'be39221afb177a35f41e3dc590cc630ed8e58773dbb11a29d7a332b9e1eeaad1', '', 1, 1),
        (4, 1, 'Esteban', 'Reniero', 'estren@correo.com', '31c1a3f84de963879b6e6b88e08297fcdeb419133989acf5e91cf5b75db1923f', '', 3, 1);

        INSERT INTO public.incidencias (id_incidencia, id_articulo, id_estado, creado_por, asignado_a, prioridad, descripcion_pedido, descripcion_resolucion) VALUES
        (1, 1, 1, 4, 1, 1, 'descripción pedido', ''),
        (2, 1, 1, 4, 2, 1, 'descripción pedido', ''),
        (3, 2, 1, 4, 1, 1, 'No enciende', ''),
        (4, 3, 1, 4, 2, 1, 'No carga la batería', '');
      `);

      const adapter = dbMem.adapters.createPg();
      const memPool = new adapter.Pool();

      db.query = (text, params) => memPool.query(text, params);
      db.pool = memPool;
    } else {
      throw err;
    }
  }
}

module.exports = setupTestDb;
