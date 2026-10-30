/**
 * ============================================================================
 * REPOSITORIO DE INCIDENCIAS
 * Consultas SQL directas para la tabla incidencias y la trazabilidad de estados
 * ============================================================================
 */

import db from '../config/db.js';

class IncidenciaRepository {
  async getClient() {
    return await db.pool.connect();
  }

  async findById(idIncidencia) {
    const queryText = `
      SELECT * FROM public.incidencias WHERE id_incidencia = $1
    `;
    const { rows } = await db.query(queryText, [idIncidencia]);
    return rows[0] || null;
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

  async findByUsuarioCreador(idUsuario) {
    const queryText = `
      SELECT inc.id_incidencia, inc.id_articulo, inc.id_estado, inc.creado_por, inc.asignado_a,
              inc.creado, inc.prioridad, inc.descripcion_pedido, inc.descripcion_resolucion,
              est.descripcion AS estado_descripcion,
              art.descripcion AS articulo_descripcion
       FROM public.incidencias inc
       JOIN public.estados est ON inc.id_estado = est.id_estado
       JOIN public.articulos art ON inc.id_articulo = art.id_articulo
       WHERE inc.creado_por = $1
       ORDER BY inc.creado DESC
    `;
    const { rows } = await db.query(queryText, [idUsuario]);
    return rows;
  }

  async findAsignadasATecnico(idUsuario) {
    const queryText = `
      SELECT inc.id_incidencia, inc.id_articulo, inc.id_estado, inc.creado_por, inc.asignado_a,
             inc.creado, inc.prioridad, inc.descripcion_pedido, inc.descripcion_resolucion,
             est.descripcion AS estado_descripcion,
             art.descripcion AS articulo_descripcion,
             CONCAT(u_crea.nombres, ' ', u_crea.apellidos) AS usuario_creador,
             u_crea.usuario AS usuario_creador_email,
             COALESCE(ar.descripcion, 'Área Municipal') AS area_solicitante
      FROM public.incidencias inc
      JOIN public.estados est ON inc.id_estado = est.id_estado
      JOIN public.articulos art ON inc.id_articulo = art.id_articulo
      JOIN public.usuarios u_crea ON inc.creado_por = u_crea.id_usuario
      LEFT JOIN public.areas ar ON u_crea.id_area = ar.id_area
      WHERE inc.asignado_a = $1
      ORDER BY
        CASE
          WHEN inc.id_estado = 1 THEN 1
          WHEN inc.id_estado = 2 THEN 2
          WHEN inc.id_estado = 3 THEN 3
          ELSE 4
        END,
        inc.prioridad ASC,
        inc.creado DESC
    `;
    const { rows } = await db.query(queryText, [idUsuario]);
    return rows;
  }

  async findAll() {
    const queryText = `
      SELECT inc.id_incidencia, inc.id_articulo, inc.id_estado, inc.prioridad, inc.creado,
             inc.descripcion_pedido, inc.asignado_a,
             est.descripcion AS estado_descripcion,
             art.descripcion AS articulo_descripcion,
             CONCAT(u_crea.nombres, ' ', u_crea.apellidos) AS usuario_creador,
             COALESCE(CONCAT(u_asig.nombres, ' ', u_asig.apellidos), 'Sin Asignar') AS asignado_nombre
      FROM public.incidencias inc
      JOIN public.estados est ON inc.id_estado = est.id_estado
      JOIN public.articulos art ON inc.id_articulo = art.id_articulo
      JOIN public.usuarios u_crea ON inc.creado_por = u_crea.id_usuario
      LEFT JOIN public.usuarios u_asig ON inc.asignado_a = u_asig.id_usuario
      ORDER BY inc.creado DESC
    `;
    const { rows } = await db.query(queryText);
    return rows;
  }

  async updateAsignado(idIncidencia, idUsuarioSistemas) {
    const updateQuery = `
      UPDATE public.incidencias
      SET asignado_a = $1
      WHERE id_incidencia = $2
      RETURNING *
    `;
    const { rows } = await db.query(updateQuery, [idUsuarioSistemas, idIncidencia]);
    return rows[0] || null;
  }

  async updateEstadoAndResolucion(idIncidencia, idEstado, descripcionResolucion) {
    const updateQuery = `
      UPDATE public.incidencias
      SET id_estado = $1,
          descripcion_resolucion = $2
      WHERE id_incidencia = $3
      RETURNING *
    `;
    const { rows } = await db.query(updateQuery, [idEstado, descripcionResolucion, idIncidencia]);
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
             COALESCE(CONCAT(u_asig.nombres, ' ', u_asig.apellidos), 'Sin Asignar') AS asignado_nombre
      FROM public.incidencias inc
      JOIN public.estados est ON inc.id_estado = est.id_estado
      JOIN public.articulos art ON inc.id_articulo = art.id_articulo
      JOIN public.usuarios u_crea ON inc.creado_por = u_crea.id_usuario
      LEFT JOIN public.usuarios u_asig ON inc.asignado_a = u_asig.id_usuario
      WHERE inc.prioridad = 1
      ORDER BY inc.creado DESC
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
}

export default new IncidenciaRepository();
