/**
 * ============================================================================
 * CONFIGURACIÓN DE CONEXIÓN A POSTGRESQL
 * Conexión mediante el cliente 'pg' de Node.js utilizando Pool de conexiones.
 * ============================================================================
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuración del pool con variables de entorno o valores por defecto
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'incidencias_concordia',
});

// Evento para capturar errores inesperados en el cliente de base de datos
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL:', err);
});

export const db = {
  query: (text, params) => pool.query(text, params),
  pool,

  /**
   * Ejecuta fn(client) dentro de una transacción.
   * Hace COMMIT si termina bien, ROLLBACK si lanza un error, y siempre libera el cliente.
   */
  async transaction(fn) {
    const client = await db.pool.connect(); // db.pool para respetar el pool de los tests
    try {
      await client.query('BEGIN');
      const resultado = await fn(client);
      await client.query('COMMIT');
      return resultado;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
};

export default db;
