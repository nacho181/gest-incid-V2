/**
 * ============================================================================
 * CONTROLADOR MÓDULO EMPLEADO DE SISTEMAS - MUNICIPALIDAD DE CONCORDIA
 * Implementación para: Incidencias - Sistemas y Notificaciones.
 * - Listar incidencias asignadas al empleado de Sistemas.
 * - Finalizar incidencias ingresando la descripción de resolución.
 * - Disparar notificaciones por correo electrónico al finalizar.
 * ============================================================================
 */

const db = require('../config/db');
const emailService = require('../services/emailService');

// Datos de respaldo en memoria cuando PostgreSQL no está conectado (Modo Simulación)
let mockIncidenciasSistemas = [
  {
    id_incidencia: 1,
    id_articulo: 1,
    id_estado: 4,
    creado_por: 4,
    asignado_a: 1,
    creado: '2026-09-11T18:47:38.751Z',
    prioridad: 1,
    descripcion_pedido: 'Mouse sin pilas',
    descripcion_resolucion: '',
    estado_descripcion: 'Cancelada',
    articulo_descripcion: 'Mouse sin pilas',
    usuario_creador: 'Esteban Reniero',
    usuario_creador_email: 'estren@correo.com',
    area_solicitante: 'Legales'
  },
  {
    id_incidencia: 2,
    id_articulo: 1,
    id_estado: 2,
    creado_por: 4,
    asignado_a: 2,
    creado: '2026-09-11T18:50:08.269Z',
    prioridad: 1,
    descripcion_pedido: 'Falla de conexion',
    descripcion_resolucion: '',
    estado_descripcion: 'En Proceso',
    articulo_descripcion: 'Mouse sin pilas',
    usuario_creador: 'Esteban Reniero',
    usuario_creador_email: 'estren@correo.com',
    area_solicitante: 'Legales'
  },
  {
    id_incidencia: 3,
    id_articulo: 2,
    id_estado: 1,
    creado_por: 4,
    asignado_a: 1,
    creado: '2026-09-13T18:52:15.532Z',
    prioridad: 1,
    descripcion_pedido: 'No enciende la pantalla',
    descripcion_resolucion: '',
    estado_descripcion: 'Pendiente',
    articulo_descripcion: 'Monitor LG',
    usuario_creador: 'Esteban Reniero',
    usuario_creador_email: 'estren@correo.com',
    area_solicitante: 'Legales'
  },
  {
    id_incidencia: 4,
    id_articulo: 3,
    id_estado: 1,
    creado_por: 4,
    asignado_a: 2,
    creado: '2026-09-13T18:52:51.346Z',
    prioridad: 2,
    descripcion_pedido: 'No carga la batería',
    descripcion_resolucion: '',
    estado_descripcion: 'Pendiente',
    articulo_descripcion: 'Notebook HP',
    usuario_creador: 'Esteban Reniero',
    usuario_creador_email: 'estren@correo.com',
    area_solicitante: 'Legales'
  },
  {
    id_incidencia: 5,
    id_articulo: 1,
    id_estado: 1,
    creado_por: 4,
    asignado_a: 1,
    creado: '2026-09-14T10:15:00.000Z',
    prioridad: 1,
    descripcion_pedido: 'El mouse sin pilas no funciona',
    descripcion_resolucion: '',
    estado_descripcion: 'Pendiente',
    articulo_descripcion: 'Mouse sin pilas',
    usuario_creador: 'Esteban Reniero',
    usuario_creador_email: 'estren@correo.com',
    area_solicitante: 'Legales'
  }
];

/**
 * Obtiene la lista de incidencias asignadas al Empleado de Sistemas autenticado.
 * Endpoint: GET /api/v1/sistemas/incidencias
 */
