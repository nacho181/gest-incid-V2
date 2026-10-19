/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO ARTÍCULOS (ENTIDADES BASE)
 * Endpoints REST para BREAD de Artículos:
 * - GET    /api/v1/articulos            (Browse)
 * - GET    /api/v1/articulos/:id        (Read)
 * - POST   /api/v1/articulos            (Add)
 * - PUT    /api/v1/articulos/:id        (Edit)
 * - PATCH  /api/v1/articulos/:id        (Edit)
 * - DELETE /api/v1/articulos/:id        (Delete - Borrado Lógico / Soft Delete)
 * - PUT    /api/v1/articulos/:id/reactivar (Reactivación lógica)
 * ============================================================================
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const articuloController = require('../controllers/articuloController');
const { verificarToken, autorizarRol } = require('../middlewares/authMiddleware');
const ROLES = require('../config/roles');

// Middleware estricto para validar token JWT y verificar roles del Área de Sistemas (1: Director, 2: Empleado de Sistemas)
const verificarAdmin = [verificarToken, autorizarRol(ROLES.SISTEMAS, ROLES.DIRECTOR)];
const verificarLectura = [verificarToken, autorizarRol(ROLES.DIRECTOR, ROLES.SISTEMAS, ROLES.MUNICIPAL)];

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
 * tags:
 *   name: Artículos
 *   description: BREAD de Artículos (Solo Sistemas)
 * 
 * /api/v1/articulos:
 *   get:
 *     tags: [Artículos]
 *     summary: Obtener todos los artículos (Browse)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de artículos
 *   post:
 *     tags: [Artículos]
 *     summary: Crear un nuevo artículo (Add)
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
 *               id_categoria:
 *                 type: integer
 *               id_area:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Artículo creado exitosamente
 * 
 * /api/v1/articulos/{id}:
 *   get:
 *     tags: [Artículos]
 *     summary: Obtener detalle de un artículo (Read)
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
 *         description: Detalle del artículo
 *   put:
 *     tags: [Artículos]
 *     summary: Actualizar un artículo (Edit)
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
 *               id_categoria:
 *                 type: integer
 *               id_area:
 *                 type: integer
 *               activo:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Artículo actualizado
 *   delete:
 *     tags: [Artículos]
 *     summary: Baja lógica de un artículo (Soft Delete)
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
 *         description: Artículo dado de baja
 */

// BROWSE: Listar artículos activos con filtros opcionales
router.get('/', verificarLectura, articuloController.getArticulos);

// READ: Obtener detalle de un artículo por ID
router.get('/:id', verificarLectura, articuloController.getArticuloById);

// ADD: Crear un nuevo artículo con validaciones estrictas
router.post(
  '/',
  verificarAdmin,
  [
    body('descripcion')
      .trim()
      .notEmpty().withMessage('La descripción es obligatoria')
      .isLength({ min: 3, max: 250 }).withMessage('La descripción debe tener entre 3 y 250 caracteres')
      .escape(),
    body('id_categoria')
      .notEmpty().withMessage('El ID de la categoría es obligatorio')
      .isInt({ min: 1 }).withMessage('El ID de la categoría debe ser un número entero mayor a 0'),
    body('id_area')
      .notEmpty().withMessage('El ID del área es obligatorio')
      .isInt({ min: 1 }).withMessage('El ID del área debe ser un número entero mayor a 0'),
    validarCampos
  ],
  articuloController.crearArticulo
);

// EDIT: Actualizar un artículo existente (PUT)
router.put(
  '/:id',
  verificarAdmin,
  [
    body('descripcion')
      .optional()
      .trim()
      .notEmpty().withMessage('La descripción no puede estar vacía')
      .isLength({ min: 3, max: 250 }).withMessage('La descripción debe tener entre 3 y 250 caracteres')
      .escape(),
    body('id_categoria')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID de la categoría debe ser un número entero'),
    body('id_area')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID del área debe ser un número entero'),
    body('activo')
      .optional()
      .isInt({ min: 0, max: 1 }).withMessage('El estado debe ser 0 (inactivo) o 1 (activo)'),
    validarCampos
  ],
  articuloController.actualizarArticulo
);

// EDIT: Actualizar un artículo existente (PATCH)
router.patch(
  '/:id',
  verificarAdmin,
  [
    body('descripcion')
      .optional()
      .trim()
      .notEmpty().withMessage('La descripción no puede estar vacía')
      .isLength({ min: 3, max: 250 }).withMessage('La descripción debe tener entre 3 y 250 caracteres')
      .escape(),
    body('id_categoria')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID de la categoría debe ser un número entero'),
    body('id_area')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID del área debe ser un número entero'),
    body('activo')
      .optional()
      .isInt({ min: 0, max: 1 }).withMessage('El estado debe ser 0 o 1'),
    validarCampos
  ],
  articuloController.actualizarArticulo
);

// DELETE: Borrado lógico / Soft delete (NO borrado físico)
router.delete('/:id', verificarAdmin, articuloController.eliminarArticulo);

// REACTIVAR: Reactivación lógica de artículo
router.put('/:id/reactivar', verificarAdmin, articuloController.reactivarArticulo);
router.patch('/:id/reactivar', verificarAdmin, articuloController.reactivarArticulo);

module.exports = router;