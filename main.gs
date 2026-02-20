// --- CONFIGURACIÓN GLOBAL ---
const ID_PLANTILLA = 'ID_PLANTILLA';
const ID_CARPETA_RAIZ = 'ID_CARPETA_RAIZ';
const NOMBRE_HOJA = "NOMBRE_HOJA";

const COL_RELLENADO = COL_RELLENADO;
const COL_VERIFICADO = COL_RELLENADO;
const COL_ENVIADO = COL_RELLENADO;


function trigger_RellenarContrato() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(NOMBRE_HOJA);
  const fila = hoja.getLastRow(); // Al ser por formulario, procesamos la última
  
  // Validar si ya se rellenó (evitar duplicados si el trigger falla)
  if (hoja.getRange(fila, COL_RELLENADO).getValue() === true) return;

  // Obtener Datos
  const datos = obtenerDatosDeFila(hoja, fila);
  const fechaActual = getCurrentDate();
  const nombre = (datos.nombreRep && datos.nombreRep !== "") ? datos.nombreRep : datos.nombreEst;
  
  // Carpetas
  const rootFolder = DriveApp.getFolderById(ID_CARPETA_RAIZ);
  const yearFolder = getOrCreateFolder(rootFolder, Utilities.formatDate(new Date(), "GMT", "yyyy"));
  const monthFolder = getOrCreateFolder(yearFolder, Utilities.formatDate(new Date(), "GMT", "MM"));
  const contractFolder = getOrCreateFolder(monthFolder, fechaActual + ' ' + nombre);

  // Crear Documento
  
  const nombreDoc = 'Contrato servicio educativo ' + nombre + ' ' + fechaActual;
  const docFile = DriveApp.getFileById(ID_PLANTILLA).makeCopy(nombreDoc, contractFolder);
  const doc = DocumentApp.openById(docFile.getId());
  const body = doc.getBody();

  // Lógica de Reemplazo (Representante vs Estudiante)
  /*const persona = (datos.nombreRep !== "") ? "Rep" : "Est";
  
  body.replaceText('{{fecha}}', fechaActual);
  body.replaceText('{{NombreCliente}}', (persona === "Rep" ? datos.nombreRep : datos.nombreEst));
  body.replaceText('{{CorreoCliente}}', (persona === "Rep" ? datos.correoRep : datos.correoEst));
  body.replaceText('{{TelefonoCliente}}', (persona === "Rep" ? datos.telefonoRep : datos.telefonoEst));
  body.replaceText('{{Cedula}}', (persona === "Rep" ? datos.cedulaRep : datos.cedulaEst));
  body.replaceText('{{ciudadCliente}}', (persona === "Rep" ? datos.ciudadRep : datos.ciudadEst));
*/


  // Lógica de Reemplazo (Representante vs Estudiante)
  const persona = (datos.nombreRep && datos.nombreRep !== "") ? "Rep" : "Est";
  const hoy = new Date();
  // --- ETIQUETAS EXTRAÍDAS EXACTAMENTE DEL DOCUMENTO ---
  const dia = Utilities.formatDate(hoy, "GMT-5", "dd");     // Ejemplo: "03"
    const mesNum = Utilities.formatDate(hoy, "GMT-5", "MM");  // Ejemplo: "02"
    const anio = Utilities.formatDate(hoy, "GMT-5", "yyyy");  // Ejemplo: "2026"
  //body.replaceText('{{fecha}}', fechaActual);
  body.replaceText('{{dia}}', dia);
  body.replaceText('{{mes}}', mesNum);
  body.replaceText('{{anio}}', anio);
  // Datos del Cliente (Responsable del pago/contrato)
  body.replaceText('{{NombreCliente}}', safeUpper(persona === "Rep" ? datos.nombreRep : datos.nombreEst));
  
  body.replaceText('{{CorreoCliente}}', safeUpper(persona === "Rep" ? datos.correoRep : datos.correoEst));
 

    body.replaceText('{{FormaPago}}', safeUpper(datos.formaPago));
   
    body.replaceText('{{Tarjeta}}', safeUpper(datos.tarjeta));
    
    let vencimientoFormateado = "";
    if (datos.vencimiento) {
      // Creamos un objeto Date si no lo es, y formateamos a Mes/Año
      const fechaVenc = new Date(datos.vencimiento);
      vencimientoFormateado = Utilities.formatDate(fechaVenc, "GMT-5", "MM/yy");
    }

    body.replaceText('{{VencimientoTarjeta}}', vencimientoFormateado);

  doc.saveAndClose();
   // --- COPIAR ARCHIVOS CARGADOS (ESTUDIANTE Y REPRESENTANTE) ---
  // Procesar columna (Estudiante)
  procesarYCopiarArchivos(datos.linkArchivo1, contractFolder, "Doc_Estudiante");
  
  // Procesar columna (Representante)
  procesarYCopiarArchivos(datos.linkArchivo2, contractFolder, "Doc_Representante");



  // Marcar como Rellenado 
  hoja.getRange(fila, COL_RELLENADO).setValue(true);
  console.log("Contrato generado para fila: " + fila);
  avisarDirectora(nombre, contractFolder.getUrl());
}



