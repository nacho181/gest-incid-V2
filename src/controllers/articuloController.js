/**
 * ============================================================================
 * CONTROLADOR DE ARTÍCULOS (ENTIDADES BASE) - MUNICIPALIDAD DE CONCORDIA
 * Implementación completa del BREAD:
 * - Browse (Listar artículos con relaciones de Área y Categoría, filtro activo)
 * - Read (Obtener detalle de un artículo por ID con sus relaciones)
 * - Edit (Actualizar descripción, área, categoría o estado de un artículo)
 * - Add (Crear un nuevo artículo activo)
 * - Delete (Baja lógica / Soft delete cambiando activo = 0; NUNCA DELETE físico)
 * Incluye respaldo en memoria resiliente si PostgreSQL no está conectado.
 * ============================================================================
 */

const db = require('../config/db');

// Datos iniciales de respaldo en memoria (Modo resiliente)
let mockArticulos = [
  { id_articulo: 1, id_area: 1, id_categoria: 1, descripcion: 'Mouse sin pilas', activo: 1, area_descripcion: 'Legales', categoria_descripcion: 'Perifericos' },
  { id_articulo: 2, id_area: 1, id_categoria: 1, descripcion: 'Monitor LG', activo: 1, area_descripcion: 'Legales', categoria_descripcion: 'Perifericos' },
  { id_articulo: 3, id_area: 1, id_categoria: 2, descripcion: 'Notebook HP', activo: 1, area_descripcion: 'Legales', categoria_descripcion: 'Notebooks' }
];

let mockCategoriasRef = [
  { id_categoria: 1, descripcion: 'Perifericos' },
  { id_categoria: 2, descripcion: 'Notebooks' },
  { id_categoria: 3, descripcion: 'PC Escritorio' },
  { id_categoria: 4, descripcion: 'CPU' },
  { id_categoria: 5, descripcion: 'Almacenamiento' },
  { id_categoria: 6, descripcion: 'Equipos de Red' }
];

let mockAreasRef = [
  { id_area: 1, descripcion: 'Legales' },
  { id_area: 2, descripcion: 'Personal' },
  { id_area: 3, descripcion: 'Sistemas' },
  { id_area: 4, descripcion: 'Hacienda' },
  { id_area: 5, descripcion: 'Finanzas' },
  { id_area: 6, descripcion: 'Salud y Accion Social' }
];

/**
 * BROWSE: Obtiene el listado de artículos.
 * Por defecto devuelve solo los activos (art.activo = 1).
 * Soporta filtros: incluir_inactivos, id_categoria, id_area, buscar.
 */
exports.getArticulos = async (req, res) => {
  const { incluir_inactivos, todos, id_categoria, id_area, buscar } = req.query;
  const traerTodos = incluir_inactivos === 'true' || incluir_inactivos === '1' || todos === 'true' || todos === '1';

  try {
    let queryText = `
      SELECT art.id_articulo, art.id_area, art.id_categoria, art.descripcion, art.activo,
             cat.descripcion AS categoria_descripcion,
             ar.descripcion AS area_descripcion
      FROM public.articulos art
      LEFT JOIN public.categorias cat ON art.id_categoria = cat.id_categoria
      LEFT JOIN public.areas ar ON art.id_area = ar.id_area
      WHERE 1=1
    `;
    const params = [];

    if (!traerTodos) {
      params.push(1);
      queryText += ` AND art.activo = $${params.length}`;
    }

    if (id_categoria) {
      params.push(parseInt(id_categoria, 10));
      queryText += ` AND art.id_categoria = $${params.length}`;
    }

    if (id_area) {
      params.push(parseInt(id_area, 10));
      queryText += ` AND art.id_area = $${params.length}`;
    }

    if (buscar) {
      params.push(`%${buscar.trim()}%`);
      queryText += ` AND art.descripcion ILIKE $${params.length}`;
    }

    queryText += ` ORDER BY art.id_articulo ASC`;

    const result = await db.query(queryText, params);
    return res.status(200).json(result.rows);

  } catch (error) {
    // Modo resiliente en memoria
    let filtrados = [...mockArticulos];

    if (!traerTodos) {
      filtrados = filtrados.filter(a => a.activo === 1);
    }
    if (id_categoria) {
      filtrados = filtrados.filter(a => a.id_categoria === parseInt(id_categoria, 10));
    }
    if (id_area) {
      filtrados = filtrados.filter(a => a.id_area === parseInt(id_area, 10));
    }
    if (buscar) {
      const q = buscar.toLowerCase().trim();
      filtrados = filtrados.filter(a =>
        a.descripcion.toLowerCase().includes(q) ||
        (a.categoria_descripcion && a.categoria_descripcion.toLowerCase().includes(q)) ||
        (a.area_descripcion && a.area_descripcion.toLowerCase().includes(q))
      );
    }

    return res.status(200).json(filtrados);
  }
};

