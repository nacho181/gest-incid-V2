/**
 * ============================================================================
 * REPOSITORIO DE INCIDENCIAS
 * Consultas SQL directas para la tabla incidencias y la trazabilidad de estados
 * ============================================================================
 */

import db from '../config/db.js';

export const INCIDENCIAS_SORT_MAP = {
  id: 'inc.id_incidencia',
  id_incidencia: 'inc.id_incidencia',
  creado: 'inc.creado',
  fecha: 'inc.creado',
  prioridad: 'inc.prioridad',
  id_estado: 'inc.id_estado',
  estado_descripcion: 'est.descripcion',
  descripcion_pedido: 'inc.descripcion_pedido',
  articulo_descripcion: 'art.descripcion',
  id_articulo: 'inc.id_articulo',
  creado_por: 'inc.creado_por',
  asignado_a: 'inc.asignado_a',
  usuario_creador: "CONCAT(u_crea.nombres, ' ', u_crea.apellidos)",
  asignado_nombre: "CONCAT(u_asig.nombres, ' ', u_asig.apellidos)"
};

class IncidenciaRepository {
  async findById(idIncidencia) {
    const queryText = `
      SELECT * FROM public.incidencias WHERE id_incidencia = $1
    `;
    const { rows } = await db.query(queryText, [idIncidencia]);
    return rows[0] || null;
  }

  // Ejecuta fn(client) en una transacción
  async transaction(fn) {
    return await db.transaction(fn);
  }

  async create(
    { id_articulo, id_estado, creado_por, asignado_a, prioridad, descripcion_pedido },
    executor = db
  ) {
    const { rows } = await executor.query(
      `INSERT INTO public.incidencias
         (id_articulo, id_estado, creado_por, asignado_a, prioridad, descripcion_pedido, descripcion_resolucion)
       VALUES ($1, $2, $3, $4, $5, $6, '')
       RETURNING *`,
      [id_articulo, id_estado, creado_por, asignado_a, prioridad, descripcion_pedido]
    );
    return rows[0];
  }

  async findByIdWithDetails(idIncidencia) {
    const queryText = `
      SELECT inc.*,
             u_crea.nombres AS creador_nombres,
             u_crea.apellidos AS creador_apellidos,
             u_crea.usuario AS creador_email,
             art.descripcion AS articulo_descripcion
      FROM public.incidencias inc
      JOIN public.usuarios u_crea ON inc.creado_por = u_crea.id_usuario
      JOIN public.articulos art ON inc.id_articulo = art.id_articulo
      WHERE inc.id_incidencia = $1
    `;
    const { rows } = await db.query(queryText, [idIncidencia]);
    return rows[0] || null;
  }

