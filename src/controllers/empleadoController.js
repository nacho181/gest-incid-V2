/**
 * ============================================================================
 * CONTROLADOR DE EMPLEADOS - MUNICIPALIDAD DE CONCORDIA
 * Manejo de la lógica de negocio para artículos e incidencias técnicas.
 * Incluye datos en memoria como respaldo cuando PostgreSQL no está conectado.
 * ============================================================================
 */

const db = require('../config/db');
const emailService = require('../services/emailService');

// Datos iniciales de simulación en memoria (Respaldo resiliente)
let mockUsuarios = [
  { id_usuario: 1, id_area: 3, nombres: 'Carlos', apellidos: 'Perez', usuario: 'carper@correo.com', rol: 2, activo: 1, area_descripcion: 'Sistemas' },
  { id_usuario: 2, id_area: 3, nombres: 'Carmen', apellidos: 'Gomez', usuario: 'cargom@correo.com', rol: 2, activo: 1, area_descripcion: 'Sistemas' },
  { id_usuario: 3, id_area: 3, nombres: 'Pamela', apellidos: 'Almeida', usuario: 'pamalm@correo.com', rol: 1, activo: 1, area_descripcion: 'Sistemas' },
  { id_usuario: 4, id_area: 1, nombres: 'Esteban', apellidos: 'Reniero', usuario: 'estren@correo.com', rol: 3, activo: 1, area_descripcion: 'Legales' }
];

let mockArticulos = [
  { id_articulo: 1, id_area: 1, id_categoria: 1, descripcion: 'Mouse sin pilas', activo: 1, area_descripcion: 'Legales', categoria_descripcion: 'Perifericos' },
  { id_articulo: 2, id_area: 1, id_categoria: 1, descripcion: 'Monitor LG', activo: 1, area_descripcion: 'Legales', categoria_descripcion: 'Perifericos' },
  { id_articulo: 3, id_area: 1, id_categoria: 2, descripcion: 'Notebook HP', activo: 1, area_descripcion: 'Legales', categoria_descripcion: 'Notebooks' }
];

let mockIncidencias = [
  { id_incidencia: 1, id_articulo: 1, id_estado: 1, creado_por: 4, asignado_a: 1, creado: '2026-09-11T18:47:38.751Z', prioridad: 1, descripcion_pedido: 'descripción pedido', descripcion_resolucion: '', estado_descripcion: 'Pendiente', articulo_descripcion: 'Mouse sin pilas' },
  { id_incidencia: 2, id_articulo: 1, id_estado: 1, creado_por: 4, asignado_a: 2, creado: '2026-09-11T18:50:08.269Z', prioridad: 1, descripcion_pedido: 'descripción pedido', descripcion_resolucion: '', estado_descripcion: 'Pendiente', articulo_descripcion: 'Mouse sin pilas' },
  { id_incidencia: 3, id_articulo: 2, id_estado: 1, creado_por: 4, asignado_a: 1, creado: '2026-09-13T18:52:15.532Z', prioridad: 1, descripcion_pedido: 'No enciende', descripcion_resolucion: '', estado_descripcion: 'Pendiente', articulo_descripcion: 'Monitor LG' },
  { id_incidencia: 4, id_articulo: 3, id_estado: 1, creado_por: 4, asignado_a: 2, creado: '2026-09-13T18:52:51.346Z', prioridad: 1, descripcion_pedido: 'No carga la batería', descripcion_resolucion: '', estado_descripcion: 'Pendiente', articulo_descripcion: 'Notebook HP' }
];