/**
 * READ: Obtiene los detalles de un artículo por su ID.
 */
exports.getArticuloById = async (req, res) => {
  const { id } = req.params;
  const idArt = parseInt(id, 10);

  if (isNaN(idArt)) {
    return res.status(400).json({ error: true, mensaje: 'El ID del artículo debe ser un número entero' });
  }

  try {
    const queryText = `
      SELECT art.id_articulo, art.id_area, art.id_categoria, art.descripcion, art.activo,
             cat.descripcion AS categoria_descripcion,
             ar.descripcion AS area_descripcion
      FROM public.articulos art
      LEFT JOIN public.categorias cat ON art.id_categoria = cat.id_categoria
      LEFT JOIN public.areas ar ON art.id_area = ar.id_area
      WHERE art.id_articulo = $1
    `;
    const result = await db.query(queryText, [idArt]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: true, mensaje: `Artículo con ID ${idArt} no encontrado` });
    }

    const articulo = result.rows[0];
    return res.status(200).json({
      ...articulo,
      articulo
    });

  } catch (error) {
    const art = mockArticulos.find(a => a.id_articulo === idArt);
    if (!art) {
      return res.status(404).json({ error: true, mensaje: `Artículo con ID ${idArt} no encontrado` });
    }
    return res.status(200).json({
      ...art,
      articulo: art
    });
  }
};

/**
 * ADD: Crea un nuevo artículo en el sistema.
 * Valida descripción, id_area e id_categoria.
 * Se crea activo por defecto (activo = 1).
 */
exports.crearArticulo = async (req, res) => {
  const { descripcion, id_categoria, id_area } = req.body;

  if (!descripcion || typeof descripcion !== 'string' || !descripcion.trim()) {
    return res.status(400).json({
      error: true,
      mensaje: 'La descripción del artículo es obligatoria y no puede estar vacía'
    });
  }

  const idCat = parseInt(id_categoria, 10);
  const idAr = parseInt(id_area, 10);

  if (isNaN(idCat) || idCat <= 0) {
    return res.status(400).json({
      error: true,
      mensaje: 'El campo id_categoria es obligatorio y debe ser un ID válido'
    });
  }

  if (isNaN(idAr) || idAr <= 0) {
    return res.status(400).json({
      error: true,
      mensaje: 'El campo id_area es obligatorio y debe ser un ID válido'
    });
  }

  const descripcionLimpia = descripcion.trim();

  try {
    // Validar existencia de categoría
    const catCheck = await db.query('SELECT descripcion FROM public.categorias WHERE id_categoria = $1', [idCat]);
    if (catCheck.rows.length === 0) {
      return res.status(400).json({ error: true, mensaje: `La categoría con ID ${idCat} no existe` });
    }

    // Validar existencia de área
    const areaCheck = await db.query('SELECT descripcion FROM public.areas WHERE id_area = $1', [idAr]);
    if (areaCheck.rows.length === 0) {
      return res.status(400).json({ error: true, mensaje: `El área con ID ${idAr} no existe` });
    }

    const insertQuery = `
      INSERT INTO public.articulos (id_area, id_categoria, descripcion, activo)
      VALUES ($1, $2, $3, 1)
      RETURNING id_articulo, id_area, id_categoria, descripcion, activo
    `;
    const result = await db.query(insertQuery, [idAr, idCat, descripcionLimpia]);
    const nuevoArticulo = result.rows[0];

    // Adjuntar descripciones
    nuevoArticulo.categoria_descripcion = catCheck.rows[0].descripcion;
    nuevoArticulo.area_descripcion = areaCheck.rows[0].descripcion;

    return res.status(201).json({
      mensaje: 'Artículo creado exitosamente',
      articulo: nuevoArticulo,
      ...nuevoArticulo
    });

  } catch (error) {
    const nuevoId = mockArticulos.length > 0
      ? Math.max(...mockArticulos.map(a => a.id_articulo)) + 1
      : 1;

    const catObj = mockCategoriasRef.find(c => c.id_categoria === idCat);
    const areaObj = mockAreasRef.find(a => a.id_area === idAr);

    const nuevo = {
      id_articulo: nuevoId,
      id_area: idAr,
      id_categoria: idCat,
      descripcion: descripcionLimpia,
      activo: 1,
      categoria_descripcion: catObj ? catObj.descripcion : `Categoría #${idCat}`,
      area_descripcion: areaObj ? areaObj.descripcion : `Área #${idAr}`
    };
    mockArticulos.push(nuevo);

    return res.status(201).json({
      mensaje: 'Artículo creado exitosamente (Modo simulación)',
      articulo: nuevo,
      ...nuevo
    });
  }
};

