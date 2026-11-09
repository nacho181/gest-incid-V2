/**
 * ============================================================================
 * GENERADOR DE REPORTES PDF - PDFKIT
 * Utilidad de generación de documentos PDF para el módulo del Director.
 * Diseño sobrio, vectorial y universitario con soporte para streaming y paginación.
 * ============================================================================
 */

import PDFDocument from 'pdfkit';

/**
 * Paleta de colores institucional - Municipalidad de Concordia
 * Basada estrictamente en la identidad visual y hoja de estilos CSS institucional.
 */
const PALETA = {
  // 1. Verde Principal Institucional (--concordia-primary)
  primary: '#1e6b37',
  
  // 2. Verde Oscuro Institucional (--concordia-dark)
  dark: '#144924',
  
  // 3. Fondos Suaves y Cebreado (--concordia-bg-soft)
  bgSoft: '#e8f5e9',
  bgStriped: '#f4f7f5',
  
  // 4. Textos Neutros (--text-dark / --text-muted)
  textDark: '#2c3e50',
  textMuted: '#6c757d',
  textWhite: '#ffffff',
  
  // Líneas y bordes
  divider: '#1e6b37',
  borderRow: '#e8f5e9',
  
  // 5. Estados y Prioridades
  estados: {
    pendiente: '#f39c12',
    enProceso: '#2980b9',
    finalizada: '#27ae60',
    cancelada: '#95a5a6'
  },
  prioridades: {
    1: '#d32f2f', // Prioridad 1 (Alta)
    2: '#f57c00', // Prioridad 2 (Media)
    3: '#388e3c'  // Prioridad 3 (Baja)
  }
};

/**
 * Formatea una fecha ISO o timestamp a formato legible argentino (DD/MM/AAAA).
 * @param {string|Date} fechaStr - Fecha original.
 * @returns {string} Fecha formateada.
 */
