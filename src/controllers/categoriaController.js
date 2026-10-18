/**
 * ============================================================================
 * CONTROLADOR DE CATEGORÍAS (ENTIDADES BASE) - MUNICIPALIDAD DE CONCORDIA
 * Implementación completa del BREAD:
 * - Browse (Listar categorías con opción de incluir inactivas)
 * - Read (Obtener detalle de una categoría por ID)
 * - Edit (Actualizar descripción y estado de una categoría)
 * - Add (Crear una nueva categoría activa)
 * - Delete (Baja lógica / Soft delete cambiando activo = 0; NUNCA DELETE físico)
 * Incluye respaldo en memoria resiliente si PostgreSQL no está conectado.
 * ============================================================================
 */

const db = require('../config/db');

// Datos iniciales de respaldo en memoria (Modo resiliente)
let mockCategorias = [
  { id_categoria: 1, descripcion: 'Perifericos', activo: 1 },
  { id_categoria: 2, descripcion: 'Notebooks', activo: 1 },
  { id_categoria: 3, descripcion: 'PC Escritorio', activo: 1 },
  { id_categoria: 4, descripcion: 'CPU', activo: 1 },
  { id_categoria: 5, descripcion: 'Almacenamiento', activo: 1 },
  { id_categoria: 6, descripcion: 'Equipos de Red', activo: 1 },
  { id_categoria: 7, descripcion: 'nueva', activo: 0 }
];

/**
 * BROWSE: Obtiene el listado de categorías.
 * Por defecto devuelve solo las activas (activo = 1).
 * Si se especifica incluir_inactivos=true o todos=true, devuelve todas.
 */
exports.getCategorias = async (req, res) => {
  const { incluir_inactivos, todos, buscar } = req.query;
  const traerTodos = incluir_inactivos === 'true' || incluir_inactivos === '1' || todos === 'true' || todos === '1';
  const busqueda = buscar ? `%${buscar.trim()}%` : null;

  try {
    let queryText = `
      SELECT id_categoria, descripcion, activo
      FROM public.categorias
      WHERE 1=1
    `;
    const params = [];

    if (!traerTodos) {
      params.push(1);
      queryText += ` AND activo = $${params.length}`;
    }

    if (busqueda) {
      params.push(busqueda);
      queryText += ` AND descripcion ILIKE $${params.length}`;
    }

    queryText += ` ORDER BY id_categoria ASC`;

    const result = await db.query(queryText, params);
    return res.status(200).json(result.rows);

  } catch (error) {
    // Modo resiliente en memoria
    let filtradas = [...mockCategorias];
    if (!traerTodos) {
      filtradas = filtradas.filter(c => c.activo === 1);
    }
    if (buscar) {
      const q = buscar.toLowerCase().trim();
      filtradas = filtradas.filter(c => c.descripcion.toLowerCase().includes(q));
    }
    return res.status(200).json(filtradas);
  }
};

/**
 * READ: Obtiene los detalles de una categoría por su ID.
 */
exports.getCategoriaById = async (req, res) => {
  const { id } = req.params;
  const idCat = parseInt(id, 10);

  if (isNaN(idCat)) {
    return res.status(400).json({ error: true, mensaje: 'El ID de la categoría debe ser un número entero' });
  }

  try {
    const queryText = `
      SELECT id_categoria, descripcion, activo
      FROM public.categorias
      WHERE id_categoria = $1
    `;
    const result = await db.query(queryText, [idCat]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: true, mensaje: `Categoría con ID ${idCat} no encontrada` });
    }

    const categoria = result.rows[0];
    return res.status(200).json({
      ...categoria,
      categoria
    });

  } catch (error) {
    const cat = mockCategorias.find(c => c.id_categoria === idCat);
    if (!cat) {
      return res.status(404).json({ error: true, mensaje: `Categoría con ID ${idCat} no encontrada` });
    }
    return res.status(200).json({
      ...cat,
      categoria: cat
    });
  }
};

/**
 * ADD: Crea una nueva categoría en el sistema.
 * Por defecto se crea en estado activo (activo = 1).
 */
exports.crearCategoria = async (req, res) => {
  const { descripcion } = req.body;

  if (!descripcion || typeof descripcion !== 'string' || !descripcion.trim()) {
    return res.status(400).json({
      error: true,
      mensaje: 'La descripción de la categoría es obligatoria y no puede estar vacía'
    });
  }

  const descripcionLimpia = descripcion.trim();

  try {
    const insertQuery = `
      INSERT INTO public.categorias (descripcion, activo)
      VALUES ($1, 1)
      RETURNING id_categoria, descripcion, activo
    `;
    const result = await db.query(insertQuery, [descripcionLimpia]);
    const nuevaCategoria = result.rows[0];

    return res.status(201).json({
      mensaje: 'Categoría creada exitosamente',
      categoria: nuevaCategoria,
      ...nuevaCategoria
    });

  } catch (error) {
    const nuevoId = mockCategorias.length > 0
      ? Math.max(...mockCategorias.map(c => c.id_categoria)) + 1
      : 1;

    const nueva = {
      id_categoria: nuevoId,
      descripcion: descripcionLimpia,
      activo: 1
    };
    mockCategorias.push(nueva);

    return res.status(201).json({
      mensaje: 'Categoría creada exitosamente (Modo simulación)',
      categoria: nueva,
      ...nueva
    });
  }
};

