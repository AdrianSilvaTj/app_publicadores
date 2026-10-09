function limpiarCacheFirebase() {
  Object.keys(localStorage).forEach((key) => {
    if (key !== "user") {
      localStorage.removeItem(key);
    }
  });
}

if (!sessionStorage.getItem("app_abierta")) {
  limpiarCacheFirebase();
}

sessionStorage.setItem("app_abierta", "1");

/**
 * Carga un archivo JavaScript de manera dinÃ¡mica y lo agrega al DOM si no ha sido cargado antes.
 * @param {string} src - La ruta o URL del script a cargar.
 * @returns {Promise<void>} Promesa que se resuelve cuando el script ha sido cargado exitosamente.
 */

function cargarScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(`âŒ Error cargando: ${src}`);
    document.body.appendChild(script);
  });
}

/**
 * Carga el menÃº principal dinÃ¡micamente en funciÃ³n de la URL actual,
 * y carga los scripts necesarios por pÃ¡gina incluyendo dependencias globales.
 * TambiÃ©n valida la sesiÃ³n del usuario mediante Firebase Auth.
 * @async
 * @function
 * @returns {Promise<void>} Promesa que se resuelve cuando todos los scripts estÃ¡n cargados.
 */

async function cargarMenuYScripts() {
  mostrarBanner("Cargando...", "info", true);
  const path = window.location.pathname;
  let pagina = path.substring(path.lastIndexOf("/") + 1).split(".")[0];
  const menu = document.getElementById("menu");
  if (menu) {
    menu.innerHTML = `
    <div class="container-fluid">
      <a class="navbar-brand" href="index.html">ðŸ  DigitCong</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <a class="nav-link ${
              pagina === "publicadores" && "active"
            }" href="publicadores.html">ðŸ‘¨â€ðŸ‘©â€ðŸ‘§â€ðŸ‘¦ Publicadores</a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${
              pagina === "reuniones" && "active"
            }" href="reuniones.html">ðŸ“… Reuniones</a>
          </li>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle ${
              ["servicio", "analisis-congregacion"].includes(pagina) ? "active" : ""
            }" href="#" id="menuServicio" role="button" data-bs-toggle="dropdown" aria-expanded="false">ðŸ’¼ Servicio</a>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="menuServicio" style="background-color: darkgray;">
              <li><a class="dropdown-item ${pagina === "servicio" ? "active" : ""}" href="servicio.html">â—¾ Informes</a></li>
              <li><a class="dropdown-item ${pagina === "analisis-congregacion" ? "active" : ""}" href="analisis-congregacion.html">â—¾ AnÃ¡lisis de la congregaciÃ³n</a></li>
            </ul>
          </li>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle ${["reuniones-ancianos", "crear-reunion-ancianos", "tareas"].includes(pagina) ? "active" : ""}" href="#" id="menuHerramientas" role="button" data-bs-toggle="dropdown" aria-expanded="false">&#129520; Herramientas</a>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="menuHerramientas">
              <li><a class="dropdown-item ${["reuniones-ancianos", "crear-reunion-ancianos", "tareas"].includes(pagina) ? "active" : ""}" href="reuniones-ancianos.html">Reuniones ancianos</a></li>
            </ul>
          </li>
          <li class="nav-item">
            <a class="nav-link ${
              pagina === "configuracion" && "active"
            }" href="configuracion.html">âš™ ConfiguraciÃ³n</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" onclick="cerrarSesion()">â— Cerrar sesiÃ³n</a>
          </li>
        </ul>
      </div>
    </div>
    `;
  }
  // âœ… 1. Bootstrap
  await cargarScript(
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
  );

  // âœ… 2. Firebase core
  await cargarScript(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
  );
  await cargarScript(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"
  );
  await cargarScript(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"
  );

  // âœ… 3. Tu inicializaciÃ³n de Firebase
  await cargarScript("scripts/firebase-config.js");

  // âœ… 4. Scripts globales
  await cargarScript("main.js");
  await cargarScript("scripts/auth.js");

  const user = await new Promise((resolve) => {
    let unsubscribe = () => {};
    let resuelto = false;
    const finalizar = (currentUser) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(temporizador);
      unsubscribe();
      resolve(currentUser);
    };
    const temporizador = setTimeout(() => finalizar(null), 10000);
    unsubscribe = auth.onAuthStateChanged(finalizar, () => finalizar(null));
  });
  if (!user) {
    window.location.href = "login.html";
    return false;
  }

  // âœ… 5. Script por pÃ¡gina
  switch (pagina) {
    case "publicadores":
      await cargarScript("scripts/publicadores.js");
      break;
    case "configuracion":
      await cargarScript("scripts/configuracion.js");
      break;
    case "reuniones":
      await cargarScript("scripts/reuniones.js");
      break;
    case "tareas":`n      await cargarScript("scripts/tareas.js");`n      break;`n    case "reuniones-ancianos":
      await cargarScript("scripts/reuniones-ancianos.js");
      break;
    case "crear-reunion-ancianos":
      await cargarScript("scripts/reuniones-ancianos.js");
      break;
    case "servicio":
      await cargarScript("scripts/servicio.js");
      break;
    case "analisis-congregacion":
      await cargarScript("scripts/servicio.js");
      await cargarScript("scripts/analisis-congregacion.js?v=2");
      break;
    case "historial-acciones":
      await cargarScript("scripts/historial-acciones.js");
      break;
    case "configuracion":
      await cargarScript("scripts/configuracion.js");
      break;
  }
  return true;
}

/**
 * Muestra un banner de estado fijo arriba
 * @param {string} mensaje - El texto a mostrar (puede incluir HTML)
 * @param {string} tipo - info | success | danger | warning
 * @param {boolean} conSpinner - Si debe girar el emoji ðŸŒ€
 * @param {number} duracion - DuraciÃ³n opcional para ocultarse (en ms)
 */
function mostrarBanner(
  mensaje,
  tipo = "info",
  conSpinner = false,
  duracion = null
) {
  const banner = document.getElementById("bannerEstado");
  if (!banner) return;

  // Limpiar clases anteriores
  banner.className = "alert text-center m-0 py-2 banner";
  banner.classList.add(`alert-${tipo}`);

  // Construir contenido
  banner.innerHTML = conSpinner
    ? `<span class="spinner-emoji">ðŸ“€</span> ${mensaje}`
    : mensaje;

  banner.classList.remove("d-none");

  if (duracion) {
    setTimeout(() => {
      banner.classList.add("d-none");
    }, duracion);
  }
}

/**
 * Oculta el banner de estado si estÃ¡ presente en el DOM.
 * @function
 */
function cerrarBanner() {
  const banner = document.getElementById("bannerEstado");
  if (banner) banner.classList.add("d-none");
}

function mostrarAvisoPersistente(mensaje, tipo = "warning") {
  let aviso = document.getElementById("bannerPersistente");
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "bannerPersistente";
    aviso.className = "alert banner-persistente";
    aviso.setAttribute("role", "alert");
    document.body.appendChild(aviso);
  }

  aviso.className = `alert alert-${tipo} banner-persistente`;
  aviso.replaceChildren();

  const texto = document.createElement("div");
  texto.className = "banner-persistente-texto";
  texto.textContent = mensaje;

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "btn-close flex-shrink-0";
  cerrar.setAttribute("aria-label", "Cerrar aviso");
  cerrar.addEventListener("click", () => aviso.remove());

  aviso.append(texto, cerrar);
}

function confirmarAccion(mensaje, opciones = {}) {
  if (document.getElementById("dialogoConfirmacion")) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "dialogoConfirmacion";
    overlay.className = "confirmacion-overlay";
    overlay.setAttribute("role", "presentation");

    const dialogo = document.createElement("section");
    dialogo.className = "confirmacion-dialogo";
    dialogo.setAttribute("role", "alertdialog");
    dialogo.setAttribute("aria-modal", "true");

    const titulo = document.createElement("h2");
    titulo.className = "h5 mb-3";
    titulo.textContent = opciones.titulo || "Confirmar acciÃ³n";
    titulo.id = "tituloConfirmacion";
    dialogo.setAttribute("aria-labelledby", titulo.id);

    const detalle = document.createElement("p");
    detalle.className = "confirmacion-mensaje";
    detalle.textContent = mensaje;
    detalle.id = "mensajeConfirmacion";
    dialogo.setAttribute("aria-describedby", detalle.id);

    const acciones = document.createElement("div");
    acciones.className = "d-flex justify-content-end gap-2 mt-4";

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "btn btn-outline-secondary";
    cancelar.textContent = opciones.textoCancelar || "Cancelar";

    const aceptar = document.createElement("button");
    aceptar.type = "button";
    aceptar.className = `btn ${opciones.claseConfirmar || "btn-primary"}`;
    aceptar.textContent = opciones.textoConfirmar || "Confirmar";

    const finalizar = (resultado) => {
      document.removeEventListener("keydown", manejarTeclado);
      overlay.remove();
      resolve(resultado);
    };
    const manejarTeclado = (event) => {
      if (event.key === "Escape") finalizar(false);
      if (event.key === "Enter" && dialogo.contains(document.activeElement)) {
        finalizar(document.activeElement === aceptar);
      }
    };

    cancelar.addEventListener("click", () => finalizar(false));
    aceptar.addEventListener("click", () => finalizar(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) finalizar(false);
    });
    document.addEventListener("keydown", manejarTeclado);

    acciones.append(cancelar, aceptar);
    dialogo.append(titulo, detalle, acciones);
    overlay.appendChild(dialogo);
    document.body.appendChild(overlay);
    cancelar.focus();
  });
}

// Convierte valores externos en texto seguro para insertar dentro de HTML.
function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[caracter]);
}

/**
 * Carga la configuraciÃ³n general de la congregaciÃ³n.
 * Intenta recuperar la data desde localStorage primero, y si no existe, la consulta desde Firestore.
 * La configuraciÃ³n se almacena en localStorage para futuras llamadas.
 * @async
 * @function
 * @returns {Promise<Object|null>} Retorna el objeto de configuraciÃ³n si se encuentra, o `null` si hay error o no existe en Firestore.
 */
async function cargarConfiguracionGlobal() {
  const cacheKey = "configuracion_congregacion";

  // 1. Si ya estÃ¡ en localStorage, usarla
  const cache = localStorage.getItem(cacheKey);
  if (cache) {
    console.log("âœ… ConfiguraciÃ³n cargada desde localStorage");
    return JSON.parse(cache);
  }

  // 2. Si no estÃ¡, pedirla a Firestore
  try {
    mostrarBanner("Cargando informaciÃ³n...", "info", true);

    const doc = await db.collection("configuracion").doc("global").get();
    cerrarBanner();

    if (!doc.exists) {
      mostrarBanner(
        "âš ï¸ No hay configuraciÃ³n en Firestore",
        "warning",
        false,
        3000
      );
      return null;
    }

    const config = doc.data();

    // Guardar en localStorage
    localStorage.setItem(cacheKey, JSON.stringify(config));
    console.log("ðŸ“¦ ConfiguraciÃ³n guardada en localStorage");

    return config;
  } catch (err) {
    cerrarBanner();
    console.error("âŒ Error al obtener configuraciÃ³n:", err);
    mostrarBanner("âŒ Error al obtener configuraciÃ³n", "danger");
    return null;
  }
}

function guardarEstadoVista() {
  const estado = {
    scrollY: window.scrollY,
    mes: document.getElementById("mes")?.value,
    anio: document.getElementById("anio")?.value,
  };

  localStorage.setItem("estado_vista_servicio", JSON.stringify(estado));
}

/**
 * Consulta documentos de colecciones en Firestore,
 * aplicando filtros opcionales, guarda resultados en localStorage
 * y recarga la pÃ¡gina.
 *
 * @async
 * @function
 * @param {Array<{nombre: string, filtros?: Object}>} colecciones
 * @returns {Promise<void>}
 */
async function actualizarColecciones(colecciones, noReload = false) {
  const resultados = {};
  for (const item of colecciones) {
    const nombreColeccion = typeof item === "string" ? item : item.nombre;
    const filtros = typeof item === "object" ? item.filtros : null;

    try {
      mostrarBanner(`Consultando "${nombreColeccion}"...`, "info", true);

      let query = db.collection(nombreColeccion);

      // ðŸ” Aplicar filtros si existen
      if (filtros && typeof filtros === "object") {
        Object.entries(filtros).forEach(([campo, valor]) => {
          if (valor !== undefined && valor !== null && valor !== "") {
            query = query.where(campo, "==", valor);
          }
        });
      }

      const snapshot = await query.get();
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      resultados[nombreColeccion] = data;

      localStorage.setItem(`firebase_${nombreColeccion}`, JSON.stringify(data));

      cerrarBanner();
      mostrarBanner(
        `Datos de "${nombreColeccion}" actualizados âœ…`,
        "success",
        false,
        3000
      );
    } catch (err) {
      console.error(`Error al actualizar ${nombreColeccion}:`, err);
      mostrarBanner(`âŒ Error al actualizar "${nombreColeccion}"`, "danger");
      resultados[nombreColeccion] = [];
    }
  }

  // ðŸ”„ Recargar una sola vez al final
  if (!noReload) {
    guardarEstadoVista();
    location.reload();
  }
  return colecciones.length === 1
    ? resultados[typeof colecciones[0] === "string" ? colecciones[0] : colecciones[0].nombre]
    : resultados;
}

async function obtenerDataColeccion(coleccion) {
  // Intentar leer desde localStorage
  const cache = localStorage.getItem(`firebase_${coleccion}`);
  let data = [];

  if (cache) {
    console.log("âœ… Datos cargados desde localStorage.");
    data = JSON.parse(cache);
  } else {
    data = await actualizarColecciones([coleccion], true);
  }
  return data;
}

/**
 * Ordena los publicadores de una congregaciÃ³n segÃºn prioridad por rol espiritual y pertenencia a un grupo.
 * Si tienen la misma prioridad, se ordenan alfabÃ©ticamente por nombre.
 * @function
 * @param {Array<Object>} pubs - Lista de publicadores.
 * @param {number} grupo - NÃºmero identificador del grupo para filtrar relevancia.
 * @returns {Array<Object>} Lista de publicadores ordenada por prioridad y nombre.
 */
function ordenarPublicadoresGrupo(pubs, grupo) {
  return [...pubs].sort((a, b) => {
    const prioridad = (pub) => {
      const estado = pub.estadoEspiritual || [];

      if (pub.superGrupo && Number(pub.grupo) === grupo) return 0;
      if (pub.auxGrupo && Number(pub.grupo) === grupo) return 1;
      if (estado.includes("Anciano")) return 2;
      if (estado.includes("Siervo ministerial")) return 3;
      if (estado.includes("Precursor regular")) return 4;
      if (estado.includes("Precursor auxiliar")) return 5;
      if (estado.includes("Precursor auxiliar mes")) return 6;
      if (estado.includes("") || estado.length === 0) return 7;
      if (estado.includes("No bautizado")) return 8;
      if (estado.includes("Inactivo")) return 9;

      return 8;
    };

    const pA = prioridad(a);
    const pB = prioridad(b);

    if (pA !== pB) return pA - pB;

    // Mismo grupo de prioridad â†’ ordenar por nombre
    return (a.nombre || "").localeCompare(b.nombre || "");
  });
}

function mostrarFondoOscuro() {
  const sombra = document.createElement("div");
  sombra.className = "modal-backdrop-custom";
  sombra.id = "backdropCustom";
  document.body.appendChild(sombra);
}

function ocultarFondoOscuro() {
  const sombra = document.getElementById("backdropCustom");
  if (sombra) sombra.remove();
}

function restaurarFiltrosVista() {
  const estado = JSON.parse(localStorage.getItem("estado_vista_servicio"));

  if (!estado) return;

  if (estado.mes) document.getElementById("mes").value = estado.mes;
  if (estado.anio) document.getElementById("anio").value = estado.anio;
}

function restaurarPosicionVista() {
  const estado = JSON.parse(localStorage.getItem("estado_vista_servicio"));

  if (!estado) return;
  // Esperar a que el DOM y las tablas estÃ©n renderizadas
  setTimeout(() => {
    window.scrollTo({
      top: estado.scrollY || 0,
      behavior: "smooth",
    });
  }, 300);

  localStorage.removeItem("estado_vista_servicio");
}

/**
 * Consulta una colecciÃ³n de Firestore con filtros opcionales
 * y retorna los datos.
 *
 * @param {string} coleccion - Nombre de la colecciÃ³n
 * @param {Object} filtros - Filtros opcionales { campo: valor }
 * @returns {Promise<Array<Object>>}
 */
async function consultarFirebase(coleccion, filtros = {}) {
  let query = db.collection(coleccion);

  Object.entries(filtros).forEach(([campo, valor]) => {
    if (Array.isArray(valor)) {
      query = query.where(campo, "in", valor);
    } else {
      query = query.where(campo, "==", valor);
    }
  });

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

