/**
 * ============================================================================
 * SERVICIO DE ÁREAS
 * Lógica de negocio para áreas municipales
 * ============================================================================
 */

import areaRepository, { AREAS_SORT_MAP } from '../repositories/areaRepository.js';
import { parsePagination, parseSort, buildPaginatedResponse } from '../utils/pagination.js';

class AreaService {
  async getAreas(query = {}) {
    const { buscar, search, q } = query;
    const textoBusqueda = buscar || search || q || null;
    const { page, limit, offset } = parsePagination(query, 50); // Catálogo con límite holgado por omisión
    const { sortSql } = parseSort(query, AREAS_SORT_MAP, 'id_area', 'ASC');

    const { rows, total } = await areaRepository.findAllPaginated({
      buscar: textoBusqueda,
      limit,
      offset,
      sortSql
    });

    return buildPaginatedResponse(rows, total, page, limit);
  }
}

export default new AreaService();
