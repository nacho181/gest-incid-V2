/**
 * ============================================================================
 * CONTROLADOR PANEL DIRECTOR DE SISTEMAS - MUNICIPALIDAD DE CONCORDIA
 * Lógica para dashboard, generación de datos de reportes, asignación y cancelación.
 * ============================================================================
 */

const db = require('../config/db');
const emailService = require('../services/emailService');

// Datos de respaldo en memoria cuando PostgreSQL no esté disponible
let mockSistemasEmpleados = [
  { id_usuario: 1, nombres: 'Carlos', apellidos: 'Perez', id_area: 3, area_descripcion: 'Sistemas', rol: 2 },
  { id_usuario: 2, nombres: 'Carmen', apellidos: 'Gomez', id_area: 3, area_descripcion: 'Sistemas', rol: 2 }
];

let mockIncidenciasDirector = [
  { id_incidencia: 1, id_articulo: 1, id_estado: 1, creado_por: 4, asignado_a: 1, creado: '2026-09-11T18:47:38.751Z', prioridad: 1, descripcion_pedido: 'Mouse sin pilas', estado_descripcion: 'Pendiente', articulo_descripcion: 'Mouse sin pilas', usuario_creador: 'Esteban Reniero', asignado_nombre: 'Carlos Perez' },
  { id_incidencia: 2, id_articulo: 1, id_estado: 2, creado_por: 4, asignado_a: 2, creado: '2026-09-11T18:50:08.269Z', prioridad: 1, descripcion_pedido: 'Falla de conexion', estado_descripcion: 'En Proceso', articulo_descripcion: 'Mouse sin pilas', usuario_creador: 'Esteban Reniero', asignado_nombre: 'Carmen Gomez' },
  { id_incidencia: 3, id_articulo: 2, id_estado: 1, creado_por: 4, asignado_a: 0, creado: '2026-09-13T18:52:15.532Z', prioridad: 1, descripcion_pedido: 'No enciende la pantalla', estado_descripcion: 'Pendiente', articulo_descripcion: 'Monitor LG', usuario_creador: 'Esteban Reniero', asignado_nombre: 'Sin Asignar' },
  { id_incidencia: 4, id_articulo: 3, id_estado: 1, creado_por: 4, asignado_a: 0, creado: '2026-09-13T18:52:51.346Z', prioridad: 2, descripcion_pedido: 'No carga la batería', estado_descripcion: 'Pendiente', articulo_descripcion: 'Notebook HP', usuario_creador: 'Esteban Reniero', asignado_nombre: 'Sin Asignar' }
];

/**
 * Obtiene el resumen del dashboard: totales por estado, totales por fecha e incidencias prioritarias.
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    // 1. Totales según estado
    const statusQuery = `
      SELECT est.id_estado, est.descripcion AS estado, COUNT(inc.id_incidencia)::int AS total
      FROM public.estados est
      LEFT JOIN public.incidencias inc ON est.id_estado = inc.id_estado
      GROUP BY est.id_estado, est.descripcion
      ORDER BY est.id_estado ASC
    `;
    const statusResult = await db.query(statusQuery);

    // 2. Totales por fecha
    const dateQuery = `
      SELECT TO_CHAR(creado, 'YYYY-MM-DD') AS fecha, COUNT(id_incidencia)::int AS total
      FROM public.incidencias
      GROUP BY TO_CHAR(creado, 'YYYY-MM-DD')
      ORDER BY fecha DESC
      LIMIT 10
    `;
    const dateResult = await db.query(dateQuery);

    // 3. Incidencias prioritarias (prioridad 1 = Alta)
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

    return res.json({
      por_estado: statusResult.rows,
      por_fecha: dateResult.rows,
      prioritarias: priorityResult.rows
    });

  } catch (error) {
    // Fallback con datos mock
    const por_estado = [
      { id_estado: 1, estado: 'Pendiente', total: mockIncidenciasDirector.filter(i => i.id_estado === 1).length },
      { id_estado: 2, estado: 'En Proceso', total: mockIncidenciasDirector.filter(i => i.id_estado === 2).length },
      { id_estado: 3, estado: 'Resuelta', total: mockIncidenciasDirector.filter(i => i.id_estado === 3).length },
      { id_estado: 4, estado: 'Cancelada', total: mockIncidenciasDirector.filter(i => i.id_estado === 4).length }
    ];

    const por_fecha = [
      { fecha: '2026-09-13', total: 2 },
      { fecha: '2026-09-11', total: 2 }
    ];

    const prioritarias = mockIncidenciasDirector.filter(i => i.prioridad === 1);

    return res.json({
      por_estado,
      por_fecha,
      prioritarias
    });
  }
};

/**
 * Obtiene la lista de empleados del área de Sistemas para asignación de incidencias.
 * Se filtra estrictamente por rol = 2 (empleados de sistemas).
 */
exports.getEmpleadosSistemas = async (req, res) => {
  try {
    const queryText = `
      SELECT u.id_usuario, u.nombres, u.apellidos, u.usuario, u.rol, u.activo, a.descripcion AS area_descripcion
      FROM public.usuarios u
      JOIN public.areas a ON u.id_area = a.id_area
      WHERE u.id_area = 3 AND u.activo = 1 AND u.rol = 2
      ORDER BY u.apellidos ASC
    `;
    const result = await db.query(queryText);
    return res.json(result.rows);
  } catch (error) {
    return res.json(mockSistemasEmpleados.filter(e => e.rol === 2));
  }
};

/**
 * Obtiene el listado completo de incidencias para el panel del Director.
 */
