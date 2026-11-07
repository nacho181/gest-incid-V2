import { validationResult } from 'express-validator';

export const validarCampos = (req, res, next) => {
  const resultado = validationResult(req);
  if (resultado.isEmpty()) return next();

  const errores = resultado
    .array({ onlyFirstError: true })
    .map((e) => ({ campo: e.path, mensaje: e.msg }));

  return res.status(400).json({
    error: true,
    mensaje: errores[0].mensaje,
    errores
  });
};