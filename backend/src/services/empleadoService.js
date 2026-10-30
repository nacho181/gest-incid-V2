/**
 * ============================================================================
 * SERVICIO DE EMPLEADOS MUNICIPALES
 * Lógica de negocio para consulta de empleados, artículos e incidencias
 * ============================================================================
 */

import usuarioRepository from '../repositories/usuarioRepository.js';
import articuloRepository from '../repositories/articuloRepository.js';
import incidenciaRepository from '../repositories/incidenciaRepository.js';
import emailService from '../utils/emailService.js';
import db from '../config/db.js';

class EmpleadoService {
  async getEmpleados() {
    return await usuarioRepository.findEmpleados();
  }

  async getArticulos() {
    return await articuloRepository.findAll({ traerTodos: false });
  }

  async crearIncidencia({ id_articulo, prioridad, descripcion_pedido, idUsuario }) {
    if (!id_articulo || !descripcion_pedido) {
      const error = new Error('Faltan campos obligatorios: id_articulo y descripcion_pedido');
      error.statusCode = 400;
      throw error;
    }

    const id_estado_inicial = 1; // Pendiente
    let client;

    try {
      client = await db.pool.connect();
      await client.query('BEGIN');

      const art = await client.query(
        'SELECT 1 FROM public.articulos WHERE id_articulo = $1 AND activo = 1',
        [id_articulo]
      );
      if (art.rows.length === 0) {
        const error = new Error('El artículo no existe o está inactivo');
        error.statusCode = 400;
        throw error;
      }

      const insert = await client.query(
        `INSERT INTO public.incidencias (id_articulo, id_estado, creado_por, asignado_a, prioridad, descripcion_pedido, descripcion_resolucion)
         VALUES ($1, $2, $3, $4, $5, $6, '') RETURNING *`,
        [id_articulo, id_estado_inicial, idUsuario, null, prioridad || 1, descripcion_pedido]
      );
      const nueva = insert.rows[0];

      await client.query(
        'INSERT INTO public.incidencias_estados (id_incidencia, id_estado) VALUES ($1, $2)',
        [nueva.id_incidencia, id_estado_inicial]
      );

      await client.query('COMMIT');
      return nueva;

    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async getMisIncidencias(idUsuario) {
    return await incidenciaRepository.findByUsuarioCreador(idUsuario);
  }

  async cancelarIncidencia(idIncidencia, idUsuario) {
    const id_estado_cancelado = 4;
    let client;

    try {
      client = await db.pool.connect();
      await client.query('BEGIN');

      const checkResult = await client.query(
        'SELECT * FROM public.incidencias WHERE id_incidencia = $1 FOR UPDATE',
        [idIncidencia]
      );

      if (checkResult.rows.length === 0) {
        const error = new Error('Incidencia no encontrada');
        error.statusCode = 404;
        throw error;
      }

      const incidencia = checkResult.rows[0];

      if (incidencia.creado_por !== idUsuario) {
        const error = new Error('No tiene permiso para cancelar esta incidencia');
        error.statusCode = 403;
        throw error;
      }

      if (incidencia.id_estado !== 1) {
        const error = new Error('Solo se pueden cancelar incidencias Pendientes');
        error.statusCode = 400;
        throw error;
      }

      const updateResult = await client.query(
        'UPDATE public.incidencias SET id_estado = $1 WHERE id_incidencia = $2 RETURNING *',
        [id_estado_cancelado, idIncidencia]
      );
      await client.query(
        'INSERT INTO public.incidencias_estados (id_incidencia, id_estado) VALUES ($1, $2)',
        [idIncidencia, id_estado_cancelado]
      );

      await client.query('COMMIT');

      // Enviar notificación de email fuera de la transacción
      try {
        const uRes = await db.query(
          `SELECT u.nombres, u.apellidos, u.usuario AS email, art.descripcion AS articulo_desc
           FROM public.usuarios u
           JOIN public.incidencias inc ON inc.creado_por = u.id_usuario
           JOIN public.articulos art ON inc.id_articulo = art.id_articulo
           WHERE inc.id_incidencia = $1`,
          [idIncidencia]
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
        console.error('[EMAIL ERROR]:', mailErr.message);
      }

      return updateResult.rows[0];

    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      if (client) client.release();
    }
  }
}

export default new EmpleadoService();
