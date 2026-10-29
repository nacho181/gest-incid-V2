/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO CATEGORÍAS (ENTIDADES BASE)
 * Endpoints REST para BREAD de Categorías:
 * - GET    /api/v1/categorias            (Browse)
 * - GET    /api/v1/categorias/:id        (Read)
 * - POST   /api/v1/categorias            (Add)
 * - PUT    /api/v1/categorias/:id        (Edit)
 * - PATCH  /api/v1/categorias/:id        (Edit)
 * - DELETE /api/v1/categorias/:id        (Delete - Borrado Lógico / Soft Delete)
 * - PUT    /api/v1/categorias/:id/reactivar (Reactivación lógica)
 * ============================================================================
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const { verificarToken, autorizarRol } = require('../middlewares/authMiddleware');
const ROLES = require('../utils/roles');

// Middleware estricto para validar token JWT y verificar roles del Área de Sistemas
const verificarAdmin = [verificarToken, autorizarRol(ROLES.SISTEMAS)];

// Middleware genérico para capturar errores de express-validator
const validarCampos = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }
  next();
};


/**
 * @openapi
 * /api/v1/categorias:
 *   get:
 *     tags: [Categorías]
 *     summary: Obtener todas las categorías (Browse)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorías
 *   post:
 *     tags: [Categorías]
 *     summary: Crear una nueva categoría (Add)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoría creada
 * 
 * /api/v1/categorias/{id}:
 *   get:
 *     tags: [Categorías]
 *     summary: Obtener detalle de una categoría (Read)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle de la categoría
 *   put:
 *     tags: [Categorías]
 *     summary: Actualizar una categoría (Edit)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *   delete:
 *     tags: [Categorías]
 *     summary: Baja lógica de una categoría (Soft Delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Categoría dada de baja
 */

// BROWSE: Listar categorías
router.get('/', verificarAdmin, categoriaController.getCategorias);

// READ: Obtener detalle de una categoría por ID
router.get('/:id', verificarAdmin, categoriaController.getCategoriaById);

// ADD: Crear una nueva categoría con validación estricta
router.post(
  '/',
  verificarAdmin,
  [
    body('descripcion')
      .trim()
      .notEmpty().withMessage('La descripción es obligatoria')
      .isLength({ min: 3, max: 255 }).withMessage('La descripción debe tener entre 3 y 255 caracteres')
      .escape(), // Sanitización contra inyección de código (XSS)
    validarCampos
  ],
  categoriaController.crearCategoria
);

// EDIT: Actualizar una categoría existente (PUT)
router.put(
  '/:id',
  verificarAdmin,
  [
    body('descripcion')
      .optional()
      .trim()
      .notEmpty().withMessage('La descripción no puede estar vacía')
      .isLength({ min: 3, max: 255 }).withMessage('La descripción debe tener entre 3 y 255 caracteres')
      .escape(),
    body('activo')
      .optional()
      .isInt({ min: 0, max: 1 }).withMessage('El estado debe ser 0 (inactivo) o 1 (activo)'),
    validarCampos
  ],
  categoriaController.actualizarCategoria
);

// EDIT: Actualizar una categoría existente (PATCH)
router.patch(
  '/:id',
  verificarAdmin,
  [
    body('descripcion')
      .optional()
      .trim()
      .notEmpty().withMessage('La descripción no puede estar vacía')
      .isLength({ min: 3, max: 255 }).withMessage('La descripción debe tener entre 3 y 255 caracteres')
      .escape(),
    body('activo')
      .optional()
      .isInt({ min: 0, max: 1 }).withMessage('El estado debe ser 0 o 1'),
    validarCampos
  ],
  categoriaController.actualizarCategoria
);

// DELETE: Borrado lógico / Soft delete (NO borrado físico)
router.delete('/:id', verificarAdmin, categoriaController.eliminarCategoria);

// REACTIVAR: Reactivación lógica de categoría
router.put('/:id/reactivar', verificarAdmin, categoriaController.reactivarCategoria);
router.patch('/:id/reactivar', verificarAdmin, categoriaController.reactivarCategoria);

module.exports = router;