exports.getIncidenciasAsignadas = async (req, res) => {
  const idUsuarioAutenticado = req.usuario.id_usuario;

  try {
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
          WHEN inc.id_estado = 1 THEN 1 -- Pendiente primero
          WHEN inc.id_estado = 2 THEN 2 -- En Proceso segundo
          WHEN inc.id_estado = 3 THEN 3 -- Resuelta tercero
          ELSE 4                        -- Cancelada al final
        END,
        inc.prioridad ASC,
        inc.creado DESC
    `;

    const { rows } = await db.query(queryText, [idUsuarioAutenticado]);
    return res.status(200).json(rows);

  } catch (error) {
    console.warn('[FALLBACK SISTEMAS] Base de datos no disponible, utilizando datos mock:', error.message);
    const asignadas = mockIncidenciasSistemas.filter(i => i.asignado_a === idUsuarioAutenticado);
    return res.status(200).json(asignadas);
  }
};

/**
 * Finaliza una incidencia asignada al Empleado de Sistemas, cargando la resolución técnica.
 * Dispara el envío de notificación por correo electrónico al usuario solicitante.
 * Endpoint: PUT /api/v1/sistemas/incidencias/:id/finalizar
 */
exports.finalizarIncidencia = async (req, res) => {
  const { id } = req.params;
  const { descripcion_resolucion } = req.body;
  const idUsuarioAutenticado = req.usuario.id_usuario;
  const nombreTecnico = `${req.usuario.nombres} ${req.usuario.apellidos}`;

  // 1. Validar que se haya proporcionado la descripción de la resolución
  if (!descripcion_resolucion || typeof descripcion_resolucion !== 'string' || descripcion_resolucion.trim() === '') {
    return res.status(400).json({
      error: 'Campo obligatorio',
      mensaje: 'Debes proporcionar una descripción detallada de la resolución técnica para finalizar la incidencia.'
    });
  }

  const resolucionLimpia = descripcion_resolucion.trim();
  const id_estado_resuelta = 3; // 3 = Resuelta / Finalizada

  try {
    // 2. Buscar la incidencia con los datos del creador y del artículo
    const selectQuery = `
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
    const checkResult = await db.query(selectQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No encontrada',
        mensaje: `La incidencia #${id} no existe en el sistema.`
      });
    }

    const incidencia = checkResult.rows[0];

    // 3. Validar permisos: debe estar asignada al técnico autenticado (o ser Director rol 3)
    if (incidencia.asignado_a !== idUsuarioAutenticado && req.usuario.rol !== 3) {
      return res.status(403).json({
        error: 'Permiso denegado',
        mensaje: 'No tienes autorización para finalizar esta incidencia ya que no está asignada a tu cargo.'
      });
    }

    // 4. Validar estado actual
    if (incidencia.id_estado === 3) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'Esta incidencia ya se encuentra finalizada.'
      });
    }

    if (incidencia.id_estado === 4) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'No es posible finalizar una incidencia que ha sido cancelada.'
      });
    }

    // 5. Actualizar el estado de la incidencia a Resuelta (3) e incorporar la resolución técnica
    const updateQuery = `
      UPDATE public.incidencias
      SET id_estado = $1,
          descripcion_resolucion = $2
      WHERE id_incidencia = $3
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [id_estado_resuelta, resolucionLimpia, id]);
    const incidenciaActualizada = updateResult.rows[0];

    // 6. Registrar en el historial de trazabilidad de estados (incidencias_estados)
    const trazabilidadQuery = `
      INSERT INTO public.incidencias_estados (id_incidencia, id_estado)
      VALUES ($1, $2)
    `;
    await db.query(trazabilidadQuery, [id, id_estado_resuelta]);

    // 7. Disparar el envío de notificación por correo electrónico al solicitante
    const notificacionEmail = await emailService.notificarIncidenciaFinalizada({
      incidencia: incidenciaActualizada,
      descripcionResolucion: resolucionLimpia,
      tecnicoNombre: nombreTecnico,
      destinatarioEmail: incidencia.creador_email,
      destinatarioNombre: `${incidencia.creador_nombres} ${incidencia.creador_apellidos}`,
      articuloDescripcion: incidencia.articulo_descripcion
    });

    return res.status(200).json({
      mensaje: `Incidencia #${id} finalizada exitosamente`,
      incidencia: {
        ...incidenciaActualizada,
        estado_descripcion: 'Resuelta'
      },
      notificacion_email: notificacionEmail
    });

  } catch (error) {
    console.warn('[FALLBACK SISTEMAS] Error en DB, procediendo en modo simulación:', error.message);

    const incId = parseInt(id, 10);
    const incMock = mockIncidenciasSistemas.find(i => i.id_incidencia === incId);

    if (!incMock) {
      return res.status(404).json({
        error: 'No encontrada',
        mensaje: `La incidencia #${id} no existe.`
      });
    }

    if (incMock.asignado_a !== idUsuarioAutenticado && req.usuario.rol !== 3) {
      return res.status(403).json({
        error: 'Permiso denegado',
        mensaje: 'No tienes autorización para finalizar esta incidencia.'
      });
    }

    if (incMock.id_estado === 3) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'Esta incidencia ya se encuentra finalizada.'
      });
    }

    if (incMock.id_estado === 4) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'No es posible finalizar una incidencia cancelada.'
      });
    }

    incMock.id_estado = 3;
    incMock.estado_descripcion = 'Resuelta';
    incMock.descripcion_resolucion = resolucionLimpia;

    const notificacionEmail = await emailService.notificarIncidenciaFinalizada({
      incidencia: incMock,
      descripcionResolucion: resolucionLimpia,
      tecnicoNombre: nombreTecnico,
      destinatarioEmail: incMock.usuario_creador_email || 'usuario@correo.com',
      destinatarioNombre: incMock.usuario_creador || 'Solicitante',
      articuloDescripcion: incMock.articulo_descripcion
    });

    return res.status(200).json({
      mensaje: `Incidencia #${id} finalizada exitosamente (Modo simulación)`,
      incidencia: incMock,
      notificacion_email: notificacionEmail
    });
  }
};
