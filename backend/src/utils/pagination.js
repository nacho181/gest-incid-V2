/**
 * ============================================================================
 * UTILIDAD DE PAGINACIÓN Y ORDENAMIENTO (SQL LIMIT / OFFSET)
 * Normalización de parámetros de consulta, protección contra SQL Injection
 * mediante whitelist de columnas y estructura de respuesta estándar.
 * ============================================================================
 */

/**
 * Valida y sanitiza los parámetros de paginación numéricos.
 * offset = (page - 1) * limit
 * 
 * @param {Object} query - Parámetros recibidos en req.query
 * @param {number} defaultLimit - Límite por defecto (ej. 10)
 * @param {number} maxLimit - Límite máximo permitido para evitar sobrecarga (ej. 100)
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(query = {}, defaultLimit = 10, maxLimit = 100) {
  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  } else if (limit > maxLimit) {
    limit = maxLimit;
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Valida y sanitiza los parámetros de ordenamiento contra una lista blanca (whitelist).
 * Previene inyección SQL asegurando que solo se concatenen identificadores válidos.
 * 
 * @param {Object} query - Parámetros req.query (order_by, order_dir)
 * @param {Object.<string, string>} allowedColumns - Diccionario de mapeo { columna_publica: columna_sql_calificada }
 * @param {string} defaultKey - Clave por defecto si no se especifica o no es válida
 * @param {'ASC'|'DESC'} defaultDir - Dirección por defecto
 * @returns {{ orderBy: string, orderDir: 'ASC'|'DESC', sortSql: string }}
 */
export function parseSort(query = {}, allowedColumns = {}, defaultKey = 'id', defaultDir = 'ASC') {
  const reqCol = query.order_by ? String(query.order_by).trim().toLowerCase() : null;
  const reqDir = query.order_dir ? String(query.order_dir).trim().toUpperCase() : null;

  let chosenKey = defaultKey;
  let colSql = allowedColumns[defaultKey.toLowerCase()] || defaultKey;

  if (reqCol && allowedColumns[reqCol]) {
    chosenKey = reqCol;
    colSql = allowedColumns[reqCol];
  }

  const orderDir = (reqDir === 'DESC' || (reqDir === null && defaultDir.toUpperCase() === 'DESC')) ? 'DESC' : 'ASC';

  return {
    orderBy: chosenKey,
    orderDir,
    sortSql: `${colSql} ${orderDir}`
  };
}

/**
 * Normaliza la respuesta JSON estándar con metadata de paginación.
 * 
 * @param {Array} data - Conjunto de registros paginados
 * @param {number} total - Total general de registros según filtros (COUNT)
 * @param {number} page - Página actual
 * @param {number} limit - Cantidad por página
 * @returns {{ data: Array, pagination: { total: number, page: number, limit: number, total_pages: number, has_next: boolean, has_prev: boolean } }}
 */
export function buildPaginatedResponse(data = [], total = 0, page = 1, limit = 10) {
  const totalNum = parseInt(total, 10) || 0;
  const total_pages = totalNum > 0 ? Math.ceil(totalNum / limit) : 0;
  const has_next = page < total_pages;
  const has_prev = page > 1;

  return {
    data,
    pagination: {
      total: totalNum,
      page,
      limit,
      total_pages,
      has_next,
      has_prev
    }
  };
}
