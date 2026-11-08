import incidenciaRepository, { INCIDENCIAS_SORT_MAP } from '../repositories/incidenciaRepository.js';
import empleadoService from './empleadoService.js';
import directorService from './directorService.js';
import sistemasService from './sistemasService.js';
import ROLES from '../utils/roles.js';
import { parsePagination, parseSort, buildPaginatedResponse } from '../utils/pagination.js';

function error(mensaje, statusCode) {
  const e = new Error(mensaje);
  e.statusCode = statusCode;
  return e;
}

class IncidenciaService {
  async listar(usuario, query = {}) {
    const { page, limit, offset } = parsePagination(query, 10);
    const { id_estado, prioridad, id_articulo, id_area, asignado_a, buscar, search, q } = query;
    const textoBusqueda = buscar || search || q || null;

    let creado_por_filtro = null;
    let asignado_a_filtro = null;
    let sortSql = null;

    switch (usuario.rol) {
      case ROLES.DIRECTOR:
        // El Director puede ver todas y filtrar opcionalmente por asignado_a o creador
        if (asignado_a !== undefined && asignado_a !== '') {
          asignado_a_filtro = asignado_a;
        }
        if (query.creado_por !== undefined && query.creado_por !== '') {
          creado_por_filtro = query.creado_por;
        }
        sortSql = parseSort(query, INCIDENCIAS_SORT_MAP, 'creado', 'DESC').sortSql;
        break;

      case ROLES.SISTEMAS:
        // El técnico de Sistemas solo ve las incidencias asignadas a él
        asignado_a_filtro = usuario.id_usuario;
        if (query.order_by) {
          sortSql = parseSort(query, INCIDENCIAS_SORT_MAP, 'creado', 'DESC').sortSql;
        } else {
          // Orden de trabajo prioritario para el personal técnico
          sortSql = `
            CASE
              WHEN inc.id_estado = 1 THEN 1
              WHEN inc.id_estado = 2 THEN 2
              WHEN inc.id_estado = 3 THEN 3
              ELSE 4
            END ASC,
            inc.prioridad ASC,
            inc.creado DESC
          `;
        }
        break;

      default:
        // Empleado municipal: solo ve las incidencias creadas por él
        creado_por_filtro = usuario.id_usuario;
        sortSql = parseSort(query, INCIDENCIAS_SORT_MAP, 'creado', 'DESC').sortSql;
        break;
    }

    const { rows, total } = await incidenciaRepository.findAllPaginated({
      creado_por: creado_por_filtro,
      asignado_a: asignado_a_filtro,
      id_estado: id_estado || null,
      prioridad: prioridad || null,
      id_articulo: id_articulo || null,
      id_area: id_area || null,
      buscar: textoBusqueda,
      limit,
      offset,
      sortSql
    });

    return buildPaginatedResponse(rows, total, page, limit);
  }

  async crear({ id_articulo, prioridad, descripcion_pedido }, usuario) {
    return await empleadoService.crearIncidencia({
      id_articulo,
      prioridad,
      descripcion_pedido,
      idUsuario: usuario.id_usuario,
      asignado_a: 0 // usuario comodín "Sin Asignar"
    });
  }

  async actualizar(id, cambios, usuario) {
    // Asignar técnico (solo Director)
    if (cambios.asignado_a !== undefined) {
      if (usuario.rol !== ROLES.DIRECTOR) {
        throw error('Solo el Director puede asignar incidencias', 403);
      }
      const incidencia = await directorService.asignarIncidencia(id, cambios.asignado_a);
      return { mensaje: 'Incidencia asignada correctamente', incidencia };
    }

    // Cancelar: el Director cancela cualquiera Pendiente; el resto, solo las propias
    if (cambios.id_estado === 4) {
      const incidencia = usuario.rol === ROLES.DIRECTOR
        ? await directorService.cancelarIncidenciaDirector(id)
        : await empleadoService.cancelarIncidencia(id, usuario.id_usuario);
      return { mensaje: 'Incidencia cancelada correctamente', incidencia };
    }

    // Finalizar (Sistemas o Director)
    if (cambios.id_estado === 3) {
      if (usuario.rol === ROLES.MUNICIPAL) {
        throw error('No posees los permisos necesarios para finalizar incidencias', 403);
      }
      const resultado = await sistemasService.finalizarIncidencia({
        idIncidencia: id,
        descripcion_resolucion: cambios.descripcion_resolucion,
        usuarioAutenticado: usuario
      });
      return {
        mensaje: `Incidencia #${id} finalizada exitosamente`,
        incidencia: resultado.incidencia,
        notificacion_email: resultado.notificacion_email
      };
    }

    throw error('El cambio solicitado no está soportado', 400);
  }
}

export default new IncidenciaService();