export function notFoundApi(req, res) {
  res.status(404).json({ error: true, mensaje: 'Ruta no encontrada' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status || 500;
  let mensaje = err.message || 'Error interno del servidor';

  if (err.type === 'entity.parse.failed') {
    status = 400;
    mensaje = 'El cuerpo de la solicitud no es un JSON válido';
  } else if (err.name === 'MulterError') {
    status = 400;
    mensaje = err.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen supera el tamaño máximo de 2 MB'
      : err.message;
  } else if (err.code === '22001') {        // PostgreSQL: valor demasiado largo
    status = 400;
    mensaje = 'Uno de los campos supera la longitud permitida';
  } else if (err.code === '23503') {        // PostgreSQL: clave foránea inexistente
    status = 400;
    mensaje = 'Se hace referencia a un registro que no existe';
  }

  if (status >= 500) {
    console.error('[ERROR NO CONTROLADO]:', err.stack || err.message);
    mensaje = 'Error interno del servidor';
  }

  res.status(status).json({ error: true, mensaje });
}