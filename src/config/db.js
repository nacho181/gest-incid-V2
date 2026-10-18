/**
 * ============================================================================
 * CONFIGURACIÓN DE CONEXIÓN A POSTGRESQL
 * Conexión mediante el cliente 'pg' de Node.js utilizando Pool de conexiones
 * ============================================================================
 */

const { Pool } = require('pg');
require('dotenv').config();

// Configuración del pool con variables de entorno o valores por defecto
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'incidencias_concordia',
});

// Evento que notifica la conexión exitosa
pool.on('connect', () => {
  console.log('Conectado exitosamente a la base de datos PostgreSQL');
});

// Evento para capturar errores inesperados en el cliente de base de datos
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL:', err);
});

module.exports = {
  /**
   * Ejecuta una consulta SQL en la base de datos utilizando el pool.
   * @param {string} text - Consulta SQL parametrizada.
   * @param {Array} params - Parámetros de la consulta SQL.
   * @returns {Promise<Object>} Resultado de la ejecución del query.
   */
  query: (text, params) => pool.query(text, params),
  pool,
};
