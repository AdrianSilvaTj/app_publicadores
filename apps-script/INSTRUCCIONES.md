# Recordatorios de tareas por correo (Apps Script)

Esta integración permite enviar correos cuando una tarea vence aunque DigitCong esté cerrada. Usa Google Apps Script, Firestore REST y `MailApp`; no requiere Cloud Functions ni desplegar un servidor público. Los correos incluyen el icono de DigitCong en línea, colores de la app, datos de la tarea y un enlace para abrirla.

## Configuración inicial

1. Entra en [script.google.com](https://script.google.com) con la cuenta Google desde la que saldrán los correos y crea un proyecto independiente.
2. Copia el contenido actualizado de `recordatorios.gs` al archivo `Code.gs` del proyecto. Si el activador ya está instalado, basta con guardar el código actualizado; no hace falta instalarlo de nuevo.
3. En **Configuración del proyecto**, activa la opción para mostrar `appsscript.json` y reemplaza su contenido con el archivo de este directorio. Guarda el proyecto y acepta los permisos adicionales que solicite, incluido el de administrar activadores.
4. En **Configuración del proyecto → Propiedades del script**, crea `APP_URL` con la dirección pública de DigitCong, por ejemplo `https://tu-dominio.example`. No agregues `/tareas.html` al final.
5. En el proyecto Firebase `app-congregacion`, verifica que la cuenta Google que ejecutará el script tenga el rol **Cloud Datastore User**. Si Firestore REST informa que la API no está habilitada, habilita **Cloud Firestore API** en Google Cloud para ese proyecto.
6. En el editor de Apps Script, selecciona y ejecuta `probarConexionFirestore`. Acepta los permisos solicitados. En **Ejecuciones** o **Registro de ejecución**, debe aparecer `Conexión correcta`.
7. Ejecuta una sola vez `instalarActivadorRecordatorios` y autoriza el envío de correo. El script creará un activador que revisa Firestore cada cinco minutos.
8. En DigitCong, edita o crea una tarea y escribe en **Correos para recordatorios** las direcciones de acceso de los responsables, separadas por coma. Agrega un recordatorio futuro y guarda.
9. Para comprobarlo, usa una dirección que puedas revisar y una hora que ocurra después del siguiente ciclo. El correo se envía desde la cuenta Google que autorizó Apps Script. Revisa también Spam y **Ejecuciones** en Apps Script.

## Notas

- El activador trabaja en la zona horaria `America/Bogota`; el retraso esperado es de hasta cinco minutos.
- En **Configuración** de DigitCong puedes activar o pausar el envío por correo. Guarda la configuración; Apps Script lee esta preferencia en cada ciclo. Si el interruptor está apagado, no se envían correos y las tareas no se modifican.
- Para incrustar el icono y crear el botón de la tarea, la propiedad `APP_URL` debe apuntar al origen público donde está alojada DigitCong. Si no puede descargar `assets/icon-192.png`, el correo conserva los colores y muestra un distintivo `DC`.
- Las direcciones se guardan en los mismos documentos de tarea de Firestore, así que aplican las reglas de acceso actuales de esa colección.
- Se omiten tareas marcadas como realizadas o canceladas. Cada recordatorio registra los correos a los que ya se envió para evitar repetirlos en ejecuciones normales.
- El envío por correo es independiente de los avisos locales del navegador.
- El script tiene límites propios de 5 destinatarios por ejecución y 20 por día calendario en America/Bogota. También consulta `MailApp.getRemainingDailyQuota()` antes de cada envío y se detiene si Google informa que no queda cuota. Los correos pendientes se conservan para el siguiente ciclo.
- No se usan claves privadas ni una cuenta de servicio. La función REST usa el acceso OAuth de la cuenta que autorizó el proyecto de Apps Script.
- Si aparecen errores HTTP 403, revisa el rol IAM, el consentimiento de `appsscript.json` y que Firestore API esté habilitada.