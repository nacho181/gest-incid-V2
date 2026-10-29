/**
 * ============================================================================
 * SERVICIO DE NOTIFICACIONES POR CORREO ELECTRÓNICO (NODEMAILER)
 * Módulo: Incidencias - Sistemas y Notificaciones.
 * Gestiona el envío de correos cuando una incidencia es Finalizada o Cancelada.
 * ============================================================================
 */

const nodemailer = require('nodemailer');

/**
 * Crea y configura el transportador de Nodemailer.
 * Si las credenciales SMTP están en .env, usa SMTP real.
 * Si no están configuradas, utiliza un transportador seguro de simulación / logging.
 */
function crearTransportador() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user, pass }
    });
  }

  // Transportador en modo simulación para desarrollo y pruebas locales
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true
  });
}

const transporter = crearTransportador();

/**
 * Plantilla HTML con diseño institucional de la Municipalidad de Concordia.
 */
function generarPlantillaHtml({ titulo, badgeTipo, subtitulo, detalles, contenidoPrincipal, pie }) {
  const filasDetalles = Object.entries(detalles)
    .filter(([_, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(([campo, valor]) => `
      <tr>
        <td style="padding: 8px 12px; font-weight: 600; color: #2d3748; width: 35%; border-bottom: 1px solid #edf2f7; font-size: 13px;">${campo}</td>
        <td style="padding: 8px 12px; color: #4a5568; border-bottom: 1px solid #edf2f7; font-size: 13px;">${valor}</td>
      </tr>
    `).join('');

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 24px; color: #2d3748;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
      
      <!-- Encabezado Municipalidad -->
      <div style="background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%); padding: 24px; color: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="background-color: #4caf50; color: #ffffff; font-weight: bold; font-size: 11px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">MC</span>
            <h1 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">Municipalidad de Concordia</h1>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #c8e6c9;">Sistema Integral de Gestión de Incidencias • Área de Sistemas</p>
          </div>
        </div>
      </div>

      <!-- Cuerpo del Mensaje -->
      <div style="padding: 24px;">
        <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
          <h2 style="margin: 0; font-size: 18px; color: #1a202c;">${subtitulo}</h2>
          ${badgeTipo}
        </div>

        ${contenidoPrincipal || ''}

        <!-- Tabla con Detalles de la Incidencia -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; background-color: #f8fafc; border-radius: 6px; overflow: hidden;">
          <tbody>
            ${filasDetalles}
          </tbody>
        </table>

        <!-- Pie de Información -->
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #15803d; margin-top: 20px;">
          ${pie}
        </div>
      </div>

      <!-- Footer Institucional -->
      <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096;">
        <p style="margin: 0;">Este es un mensaje generado automáticamente por el Sistema de Incidencias de la Municipalidad de Concordia.</p>
        <p style="margin: 4px 0 0 0;">Por favor no respondas a este correo directamente.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Envía un correo genérico con manejo seguro de errores.
 */
async function enviarCorreo({ para, asunto, html, texto }) {
  const remitente = process.env.EMAIL_FROM || '"Municipalidad de Concordia - Incidencias" <notificaciones@concordia.gob.ar>';

  try {
    const info = await transporter.sendMail({
      from: remitente,
      to: para,
      subject: asunto,
      text: texto,
      html: html
    });

    const esSimulado = Boolean(info.message);
    console.log(`[EMAIL ENVIADO] Asunto: "${asunto}" | Destinatario: <${para}> | Modo: ${esSimulado ? 'Simulación en consola' : 'SMTP Real'}`);

    return {
      exito: true,
      destinatario: para,
      asunto,
      messageId: info.messageId,
      modo: esSimulado ? 'simulado' : 'smtp'
    };
  } catch (error) {
    console.error(`[ERROR EMAIL] No se pudo enviar el correo a <${para}>:`, error.message);
    return {
      exito: false,
      destinatario: para,
      error: error.message
    };
  }
}

/**
 * Notifica al solicitante que su incidencia fue FINALIZADA por el personal de Sistemas.
 * @param {Object} datos
 * @param {Object} datos.incidencia - Información de la incidencia (id_incidencia, descripcion_pedido, etc.)
 * @param {string} datos.descripcionResolucion - Solución técnica aplicada.
 * @param {string} datos.tecnicoNombre - Nombre del empleado de sistemas que la resolvió.
 * @param {string} datos.destinatarioEmail - Correo electrónico del solicitante.
 * @param {string} datos.destinatarioNombre - Nombre del solicitante.
 * @param {string} [datos.articuloDescripcion] - Descripción del equipo/artículo involucrado.
 */
async function notificarIncidenciaFinalizada({
  incidencia,
  descripcionResolucion,
  tecnicoNombre,
  destinatarioEmail,
  destinatarioNombre,
  articuloDescripcion = 'Equipo / Artículo institucional'
}) {
  const id = incidencia.id_incidencia;
  const asunto = `[Municipalidad de Concordia] Incidencia #${id} Finalizada / Resuelta`;
  const subtitulo = `Tu incidencia #${id} ha sido resuelta con éxito`;

  const badgeTipo = `<span style="background-color: #16a34a; color: #ffffff; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 9999px;">FINALIZADA</span>`;

  const contenidoPrincipal = `
    <p style="font-size: 14px; line-height: 1.5; color: #4a5568; margin-top: 0;">
      Hola <strong>${destinatarioNombre || 'Empleado/a'}</strong>, te informamos que el técnico asignado del <strong>Área de Sistemas</strong> ha finalizado la atención de tu incidencia.
    </p>
    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 14px; margin: 16px 0;">
      <div style="font-weight: 700; color: #065f46; font-size: 13px; text-transform: uppercase; margin-bottom: 6px;">
        💡 Solución Técnica Aplicada:
      </div>
      <div style="color: #047857; font-size: 14px; line-height: 1.4;">
        ${descripcionResolucion}
      </div>
    </div>
  `;

  const detalles = {
    'N° Incidencia': `#${id}`,
    'Artículo / Equipo': articuloDescripcion,
    'Problema Reportado': incidencia.descripcion_pedido || 'Sin descripción',
    'Técnico Responsable': tecnicoNombre || 'Empleado de Sistemas',
    'Fecha de Cierre': new Date().toLocaleString('es-AR')
  };

  const pie = `Si el problema persiste o requieres asistencia adicional sobre otro equipo, puedes generar una nueva incidencia desde la intranet municipal.`;

  const html = generarPlantillaHtml({
    titulo: asunto,
    badgeTipo,
    subtitulo,
    detalles,
    contenidoPrincipal,
    pie
  });

  const texto = `Municipalidad de Concordia - Incidencia #${id} Finalizada\n\n` +
    `Hola ${destinatarioNombre},\n` +
    `Tu incidencia sobre "${articuloDescripcion}" ha sido finalizada.\n\n` +
    `Solución técnica: ${descripcionResolucion}\n` +
    `Técnico: ${tecnicoNombre}\n` +
    `Fecha: ${new Date().toLocaleString('es-AR')}`;

  return await enviarCorreo({
    para: destinatarioEmail,
    asunto,
    html,
    texto
  });
}

/**
 * Notifica al solicitante que una incidencia fue CANCELADA.
 * @param {Object} datos
 * @param {Object} datos.incidencia - Información de la incidencia.
 * @param {string} datos.destinatarioEmail - Correo del solicitante.
 * @param {string} datos.destinatarioNombre - Nombre del solicitante.
 * @param {string} [datos.canceladoPorNombre] - Quién efectuó la cancelación.
 * @param {string} [datos.articuloDescripcion] - Descripción del artículo.
 */
async function notificarIncidenciaCancelada({
  incidencia,
  destinatarioEmail,
  destinatarioNombre,
  canceladoPorNombre = 'El solicitante',
  articuloDescripcion = 'Equipo / Artículo institucional'
}) {
  const id = incidencia.id_incidencia;
  const asunto = `[Municipalidad de Concordia] Incidencia #${id} Cancelada`;
  const subtitulo = `La incidencia #${id} ha sido cancelada`;

  const badgeTipo = `<span style="background-color: #6b7280; color: #ffffff; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 9999px;">CANCELADA</span>`;

  const contenidoPrincipal = `
    <p style="font-size: 14px; line-height: 1.5; color: #4a5568; margin-top: 0;">
      Hola <strong>${destinatarioNombre || 'Empleado/a'}</strong>, te informamos que la incidencia registrada ha sido dada de baja en el sistema.
    </p>
  `;

  const detalles = {
    'N° Incidencia': `#${id}`,
    'Artículo / Equipo': articuloDescripcion,
    'Problema Inicial': incidencia.descripcion_pedido || 'Sin descripción',
    'Cancelada Por': canceladoPorNombre,
    'Fecha de Cancelación': new Date().toLocaleString('es-AR')
  };

  const pie = `Esta incidencia ha sido dada de baja y no requerirá intervención técnica. Si consideras que fue un error, puedes reportar una nueva solicitud desde la intranet.`;

  const html = generarPlantillaHtml({
    titulo: asunto,
    badgeTipo,
    subtitulo,
    detalles,
    contenidoPrincipal,
    pie
  });

  const texto = `Municipalidad de Concordia - Incidencia #${id} Cancelada\n\n` +
    `Hola ${destinatarioNombre},\n` +
    `La incidencia #${id} referente a "${articuloDescripcion}" ha sido cancelada.\n` +
    `Cancelada por: ${canceladoPorNombre}\n` +
    `Fecha: ${new Date().toLocaleString('es-AR')}`;

  return await enviarCorreo({
    para: destinatarioEmail,
    asunto,
    html,
    texto
  });
}

module.exports = {
  transporter,
  enviarCorreo,
  notificarIncidenciaFinalizada,
  notificarIncidenciaCancelada
};