  /**
   * Consulta SQL paginada con LIMIT, OFFSET, conteo total y ordenamiento seguro en base de datos.
   */
  async findAllPaginated({
    creado_por = null,
    asignado_a = null,
    id_estado = null,
    prioridad = null,
    id_articulo = null,
    id_area = null,
    buscar = null,
    limit = 10,
    offset = 0,
    sortSql = 'inc.creado DESC'
  } = {}) {
    const fromAndWhere = `
      FROM public.incidencias inc
      JOIN public.estados est ON inc.id_estado = est.id_estado
      JOIN public.articulos art ON inc.id_articulo = art.id_articulo
      JOIN public.usuarios u_crea ON inc.creado_por = u_crea.id_usuario
      LEFT JOIN public.usuarios u_asig ON inc.asignado_a = u_asig.id_usuario
      LEFT JOIN public.areas ar ON u_crea.id_area = ar.id_area
      WHERE 1=1
    `;
    const params = [];
    let filterClauses = '';

    if (creado_por !== null && creado_por !== undefined) {
      params.push(parseInt(creado_por, 10));
      filterClauses += ` AND inc.creado_por = $${params.length}`;
    }

    if (asignado_a !== null && asignado_a !== undefined) {
      params.push(parseInt(asignado_a, 10));
      filterClauses += ` AND inc.asignado_a = $${params.length}`;
    }

    if (id_estado !== null && id_estado !== undefined) {
      params.push(parseInt(id_estado, 10));
      filterClauses += ` AND inc.id_estado = $${params.length}`;
    }

    if (prioridad !== null && prioridad !== undefined) {
      params.push(parseInt(prioridad, 10));
      filterClauses += ` AND inc.prioridad = $${params.length}`;
    }

    if (id_articulo !== null && id_articulo !== undefined) {
      params.push(parseInt(id_articulo, 10));
      filterClauses += ` AND inc.id_articulo = $${params.length}`;
    }

    if (id_area !== null && id_area !== undefined) {
      params.push(parseInt(id_area, 10));
      filterClauses += ` AND (art.id_area = $${params.length} OR u_crea.id_area = $${params.length})`;
    }

    if (buscar) {
      params.push(`%${buscar.trim()}%`);
      const pIdx = params.length;
      filterClauses += ` AND (
        inc.descripcion_pedido ILIKE $${pIdx} OR
        art.descripcion ILIKE $${pIdx} OR
        u_crea.nombres ILIKE $${pIdx} OR
        u_crea.apellidos ILIKE $${pIdx} OR
        est.descripcion ILIKE $${pIdx}
      )`;
    }

    // 1. Conteo total de registros con los filtros aplicados (sin LIMIT ni OFFSET)
    const countSql = `SELECT COUNT(*)::int AS total ${fromAndWhere} ${filterClauses}`;
    const countResult = await db.query(countSql, params);
    const total = countResult.rows[0]?.total || 0;

    // 2. Consulta de registros con ordenamiento y paginación LIMIT / OFFSET
    const dataParams = [...params];
    dataParams.push(limit);
    const limitPlaceholder = `$${dataParams.length}`;
    dataParams.push(offset);
    const offsetPlaceholder = `$${dataParams.length}`;

    const dataSql = `
      SELECT inc.id_incidencia, inc.id_articulo, inc.id_estado, inc.creado_por, inc.asignado_a,
             inc.creado, inc.prioridad, inc.descripcion_pedido, inc.descripcion_resolucion,
             est.descripcion AS estado_descripcion,
             art.descripcion AS articulo_descripcion,
             CONCAT(u_crea.nombres, ' ', u_crea.apellidos) AS usuario_creador,
             u_crea.usuario AS usuario_creador_email,
             COALESCE(ar.descripcion, 'Área Municipal') AS area_solicitante,
             CASE
               WHEN inc.asignado_a = 0 OR inc.asignado_a IS NULL THEN 'Sin Asignar'
               ELSE COALESCE(CONCAT(u_asig.nombres, ' ', u_asig.apellidos), 'Sin Asignar')
             END AS asignado_nombre
      ${fromAndWhere} ${filterClauses}
      ORDER BY ${sortSql}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const { rows } = await db.query(dataSql, dataParams);
    return { rows, total };
  }

  async findByIdForUpdate(idIncidencia, executor = db) {
    const { rows } = await executor.query(
      'SELECT * FROM public.incidencias WHERE id_incidencia = $1 FOR UPDATE',
      [idIncidencia]
    );
    return rows[0] || null;
  }

  // Asigna técnico y fija el estado en una sola sentencia
  async updateAsignacion(idIncidencia, idUsuarioSistemas, idEstado, executor = db) {
    const { rows } = await executor.query(
      `UPDATE public.incidencias
          SET asignado_a = $1, id_estado = $2
        WHERE id_incidencia = $3
        RETURNING *`,
      [idUsuarioSistemas, idEstado, idIncidencia]
    );
    return rows[0] || null;
  }

  // Solo finaliza si sigue En Proceso (guarda contra carreras)
  async finalizar(idIncidencia, descripcionResolucion, executor = db) {
    const { rows } = await executor.query(
      `UPDATE public.incidencias
          SET id_estado = 3, descripcion_resolucion = $1
        WHERE id_incidencia = $2 AND id_estado = 2
        RETURNING *`,
      [descripcionResolucion, idIncidencia]
    );
    return rows[0] || null;
  }

  async updateEstado(idIncidencia, idEstado, executor = db) {
    const updateQuery = `
      UPDATE public.incidencias SET id_estado = $1 WHERE id_incidencia = $2 RETURNING *
    `;
    const { rows } = await executor.query(updateQuery, [idEstado, idIncidencia]);
    return rows[0] || null;
  }

  async addHistorialEstado(idIncidencia, idEstado, executor = db) {
    const queryText = `
      INSERT INTO public.incidencias_estados (id_incidencia, id_estado) VALUES ($1, $2)
    `;
    await executor.query(queryText, [idIncidencia, idEstado]);
  }

  async getDashboardSummary() {
    const statusQuery = `
      SELECT est.id_estado, est.descripcion AS estado, COUNT(inc.id_incidencia)::int AS total
      FROM public.estados est
      LEFT JOIN public.incidencias inc ON est.id_estado = inc.id_estado
      GROUP BY est.id_estado, est.descripcion
      ORDER BY est.id_estado ASC
    `;
    const statusResult = await db.query(statusQuery);

    const dateQuery = `
      SELECT TO_CHAR(creado, 'YYYY-MM-DD') AS fecha, COUNT(id_incidencia)::int AS total
      FROM public.incidencias
      GROUP BY TO_CHAR(creado, 'YYYY-MM-DD')
      ORDER BY fecha DESC
      LIMIT 10
    `;
    const dateResult = await db.query(dateQuery);

    const priorityQuery = `
      SELECT inc.id_incidencia, inc.id_articulo, inc.id_estado, inc.prioridad, inc.creado,
             inc.descripcion_pedido, inc.asignado_a,
             est.descripcion AS estado_descripcion,
             art.descripcion AS articulo_descripcion,
             CONCAT(u_crea.nombres, ' ', u_crea.apellidos) AS usuario_creador,
             CASE
               WHEN inc.asignado_a = 0 OR inc.asignado_a IS NULL THEN 'Sin Asignar'
               ELSE COALESCE(CONCAT(u_asig.nombres, ' ', u_asig.apellidos), 'Sin Asignar')
             END AS asignado_nombre
      FROM public.incidencias inc
      JOIN public.estados est ON inc.id_estado = est.id_estado
      JOIN public.articulos art ON inc.id_articulo = art.id_articulo
      JOIN public.usuarios u_crea ON inc.creado_por = u_crea.id_usuario
      LEFT JOIN public.usuarios u_asig ON inc.asignado_a = u_asig.id_usuario
      WHERE inc.prioridad = 1 AND inc.id_estado IN (1, 2)
      ORDER BY inc.creado DESC
      LIMIT 5
    `;
    const priorityResult = await db.query(priorityQuery);

    return {
      por_estado: statusResult.rows,
      por_fecha: dateResult.rows,
      prioritarias: priorityResult.rows
    };
  }

  async getReportesEstadisticos() {
    const totalQuery = `SELECT COUNT(*)::int AS total_incidencias FROM public.incidencias`;
    const totalResult = await db.query(totalQuery);

    const areaQuery = `
      SELECT ar.descripcion AS area, COUNT(inc.id_incidencia)::int AS total
      FROM public.areas ar
      JOIN public.articulos art ON ar.id_area = art.id_area
      JOIN public.incidencias inc ON art.id_articulo = inc.id_articulo
      GROUP BY ar.descripcion
    `;
    const areaResult = await db.query(areaQuery);

    const catQuery = `
      SELECT cat.descripcion AS categoria, COUNT(inc.id_incidencia)::int AS total
      FROM public.categorias cat
      JOIN public.articulos art ON cat.id_categoria = art.id_categoria
      JOIN public.incidencias inc ON art.id_articulo = inc.id_articulo
      GROUP BY cat.descripcion
    `;
    const catResult = await db.query(catQuery);

    return {
      total_incidencias: totalResult.rows[0]?.total_incidencias || 0,
      por_area: areaResult.rows,
      por_categoria: catResult.rows
    };
  }

  /**
   * Consulta las incidencias filtradas por rango de fechas, estado y técnico asignado
   * para la generación de reportes oficiales en PDF.
   * Utiliza consultas parametrizadas ($1, $2, ...) con joins a artículos, estados y usuarios.
   */
  async getReporteIncidencias({ desde, hasta, id_estado, asignado_a } = {}) {
    let sql = `
      SELECT inc.id_incidencia, inc.creado, inc.prioridad, inc.descripcion_pedido,
             est.id_estado, est.descripcion AS estado_descripcion,
             art.id_articulo, art.descripcion AS articulo_descripcion,
             inc.asignado_a,
             CASE
               WHEN inc.asignado_a = 0 OR inc.asignado_a IS NULL THEN 'Sin Asignar'
               ELSE COALESCE(CONCAT(u_asig.nombres, ' ', u_asig.apellidos), 'Sin Asignar')
             END AS asignado_nombre
      FROM public.incidencias inc
      JOIN public.estados est ON inc.id_estado = est.id_estado
      JOIN public.articulos art ON inc.id_articulo = art.id_articulo
      LEFT JOIN public.usuarios u_asig ON inc.asignado_a = u_asig.id_usuario
      WHERE 1=1
    `;
    const params = [];

    if (desde && String(desde).trim()) {
      params.push(`${String(desde).trim()}T00:00:00.000Z`);
      sql += ` AND inc.creado >= $${params.length}::timestamptz`;
    }

    if (hasta && String(hasta).trim()) {
      params.push(`${String(hasta).trim()}T23:59:59.999Z`);
      sql += ` AND inc.creado <= $${params.length}::timestamptz`;
    }

    if (id_estado !== undefined && id_estado !== null && String(id_estado).trim() !== '') {
      const parsedEstado = parseInt(id_estado, 10);
      if (!isNaN(parsedEstado) && parsedEstado > 0) {
        params.push(parsedEstado);
        sql += ` AND inc.id_estado = $${params.length}`;
      }
    }

    if (asignado_a !== undefined && asignado_a !== null && String(asignado_a).trim() !== '') {
      const parsedAsignado = parseInt(asignado_a, 10);
      if (!isNaN(parsedAsignado)) {
        if (parsedAsignado === 0) {
          sql += ` AND (inc.asignado_a = 0 OR inc.asignado_a IS NULL)`;
        } else {
          params.push(parsedAsignado);
          sql += ` AND inc.asignado_a = $${params.length}`;
        }
      }
    }

    sql += ` ORDER BY inc.creado DESC, inc.id_incidencia DESC`;

    const { rows } = await db.query(sql, params);
    return rows;
  }
}

export default new IncidenciaRepository();