function trigger_EnviarCorreoVerificado() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(NOMBRE_HOJA);
  
  const fila = obtenerFilaParaEnviar(); 
  if (!fila) {
    console.log("No se encontró ninguna fila que cumpla: Rellenado=SI, Verificado=SI, Enviado=NO");
    return;
  }

  const datos = obtenerDatosDeFila(hoja, fila);
  const fechaActual = getCurrentDate();
  const destinatario = (datos.correoRep && datos.correoRep !== "") ? datos.correoRep : datos.correoEst;
  const sujetoNombre = (datos.nombreRep && datos.nombreRep !== "") ? datos.nombreRep : datos.nombreEst;
  const nombreDoc = 'Contrato servicio educativo ' + sujetoNombre + ' ' + fechaActual;

  // Intentar obtener el archivo
  const archivos = DriveApp.getFilesByName(nombreDoc);
  
  if (archivos.hasNext()) {
    const archivoDoc = archivos.next();
    // Forzamos la actualización de cambios antes de convertir a PDF
    const docEditable = DocumentApp.openById(archivoDoc.getId());
    docEditable.saveAndClose();

    const pdfAdjunto = archivoDoc.getAs('application/pdf').setName(nombreDoc + '.pdf');
    
    const asunto = 'Contrato de Servicio Educativo - ' + sujetoNombre;
    const mensaje = `Saludos ${sujetoNombre},\n\n Le informamos que se ha generado su contrato de servicio educativo correspondiente a la fecha ${fechaActual}. 
Adjunto a este correo encontrarás el documento en formato PDF.

Por favor, realiza los siguientes pasos:
1. Descarga e imprime el documento.
2. Fírmalo en las áreas indicadas.
3. Escanea el contrato firmado y envíalo de vuelta por este mismo medio.

Quedamos a la espera de su respuesta para continuar con el proceso.

Saludos cordiales.\n\nSaludos cordiales.`;

    GmailApp.sendEmail(destinatario, asunto, mensaje, {
      attachments: [pdfAdjunto]
    });

  
    hoja.getRange(fila, COL_ENVIADO).setValue(true);
    console.log("Email enviado con éxito a " + destinatario + " (Fila " + fila + ")");
  } else {
    console.error("ERROR: No se encontró el archivo con nombre: " + nombreDoc);
    SpreadsheetApp.getUi().alert("No se encontró el archivo: " + nombreDoc);
  }
}


function obtenerDatosDeFila(hoja, fila) {
  return {
    nombreEst: hoja.getRange(fila, XX).getValue(),
    correoEst: hoja.getRange(fila, XX).getValue(),
   


    nombreRep: hoja.getRange(fila, XX).getValue(),
    correoRep: hoja.getRange(fila, XX).getValue(),
   

    formaPago: hoja.getRange(fila, XX).getValue(),
    tarjeta: hoja.getRange(fila, XX).getValue(),
    vencimiento: hoja.getRange(fila, XX).getValue(),
    
    linkArchivo1: hoja.getRange(fila, XX).getValue(), 
    linkArchivo2: hoja.getRange(fila,XX).getValue()
    // RELLENAR TODOS LOS CAMPOS
  };
}