/**
 * Obtiene la lista de empleados municipales activos.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
exports.getEmpleados = async (req, res) => {
  try {
    const queryText = `
      SELECT u.id_usuario, u.nombres, u.apellidos, u.usuario, u.rol, u.activo, a.descripcion AS area_descripcion
      FROM public.usuarios u
      JOIN public.areas a ON u.id_area = a.id_area
      WHERE u.activo = 1
      ORDER BY u.id_usuario ASC
    `;
    const result = await db.query(queryText);
    return res.json(result.rows);
  } catch (error) {
    // Si la base de datos no responde, utilizar los datos en memoria
    return res.json(mockUsuarios);
  }
};

/**
 * Obtiene el catálogo de artículos registrados y activos.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
exports.getArticulos = async (req, res) => {
  try {
    const queryText = `
      SELECT art.id_articulo, art.descripcion, art.activo,
             cat.descripcion AS categoria_descripcion,
             ar.descripcion AS area_descripcion
      FROM public.articulos art
      LEFT JOIN public.categorias cat ON art.id_categoria = cat.id_categoria
      LEFT JOIN public.areas ar ON art.id_area = ar.id_area
      WHERE art.activo = 1
      ORDER BY art.id_articulo ASC
    `;
    const result = await db.query(queryText);
    return res.json(result.rows);
  } catch (error) {
    // Fallback a memoria
    return res.json(mockArticulos);
  }
};

/**
 * Registra una nueva incidencia en el sistema asociada a un empleado.
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
exports.crearIncidencia = async (req, res) => {
  const { id_articulo, creado_por, prioridad, descripcion_pedido } = req.body;

  if (!id_articulo || !creado_por || !descripcion_pedido) {
    return res.status(400).json({ mensaje: 'Faltan campos obligatorios: id_articulo, creado_por y descripcion_pedido' });
  }

  const id_estado_inicial = 1; // 1 = Pendiente
  const asignado_a_default = 1; // Asignado por defecto

  try {
    // Insertar en la tabla incidencias
    const insertQuery = `
      INSERT INTO public.incidencias (id_articulo, id_estado, creado_por, asignado_a, prioridad, descripcion_pedido, descripcion_resolucion)
      VALUES ($1, $2, $3, $4, $5, $6, '')
      RETURNING *
    `;
    const values = [id_articulo, id_estado_inicial, creado_por, asignado_a_default, prioridad || 1, descripcion_pedido];
    const result = await db.query(insertQuery, values);
    const nuevaIncidencia = result.rows[0];

    // Registrar cambio de estado inicial en incidencias_estados
    const estadoQuery = `
      INSERT INTO public.incidencias_estados (id_incidencia, id_estado)
      VALUES ($1, $2)
    `;
    await db.query(estadoQuery, [nuevaIncidencia.id_incidencia, id_estado_inicial]);

    return res.status(201).json({
      mensaje: 'Incidencia creada correctamente',
      incidencia: nuevaIncidencia
    });

  } catch (error) {
    // Manejo de inserción en modo simulación (memoria)
    const art = mockArticulos.find(a => a.id_articulo === parseInt(id_articulo, 10));
    const nueva = {
      id_incidencia: mockIncidencias.length + 1,
      id_articulo: parseInt(id_articulo, 10),
      id_estado: 1,
      creado_por: parseInt(creado_por, 10),
      asignado_a: 1,
      creado: new Date().toISOString(),
      prioridad: parseInt(prioridad, 10) || 1,
      descripcion_pedido,
      descripcion_resolucion: '',
      estado_descripcion: 'Pendiente',
      articulo_descripcion: art ? art.descripcion : `Artículo #${id_articulo}`
    };
    mockIncidencias.unshift(nueva);

    return res.status(201).json({
      mensaje: 'Incidencia creada correctamente (Modo simulación)',
      incidencia: nueva
    });
  }
};

/**
 * Obtiene las incidencias reportadas por un empleado específico.
 * @param {Object} req - Objeto de solicitud HTTP conteniendo query id_usuario.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
exports.getMisIncidencias = async (req, res) => {
  const { id_usuario } = req.query;

  if (!id_usuario) {
    return res.status(400).json({ mensaje: 'El parámetro id_usuario es obligatorio' });
  }

  try {
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
    const result = await db.query(queryText, [id_usuario]);
    return res.json(result.rows);

  } catch (error) {
    // Filtro en memoria
    const userId = parseInt(id_usuario, 10);
    const filtradas = mockIncidencias.filter(i => i.creado_por === userId);
    return res.json(filtradas);
  }
};

/**
 * Cancela una incidencia propia siempre que su estado sea 'Pendiente' (id_estado = 1).
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
exports.cancelarIncidencia = async (req, res) => {
  const { id } = req.params;
  const { id_usuario } = req.body;

  if (!id_usuario) {
    return res.status(400).json({ mensaje: 'El parámetro id_usuario es obligatorio' });
  }

  const id_estado_cancelado = 4; // 4 = Cancelada

  try {
    // Verificar propiedad y estado actual de la incidencia
    const checkQuery = `SELECT * FROM public.incidencias WHERE id_incidencia = $1`;
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Incidencia no encontrada' });
    }

    const incidencia = checkResult.rows[0];

    if (incidencia.creado_por !== parseInt(id_usuario, 10)) {
      return res.status(403).json({ mensaje: 'No tiene permiso para cancelar esta incidencia' });
    }

    if (incidencia.id_estado !== 1) {
      return res.status(400).json({ mensaje: 'Solo se pueden cancelar incidencias en estado Pendiente' });
    }

    // Actualizar el estado a Cancelada
    const updateQuery = `
      UPDATE public.incidencias
      SET id_estado = $1
      WHERE id_incidencia = $2
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [id_estado_cancelado, id]);

    // Registrar la trazabilidad del cambio de estado
    const estadoQuery = `
      INSERT INTO public.incidencias_estados (id_incidencia, id_estado)
      VALUES ($1, $2)
    `;
    await db.query(estadoQuery, [id, id_estado_cancelado]);

    // Consultar datos del usuario y artículo para la notificación por correo
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
          canceladoPorNombre: `${u.nombres} ${u.apellidos} (Solicitante)`,
          articuloDescripcion: u.articulo_desc
        });
      }
    } catch (mailErr) {
      console.error('[EMAIL ERROR] Error enviando correo de cancelación:', mailErr.message);
    }

    return res.json({
      mensaje: 'Incidencia cancelada correctamente',
      incidencia: updateResult.rows[0]
    });

  } catch (error) {
    // Cancelación en modo simulación
    const incId = parseInt(id, 10);
    const userId = parseInt(id_usuario, 10);
    const inc = mockIncidencias.find(i => i.id_incidencia === incId);

    if (!inc) {
      return res.status(404).json({ mensaje: 'Incidencia no encontrada' });
    }

    if (inc.creado_por !== userId) {
      return res.status(403).json({ mensaje: 'No tiene permiso para cancelar esta incidencia' });
    }

    if (inc.id_estado !== 1) {
      return res.status(400).json({ mensaje: 'Solo se pueden cancelar incidencias en estado Pendiente' });
    }

    inc.id_estado = 4;
    inc.estado_descripcion = 'Cancelada';

    // Disparar notificación simulada
    const usrMock = mockUsuarios.find(u => u.id_usuario === userId);
    emailService.notificarIncidenciaCancelada({
      incidencia: inc,
      destinatarioEmail: usrMock ? usrMock.usuario : 'usuario@correo.com',
      destinatarioNombre: usrMock ? `${usrMock.nombres} ${usrMock.apellidos}` : 'Empleado Municipal',
      canceladoPorNombre: usrMock ? `${usrMock.nombres} ${usrMock.apellidos} (Solicitante)` : 'El solicitante',
      articuloDescripcion: inc.articulo_descripcion
    }).catch(e => console.warn('[EMAIL SIMULADO ERROR]:', e.message));

    return res.json({
      mensaje: 'Incidencia cancelada correctamente (Modo simulación)',
      incidencia: inc
    });
  }
};