/**
 * EDIT: Modifica los datos de una categoría existente.
 */
exports.actualizarCategoria = async (req, res) => {
  const { id } = req.params;
  const idCat = parseInt(id, 10);
  const { descripcion, activo } = req.body;

  if (isNaN(idCat)) {
    return res.status(400).json({ error: true, mensaje: 'El ID de la categoría debe ser un número entero' });
  }

  if (descripcion !== undefined && (typeof descripcion !== 'string' || !descripcion.trim())) {
    return res.status(400).json({ error: true, mensaje: 'La descripción no puede estar vacía' });
  }

  const nuevaDescripcion = descripcion !== undefined ? descripcion.trim() : null;
  const nuevoActivo = activo !== undefined ? parseInt(activo, 10) : null;

  try {
    // Verificar existencia previa
    const checkQuery = `SELECT * FROM public.categorias WHERE id_categoria = $1`;
    const checkResult = await db.query(checkQuery, [idCat]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: true, mensaje: `Categoría con ID ${idCat} no encontrada` });
    }

    const updateQuery = `
      UPDATE public.categorias
      SET descripcion = COALESCE($1, descripcion),
          activo = COALESCE($2, activo)
      WHERE id_categoria = $3
      RETURNING id_categoria, descripcion, activo
    `;
    const result = await db.query(updateQuery, [nuevaDescripcion, nuevoActivo, idCat]);
    const categoriaActualizada = result.rows[0];

    return res.status(200).json({
      mensaje: 'Categoría actualizada exitosamente',
      categoria: categoriaActualizada,
      ...categoriaActualizada
    });

  } catch (error) {
    const cat = mockCategorias.find(c => c.id_categoria === idCat);
    if (!cat) {
      return res.status(404).json({ error: true, mensaje: `Categoría con ID ${idCat} no encontrada` });
    }

    if (nuevaDescripcion !== null) cat.descripcion = nuevaDescripcion;
    if (nuevoActivo !== null) cat.activo = nuevoActivo;

    return res.status(200).json({
      mensaje: 'Categoría actualizada exitosamente (Modo simulación)',
      categoria: cat,
      ...cat
    });
  }
};

/**
 * DELETE: Baja lógica (SOFT DELETE) de una categoría.
 * NO REALIZA BORRADO FÍSICO (DELETE FROM).
 * Actualiza el campo activo a 0 para indicar que el registro no está activo.
 */
exports.eliminarCategoria = async (req, res) => {
  const { id } = req.params;
  const idCat = parseInt(id, 10);

  if (isNaN(idCat)) {
    return res.status(400).json({ error: true, mensaje: 'El ID de la categoría debe ser un número entero' });
  }

  try {
    // Verificar existencia
    const checkQuery = `SELECT * FROM public.categorias WHERE id_categoria = $1`;
    const checkResult = await db.query(checkQuery, [idCat]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: true, mensaje: `Categoría con ID ${idCat} no encontrada` });
    }

    // SOFT DELETE: Establecer activo = 0 (Baja Lógica)
    const softDeleteQuery = `
      UPDATE public.categorias
      SET activo = 0
      WHERE id_categoria = $1
      RETURNING id_categoria, descripcion, activo
    `;
    const result = await db.query(softDeleteQuery, [idCat]);
    const categoriaEliminada = result.rows[0];

    return res.status(200).json({
      mensaje: 'Categoría dada de baja correctamente (borrado lógico)',
      categoria: categoriaEliminada,
      ...categoriaEliminada
    });

  } catch (error) {
    const cat = mockCategorias.find(c => c.id_categoria === idCat);
    if (!cat) {
      return res.status(404).json({ error: true, mensaje: `Categoría con ID ${idCat} no encontrada` });
    }

    cat.activo = 0;
    return res.status(200).json({
      mensaje: 'Categoría dada de baja correctamente (borrado lógico, simulación)',
      categoria: cat,
      ...cat
    });
  }
};

/**
 * REACTIVAR: Reactiva una categoría que fue dada de baja previamente.
 * Actualiza el campo activo a 1.
 */
exports.reactivarCategoria = async (req, res) => {
  const { id } = req.params;
  const idCat = parseInt(id, 10);

  if (isNaN(idCat)) {
    return res.status(400).json({ error: true, mensaje: 'El ID de la categoría debe ser un número entero' });
  }

  try {
    const checkQuery = `SELECT * FROM public.categorias WHERE id_categoria = $1`;
    const checkResult = await db.query(checkQuery, [idCat]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: true, mensaje: `Categoría con ID ${idCat} no encontrada` });
    }

    const reactivarQuery = `
      UPDATE public.categorias
      SET activo = 1
      WHERE id_categoria = $1
      RETURNING id_categoria, descripcion, activo
    `;
    const result = await db.query(reactivarQuery, [idCat]);
    const categoriaReactivada = result.rows[0];

    return res.status(200).json({
      mensaje: 'Categoría reactivada exitosamente',
      categoria: categoriaReactivada,
      ...categoriaReactivada
    });

  } catch (error) {
    const cat = mockCategorias.find(c => c.id_categoria === idCat);
    if (!cat) {
      return res.status(404).json({ error: true, mensaje: `Categoría con ID ${idCat} no encontrada` });
    }

    cat.activo = 1;
    return res.status(200).json({
      mensaje: 'Categoría reactivada exitosamente (Modo simulación)',
      categoria: cat,
      ...cat
    });
  }
};
