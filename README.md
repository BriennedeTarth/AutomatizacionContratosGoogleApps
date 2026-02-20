# AutomatizacionContratosGoogleApps
Este proyecto automatiza el ciclo de vida de creación de contratos legales/educativos utilizando el ecosistema de Google (Forms, Sheets, Docs y Drive).

## Flujo de Trabajo
1. **Captura de Datos:** El cliente completa un formulario de Google.
2. **Generación Automática:** Un script de Google Apps Script captura la entrada, crea una estructura de carpetas en Drive y genera un Google Doc a partir de una plantilla, reemplazando variables dinámicas (`{{Nombre}}`, `{{Fecha}}`, etc.).
3. **Gestión de Archivos:** Los documentos adjuntos en el formulario (IDs, certificados) se mueven automáticamente a la carpeta del cliente para mantener el orden.
4. **Validación Humana:** El sistema notifica al administrador por correo. El administrador revisa el documento y marca una casilla de verificación en Google Sheets.
5. **Envío Final:** Una vez verificado, el sistema convierte el documento a PDF y lo envía al cliente vía Gmail.

##  Tecnologías
- **Google Apps Script:** Lógica del backend.
- **Google Drive API:** Gestión de archivos y carpetas.
- **Gmail API:** Notificaciones y envío de contratos.
- **Google Docs/Sheets:** Plantillas y base de datos.

## Configuración
Para usar este script, debes actualizar las constantes en el archivo `main.gs`:
- `ID_PLANTILLA`: El ID de tu Google Doc modelo.
- `ID_CARPETA_RAIZ`: El ID de la carpeta de Drive donde se guardará todo.
- `EMAIL_ADMINISTRACION`: Correo de la persona que aprobará los contratos.
- `COL_RELLENADO`: Columna donde se guarda la informacion de rellenado.
- `COL_VERIFICADO`: Columna donde se guarda la informacion de verificado.
- `COL_ENVIADO`: Columna donde se guarda la informacion de enviado.

## Requisitos de la Plantilla
El Google Doc debe contener etiquetas entre llaves dobles, por ejemplo:
- `{{NombreCliente}}`
- `{{CICliente}}`
- `{{Fecha}}`


## Configuración de Activadores (Triggers)
Para que el sistema funcione automáticamente, debes configurar dos activadores en la consola de Google Apps Script:

### Generación de Contrato:

- Seleccionar: trigger_RellenarContrato
- Evento: De la hoja de cálculo -> Al enviarse el formulario

### Envío de PDF:

- Seleccionar: trigger_EnviarCorreoVerificado
- Evento: De la hoja de cálculo -> Al realizarse cambios