/**
 * EDIT: Modifica los datos de un artículo existente.
 */
exports.actualizarArticulo = async (req, res) => {
  const { id } = req.params;
  const idArt = parseInt(id, 10);
  const { descripcion, id_categoria, id_area, activo } = req.body;

  if (isNaN(idArt)) {
    return res.status(400).json({ error: true, mensaje: 'El ID del artículo debe ser un número entero' });
  }

  if (descripcion !== undefined && (typeof descripcion !== 'string' || !descripcion.trim())) {
    return res.status(400).json({ error: true, mensaje: 'La descripción no puede estar vacía' });
  }

  const nuevaDescripcion = descripcion !== undefined ? descripcion.trim() : null;
  const nuevoIdCat = id_categoria !== undefined ? parseInt(id_categoria, 10) : null;
  const nuevoIdAr = id_area !== undefined ? parseInt(id_area, 10) : null;
  const nuevoActivo = activo !== undefined ? parseInt(activo, 10) : null;

  try {
    // Verificar existencia del artículo
    const checkQuery = `SELECT * FROM public.articulos WHERE id_articulo = $1`;
    const checkResult = await db.query(checkQuery, [idArt]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: true, mensaje: `Artículo con ID ${idArt} no encontrado` });
    }

    // Si se envía id_categoria, verificar existencia
    if (nuevoIdCat !== null) {
      const catCheck = await db.query('SELECT 1 FROM public.categorias WHERE id_categoria = $1', [nuevoIdCat]);
      if (catCheck.rows.length === 0) {
        return res.status(400).json({ error: true, mensaje: `La categoría con ID ${nuevoIdCat} no existe` });
      }
    }

    // Si se envía id_area, verificar existencia
    if (nuevoIdAr !== null) {
      const areaCheck = await db.query('SELECT 1 FROM public.areas WHERE id_area = $1', [nuevoIdAr]);
      if (areaCheck.rows.length === 0) {
        return res.status(400).json({ error: true, mensaje: `El área con ID ${nuevoIdAr} no existe` });
      }
    }

    const updateQuery = `
      UPDATE public.articulos
      SET descripcion = COALESCE($1, descripcion),
          id_categoria = COALESCE($2, id_categoria),
          id_area = COALESCE($3, id_area),
          activo = COALESCE($4, activo)
      WHERE id_articulo = $5
      RETURNING id_articulo, id_area, id_categoria, descripcion, activo
    `;
    const result = await db.query(updateQuery, [nuevaDescripcion, nuevoIdCat, nuevoIdAr, nuevoActivo, idArt]);
    const articuloActualizado = result.rows[0];

    // Obtener nombres de categoría y área
    const fullQuery = `
      SELECT cat.descripcion AS categoria_descripcion, ar.descripcion AS area_descripcion
      FROM public.articulos art
      LEFT JOIN public.categorias cat ON art.id_categoria = cat.id_categoria
      LEFT JOIN public.areas ar ON art.id_area = ar.id_area
      WHERE art.id_articulo = $1
    `;
    const fullRes = await db.query(fullQuery, [idArt]);
    if (fullRes.rows.length > 0) {
      articuloActualizado.categoria_descripcion = fullRes.rows[0].categoria_descripcion;
      articuloActualizado.area_descripcion = fullRes.rows[0].area_descripcion;
    }

    return res.status(200).json({
      mensaje: 'Artículo actualizado exitosamente',
      articulo: articuloActualizado,
      ...articuloActualizado
    });

  } catch (error) {
    const art = mockArticulos.find(a => a.id_articulo === idArt);
    if (!art) {
      return res.status(404).json({ error: true, mensaje: `Artículo con ID ${idArt} no encontrado` });
    }

    if (nuevaDescripcion !== null) art.descripcion = nuevaDescripcion;
    if (nuevoIdCat !== null) {
      art.id_categoria = nuevoIdCat;
      const catObj = mockCategoriasRef.find(c => c.id_categoria === nuevoIdCat);
      art.categoria_descripcion = catObj ? catObj.descripcion : `Categoría #${nuevoIdCat}`;
    }
    if (nuevoIdAr !== null) {
      art.id_area = nuevoIdAr;
      const areaObj = mockAreasRef.find(a => a.id_area === nuevoIdAr);
      art.area_descripcion = areaObj ? areaObj.descripcion : `Área #${nuevoIdAr}`;
    }
    if (nuevoActivo !== null) art.activo = nuevoActivo;

    return res.status(200).json({
      mensaje: 'Artículo actualizado exitosamente (Modo simulación)',
      articulo: art,
      ...art
    });
  }
};