function safeUpper(valor) {
  // Si el valor es null/undefined, devuelve vacío. Si no, lo hace string y mayúsculas.
  return valor ? String(valor).toUpperCase() : "";
}

function obtenerFilaParaEnviar() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA);
  const ultimaFila = hoja.getLastRow();
  
  if (ultimaFila < 2) return null;


  const valores = hoja.getRange(2, COL_RELLENADO, ultimaFila - 1, 3).getValues();

  for (let i = 0; i < valores.length; i++) {
    // valores[i][0] es la primera columna pedida RELLENAR
    // valores[i][1] es la segunda columna pedida VERFICAR
    // valores[i][2] es la tercera columna pedida ENVIAR
    
    let contratoCreado = valores[i][0];   
    let verificadoManual = valores[i][1]; 
    let yaEnviado = valores[i][2];       
    
    // CONDICIÓN:
    // Que se haya rellenado  Y que admin haya dado el OK  Y que NO se haya enviado
    if (contratoCreado === true && verificadoManual === true && (yaEnviado === false || yaEnviado === "")) {
      let filaReal = i + 2;
      console.log("Fila encontrada para enviar: " + filaReal);
      return filaReal;
    }
  }

  console.log("No se encontró ninguna fila con 31=TRUE, 32=TRUE y 33=FALSE");
  return null;
}


function avisarDirectora(nombreEstudiante, linkCarpeta) {
  const correoDirectora = "correo@correo"; // CAMBIA ESTO
  const asunto = `NUEVO CONTRATO -: ${nombreEstudiante}`;
  
  const mensaje = `
Saludos Directora,

Le informo que se ha generado automáticamente el contrato para el representante **${nombreEstudiante}**.

El documento ya está listo en su carpeta correspondiente para su revisión manual. Una vez verificado, por favor marque la casilla de "Verificación Manual" en el Excel para proceder con el envío al cliente.

**Link de la Carpeta del Contrato:**
${linkCarpeta}


Cuando lo verifiques, marca como completado la casilla correspondinete en el siguiente link: PONER LINK CARPETA
Saludos cordiales,
Sistema de Automatización.

  `;

  GmailApp.sendEmail(correoDirectora, asunto, mensaje);
  console.log("Aviso enviado a la directora para el estudiante: " + nombreEstudiante);
}

function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function getCurrentDate() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
}

/**
 * Separa los links, extrae IDs de forma robusta y copia cada archivo.
 */
function procesarYCopiarArchivos(linksString, carpetaDestino, prefijo) {
  // Verificación inicial de contenido
  if (!linksString || linksString.toString().trim() === "") {
    console.log("No hay links para procesar en: " + prefijo);
    return;
  }

  // Google Forms separa múltiples archivos por comas
  const links = linksString.toString().split(",");
  console.log("Procesando " + links.length + " links para " + prefijo);
  
  links.forEach((link, index) => {
    try {
      let fileId = "";
      const url = link.trim();

      // Intento 1: Extraer ID de links tipo 'open?id=XXXX' o 'file/d/XXXX'
      if (url.includes("id=")) {
        fileId = url.split("id=")[1].split("&")[0];
      } else if (url.includes("/d/")) {
        fileId = url.split("/d/")[1].split("/")[0];
      } else {
        // Intento 2: Búsqueda por patrón de caracteres (mínimo 25 caracteres de ID)
        const match = url.match(/[-\w]{25,}/);
        if (match) fileId = match[0];
      }

      if (fileId !== "") {
        const archivoOriginal = DriveApp.getFileById(fileId);
        const nuevoNombre = prefijo + "_" + (index + 1) + "_" + archivoOriginal.getName();
        
        // Realizar la copia
        archivoOriginal.makeCopy(nuevoNombre, carpetaDestino);
        console.log("✓ Copiado con éxito: " + nuevoNombre);
      } else {
        console.warn("No se pudo detectar un ID válido en el link: " + url);
      }

    } catch (e) {
      // Si el error es de permisos, aquí sí aparecerá en el registro
      console.error("Error al procesar link [" + link + "]: " + e.toString());
    }
  });
}