function formatearFecha(fechaStr) {
  if (!fechaStr) return '-';
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return String(fechaStr);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

/**
 * Mapea la prioridad numérica a texto legible.
 * @param {number} p - Nivel de prioridad (1, 2, 3).
 * @returns {string} Etiqueta de prioridad.
 */
function formatearPrioridad(p) {
  const map = { 1: 'Alta', 2: 'Media', 3: 'Baja' };
  return map[p] || (p ? `Nivel ${p}` : 'Normal');
}

/**
 * Dibuja la cabecera de la tabla de incidencias.
 * @param {PDFDocument} doc - Documento PDFKit.
 * @param {number} y - Posición vertical Y.
 */
function dibujarCabeceraTabla(doc, y) {
  // Fondo de la cabecera de tabla
  doc.rect(40, y, 515, 20).fill(PALETA.primary);

  // Textos de las columnas
  doc.fillColor(PALETA.textWhite).fontSize(8.5).font('Helvetica-Bold');
  doc.text('ID', 45, y + 5, { width: 35, align: 'left' });
  doc.text('Fecha', 82, y + 5, { width: 63, align: 'left' });
  doc.text('Artículo / Equipo', 147, y + 5, { width: 148, align: 'left' });
  doc.text('Técnico Asignado', 297, y + 5, { width: 118, align: 'left' });
  doc.text('Estado', 417, y + 5, { width: 68, align: 'left' });
  doc.text('Prioridad', 487, y + 5, { width: 63, align: 'left' });
}

/**
 * Genera el documento PDF de reporte de incidencias y lo envía directamente por stream.
 * 
 * @param {Object} options
 * @param {Array} options.incidencias - Listado de incidencias a incluir en la tabla.
 * @param {Object} options.filtros - Metadatos de los filtros aplicados.
 * @param {string|null} options.filtros.desde - Fecha inicial del filtro.
 * @param {string|null} options.filtros.hasta - Fecha final del filtro.
 * @param {string} options.filtros.estado - Nombre del estado filtrado o 'Todos'.
 * @param {string} options.filtros.tecnico - Nombre del técnico filtrado o 'Todos'.
 * @param {import('stream').Writable} outputStream - Stream de salida (objeto res de Express).
 */
export function crearReporteIncidenciasPdf({ incidencias = [], filtros = {} }, outputStream) {
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    bufferPages: true,
    autoFirstPage: true
  });

  // Conectar el stream de salida
  doc.pipe(outputStream);

  const PAGE_WIDTH = 595.28;
  const MARGIN_LEFT = 40;
  const CONTENT_WIDTH = 515;
  const ROW_HEIGHT = 20;
  const MAX_Y = 760;

  // 1. ENCABEZADO INSTITUCIONAL VECTORIAL
  doc.rect(MARGIN_LEFT, 40, CONTENT_WIDTH, 4).fill(PALETA.dark);

  doc.fillColor(PALETA.dark).font('Helvetica-Bold').fontSize(15);
  doc.text('Municipalidad de Concordia', MARGIN_LEFT, 52);

  doc.fillColor(PALETA.primary).font('Helvetica').fontSize(10);
  doc.text('Dirección de Sistemas • Reporte Oficial de Incidencias Técnicas', MARGIN_LEFT, 70);

  // Línea separadora
  doc.moveTo(MARGIN_LEFT, 88).lineTo(MARGIN_LEFT + CONTENT_WIDTH, 88).strokeColor(PALETA.divider).lineWidth(0.8).stroke();

  // 2. METADATOS DEL REPORTE (Caja informativa)
  const metaY = 96;
  const metaHeight = 50;
  doc.roundedRect(MARGIN_LEFT, metaY, CONTENT_WIDTH, metaHeight, 3).fillAndStroke(PALETA.bgSoft, PALETA.divider);

  // Metadatos - Columna Izquierda
  const fechaEmisionStr = `${formatearFecha(new Date())} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
  const periodoStr = (filtros.desde || filtros.hasta)
    ? `Desde: ${filtros.desde ? formatearFecha(filtros.desde) : 'Inicio'} | Hasta: ${filtros.hasta ? formatearFecha(filtros.hasta) : 'Actual'}`
    : 'Histórico completo (Sin límite de fechas)';

  doc.fillColor(PALETA.textDark).font('Helvetica-Bold').fontSize(8.5);
  doc.text('Fecha de emisión: ', MARGIN_LEFT + 10, metaY + 10, { continued: true });
  doc.font('Helvetica').text(fechaEmisionStr);

  doc.font('Helvetica-Bold').text('Rango aplicado: ', MARGIN_LEFT + 10, metaY + 28, { continued: true });
  doc.font('Helvetica').text(periodoStr);

  // Metadatos - Columna Derecha
  const colDerX = MARGIN_LEFT + 270;
  doc.font('Helvetica-Bold').text('Estado filtrado: ', colDerX, metaY + 10, { continued: true });
  doc.font('Helvetica').text(filtros.estado || 'Todos');

  doc.font('Helvetica-Bold').text('Técnico asignado: ', colDerX, metaY + 24, { continued: true });
  doc.font('Helvetica').text(filtros.tecnico || 'Todos');

  doc.font('Helvetica-Bold').text('Total registros: ', colDerX, metaY + 38, { continued: true });
  doc.font('Helvetica').text(`${incidencias.length} incidencia(s)`);

  // 3. TABLA DE INCIDENCIAS
  let currentY = metaY + metaHeight + 16;
  dibujarCabeceraTabla(doc, currentY);
  currentY += ROW_HEIGHT;

  if (incidencias.length === 0) {
    // Fila vacía informativa
    doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 35).fillAndStroke(PALETA.bgSoft, PALETA.divider);
    doc.fillColor(PALETA.textMuted).font('Helvetica').fontSize(9);
    doc.text('No se encontraron incidencias que coincidan con los filtros seleccionados.', MARGIN_LEFT, currentY + 12, {
      width: CONTENT_WIDTH,
      align: 'center'
    });
    currentY += 40;
  } else {
    incidencias.forEach((inc, index) => {
      // Salto de página preventivo: solo se genera una nueva página si la fila actual
      // supera el límite vertical MAX_Y y existe efectivamente una fila restante por imprimir.
      if (currentY + ROW_HEIGHT > MAX_Y && index < incidencias.length) {
        doc.addPage();
        currentY = 40;
        dibujarCabeceraTabla(doc, currentY);
        currentY += ROW_HEIGHT;
      }

      // Fondo alternado para filas
      const bgFila = index % 2 === 0 ? PALETA.textWhite : PALETA.bgStriped;
      doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, ROW_HEIGHT).fill(bgFila);

      // Borde inferior sutil
      doc.moveTo(MARGIN_LEFT, currentY + ROW_HEIGHT)
         .lineTo(MARGIN_LEFT + CONTENT_WIDTH, currentY + ROW_HEIGHT)
         .strokeColor(PALETA.borderRow)
         .lineWidth(0.5)
         .stroke();

      // Contenido de la fila
      doc.fillColor(PALETA.textDark).font('Helvetica').fontSize(8);

      // ID
      doc.font('Helvetica-Bold').text(`#${inc.id_incidencia}`, 45, currentY + 6, {
        width: 35,
        align: 'left'
      });

      // Fecha
      doc.font('Helvetica').text(formatearFecha(inc.creado), 82, currentY + 6, {
        width: 63,
        align: 'left'
      });

      // Artículo / Equipo
      const descArticulo = inc.articulo_descripcion || inc.descripcion_pedido || '-';
      doc.text(descArticulo, 147, currentY + 6, {
        width: 145,
        height: 12,
        ellipsis: true,
        lineBreak: false
      });

      // Técnico Asignado
      const nombreTecnico = inc.asignado_nombre || (inc.asignado_a ? `Técnico #${inc.asignado_a}` : 'Sin Asignar');
      doc.text(nombreTecnico, 297, currentY + 6, {
        width: 115,
        height: 12,
        ellipsis: true,
        lineBreak: false
      });

      // Estado
      doc.text(inc.estado_descripcion || '-', 417, currentY + 6, {
        width: 65,
        height: 12,
        ellipsis: true,
        lineBreak: false
      });

      // Prioridad
      const prioStr = formatearPrioridad(inc.prioridad);
      if (inc.prioridad === 1) {
        doc.font('Helvetica-Bold').fillColor(PALETA.prioridades[1]); // Rojo para alta (#d32f2f)
      } else if (inc.prioridad === 2) {
        doc.font('Helvetica').fillColor(PALETA.prioridades[2]); // Ámbar para media (#f57c00)
      } else {
        doc.font('Helvetica').fillColor(PALETA.prioridades[3]); // Verde para baja (#388e3c)
      }
      doc.text(prioStr, 487, currentY + 6, {
        width: 60,
        align: 'left'
      });

      currentY += ROW_HEIGHT;
    });
  }

  // 4. PIE DE PÁGINA VECTORIAL (En todas las páginas existentes en el búfer)
  // Se itera sobre las páginas previamente creadas sin forzar la creación de páginas vacías
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Desactivar temporalmente el margen inferior de PDFKit durante el renderizado del footer
    // para evitar que rebase la altura útil (841.89 pt) y fuerce una nueva página innecesaria.
    const oldBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    // Línea divisoria pie de página
    doc.moveTo(MARGIN_LEFT, 800)
       .lineTo(MARGIN_LEFT + CONTENT_WIDTH, 800)
       .strokeColor(PALETA.divider)
       .lineWidth(0.5)
       .stroke();

    doc.fillColor(PALETA.textMuted).font('Helvetica').fontSize(8);
    doc.text(
      'Municipalidad de Concordia — Dirección de Sistemas (Intranet Oficial)',
      MARGIN_LEFT,
      808,
      { width: 300, align: 'left', lineBreak: false }
    );
    doc.text(
      `Página ${i + 1} de ${range.count}`,
      MARGIN_LEFT + 315,
      808,
      { width: 200, align: 'right', lineBreak: false }
    );

    // Restaurar margen inferior original
    doc.page.margins.bottom = oldBottomMargin;
  }

  // Finalizar el documento de forma inmediata sin saltos de línea sobrantes
  doc.end();
}

export default {
  crearReporteIncidenciasPdf
};