/**
 * DELETE: Baja lógica (SOFT DELETE) de un artículo.
 * NO REALIZA BORRADO FÍSICO (DELETE FROM).
 * Actualiza el campo activo a 0 para indicar que el registro no está activo.
 */
exports.eliminarArticulo = async (req, res) => {
  const { id } = req.params;
  const idArt = parseInt(id, 10);

  if (isNaN(idArt)) {
    return res.status(400).json({ error: true, mensaje: 'El ID del artículo debe ser un número entero' });
  }

  try {
    // Verificar existencia previa
    const checkQuery = `SELECT * FROM public.articulos WHERE id_articulo = $1`;
    const checkResult = await db.query(checkQuery, [idArt]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: true, mensaje: `Artículo con ID ${idArt} no encontrado` });
    }

    // SOFT DELETE: Establecer activo = 0 (Baja Lógica)
    const softDeleteQuery = `
      UPDATE public.articulos
      SET activo = 0
      WHERE id_articulo = $1
      RETURNING id_articulo, id_area, id_categoria, descripcion, activo
    `;
    const result = await db.query(softDeleteQuery, [idArt]);
    const articuloEliminado = result.rows[0];

    return res.status(200).json({
      mensaje: 'Artículo dado de baja correctamente (borrado lógico)',
      articulo: articuloEliminado,
      ...articuloEliminado
    });

  } catch (error) {
    const art = mockArticulos.find(a => a.id_articulo === idArt);
    if (!art) {
      return res.status(404).json({ error: true, mensaje: `Artículo con ID ${idArt} no encontrado` });
    }

    art.activo = 0;
    return res.status(200).json({
      mensaje: 'Artículo dado de baja correctamente (borrado lógico, simulación)',
      articulo: art,
      ...art
    });
  }
};

/**
 * REACTIVAR: Reactiva un artículo que fue dado de baja previamente.
 * Actualiza el campo activo a 1.
 */
exports.reactivarArticulo = async (req, res) => {
  const { id } = req.params;
  const idArt = parseInt(id, 10);

  if (isNaN(idArt)) {
    return res.status(400).json({ error: true, mensaje: 'El ID del artículo debe ser un número entero' });
  }

  try {
    const checkQuery = `SELECT * FROM public.articulos WHERE id_articulo = $1`;
    const checkResult = await db.query(checkQuery, [idArt]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: true, mensaje: `Artículo con ID ${idArt} no encontrado` });
    }

    const reactivarQuery = `
      UPDATE public.articulos
      SET activo = 1
      WHERE id_articulo = $1
      RETURNING id_articulo, id_area, id_categoria, descripcion, activo
    `;
    const result = await db.query(reactivarQuery, [idArt]);
    const articuloReactivado = result.rows[0];

    return res.status(200).json({
      mensaje: 'Artículo reactivado exitosamente',
      articulo: articuloReactivado,
      ...articuloReactivado
    });

  } catch (error) {
    const art = mockArticulos.find(a => a.id_articulo === idArt);
    if (!art) {
      return res.status(404).json({ error: true, mensaje: `Artículo con ID ${idArt} no encontrado` });
    }

    art.activo = 1;
    return res.status(200).json({
      mensaje: 'Artículo reactivado exitosamente (Modo simulación)',
      articulo: art,
      ...art
    });
  }
};