exports.getTodasIncidencias = async (req, res) => {
  try {
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
    const result = await db.query(queryText);
    return res.json(result.rows);
  } catch (error) {
    return res.json(mockIncidenciasDirector);
  }
};

/**
 * Asigna una incidencia a un empleado específico del área de Sistemas.
 */
exports.asignarIncidencia = async (req, res) => {
  const { id } = req.params;
  const { id_usuario_sistemas } = req.body;

  if (!id_usuario_sistemas) {
    return res.status(400).json({ mensaje: 'Debe especificar el id_usuario_sistemas al cual asignar la incidencia' });
  }

  try {
    const updateQuery = `
      UPDATE public.incidencias
      SET asignado_a = $1
      WHERE id_incidencia = $2
      RETURNING *
    `;
    const result = await db.query(updateQuery, [id_usuario_sistemas, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Incidencia no encontrada' });
    }

    return res.json({
      mensaje: 'Incidencia asignada correctamente',
      incidencia: result.rows[0]
    });

  } catch (error) {
    const incId = parseInt(id, 10);
    const asigId = parseInt(id_usuario_sistemas, 10);
    const inc = mockIncidenciasDirector.find(i => i.id_incidencia === incId);
    const emp = mockSistemasEmpleados.find(e => e.id_usuario === asigId);

    if (!inc) {
      return res.status(404).json({ mensaje: 'Incidencia no encontrada' });
    }

    inc.asignado_a = asigId;
    inc.asignado_nombre = emp ? `${emp.nombres} ${emp.apellidos}` : `Usuario #${asigId}`;

    return res.json({
      mensaje: 'Incidencia asignada correctamente (Modo simulación)',
      incidencia: inc
    });
  }
};

/**
 * Cancela (soft delete) una incidencia en estado Pendiente (id_estado = 1).
 */
exports.cancelarIncidenciaDirector = async (req, res) => {
  const { id } = req.params;
  const id_estado_cancelada = 4;

  try {
    const checkQuery = `SELECT * FROM public.incidencias WHERE id_incidencia = $1`;
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Incidencia no encontrada' });
    }

    const incidencia = checkResult.rows[0];

    if (incidencia.id_estado !== 1) {
      return res.status(400).json({ mensaje: 'Solo se pueden cancelar incidencias que se encuentren en estado Pendiente' });
    }

    const updateQuery = `
      UPDATE public.incidencias
      SET id_estado = $1
      WHERE id_incidencia = $2
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [id_estado_cancelada, id]);

    // Registrar en incidencias_estados
    const estadoQuery = `
      INSERT INTO public.incidencias_estados (id_incidencia, id_estado)
      VALUES ($1, $2)
    `;
    await db.query(estadoQuery, [id, id_estado_cancelada]);

    // Consultar datos del creador y artículo para la notificación por correo
    try {
      const uRes = await db.query(
        `SELECT u.nombres, u.apellidos, u.usuario AS email, art.descripcion AS articulo_desc
         FROM public.usuarios u
         JOIN public.incidencias inc ON inc.creado_por = u.id_usuario
         JOIN public.articulos art ON inc.id_articulo = art.id_articulo
         WHERE inc.id_incidencia = $1`,
        [id]
      );
      if (uRes.rows.length > 0) {
        const u = uRes.rows[0];
        await emailService.notificarIncidenciaCancelada({
          incidencia: updateResult.rows[0],
          destinatarioEmail: u.email,
          destinatarioNombre: `${u.nombres} ${u.apellidos}`,
          canceladoPorNombre: 'Director de Sistemas',
          articuloDescripcion: u.articulo_desc
        });
      }
    } catch (mailErr) {
      console.error('[EMAIL ERROR] Error enviando correo de cancelación (Director):', mailErr.message);
    }

    return res.json({
      mensaje: 'Incidencia cancelada exitosamente',
      incidencia: updateResult.rows[0]
    });

  } catch (error) {
    const incId = parseInt(id, 10);
    const inc = mockIncidenciasDirector.find(i => i.id_incidencia === incId);

    if (!inc) {
      return res.status(404).json({ mensaje: 'Incidencia no encontrada' });
    }

    if (inc.id_estado !== 1) {
      return res.status(400).json({ mensaje: 'Solo se pueden cancelar incidencias en estado Pendiente' });
    }

    inc.id_estado = 4;
    inc.estado_descripcion = 'Cancelada';

    // Disparar notificación simulada
    emailService.notificarIncidenciaCancelada({
      incidencia: inc,
      destinatarioEmail: 'estren@correo.com',
      destinatarioNombre: inc.usuario_creador || 'Empleado Municipal',
      canceladoPorNombre: 'Director de Sistemas',
      articuloDescripcion: inc.articulo_descripcion
    }).catch(e => console.warn('[EMAIL SIMULADO ERROR]:', e.message));

    return res.json({
      mensaje: 'Incidencia cancelada exitosamente (Modo simulación)',
      incidencia: inc
    });
  }
};

/**
 * Genera datos estadísticos completos para la generación del reporte PDF.
 */
exports.getReportesEstadisticos = async (req, res) => {
  try {
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

    return res.json({
      total_incidencias: totalResult.rows[0]?.total_incidencias || 0,
      por_area: areaResult.rows,
      por_categoria: catResult.rows
    });

  } catch (error) {
    return res.json({
      total_incidencias: mockIncidenciasDirector.length,
      por_area: [
        { area: 'Legales', total: 3 },
        { area: 'Sistemas', total: 1 }
      ],
      por_categoria: [
        { categoria: 'Perifericos', total: 2 },
        { categoria: 'Notebooks', total: 1 },
        { categoria: 'PC Escritorio', total: 1 }
      ]
    });
  }
};
