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
 * Carga un archivo JavaScript de manera dinámica y lo agrega al DOM si no ha sido cargado antes.
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
    script.onerror = () => reject(`❌ Error cargando: ${src}`);
    document.body.appendChild(script);
  });
}

/**
 * Carga el menú principal dinámicamente en función de la URL actual,
 * y carga los scripts necesarios por página incluyendo dependencias globales.
 * También valida la sesión del usuario mediante Firebase Auth.
 * @async
 * @function
 * @returns {Promise<void>} Promesa que se resuelve cuando todos los scripts están cargados.
 */

async function cargarMenuYScripts() {
  const path = window.location.pathname;
  let pagina = path.substring(path.lastIndexOf("/") + 1).split(".")[0];
  const menu = document.getElementById("menu");
  if (menu) {
    menu.innerHTML = `
    <div class="container-fluid">
      <a class="navbar-brand" href="index.html">🏠 DigitCong</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <a class="nav-link ${
              pagina === "publicadores" && "active"
            }" href="publicadores.html">👨‍👩‍👧‍👦 Publicadores</a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${
              pagina === "reuniones" && "active"
            }" href="reuniones.html">📅 Reuniones</a>
          </li>
          <li class="nav-item">
            <a class="nav-link  ${
              pagina === "servicio" && "active"
            }" href="servicio.html">💼 Servicio</a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${
              pagina === "configuracion" && "active"
            }" href="configuracion.html">⚙ Configuración</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" onclick="cerrarSesion()">❗ Cerrar sesión</a>
          </li>
        </ul>
      </div>
    </div>
    `;
  }
  // ✅ 1. Bootstrap
  await cargarScript(
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
  );

  // ✅ 2. Firebase core
  await cargarScript(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
  );
  await cargarScript(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"
  );
  await cargarScript(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"
  );

  // ✅ 3. Tu inicialización de Firebase
  await cargarScript("scripts/firebase-config.js");

  // ✅ 4. Scripts globales
  await cargarScript("main.js");
  await cargarScript("scripts/auth.js");

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
    }
  });

  // ✅ 5. Script por página
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
    case "servicio":
      await cargarScript("scripts/servicio.js");
      break;
    case "configuracion":
      await cargarScript("scripts/configuracion.js");
      break;
  }
}

/**
 * Muestra un banner de estado fijo arriba
 * @param {string} mensaje - El texto a mostrar (puede incluir HTML)
 * @param {string} tipo - info | success | danger | warning
 * @param {boolean} conSpinner - Si debe girar el emoji 🌀
 * @param {number} duracion - Duración opcional para ocultarse (en ms)
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
    ? `<span class="spinner-emoji">📀</span> ${mensaje}`
    : mensaje;

  banner.classList.remove("d-none");

  if (duracion) {
    setTimeout(() => {
      banner.classList.add("d-none");
    }, duracion);
  }
}

/**
 * Oculta el banner de estado si está presente en el DOM.
 * @function
 */
function cerrarBanner() {
  const banner = document.getElementById("bannerEstado");
  if (banner) banner.classList.add("d-none");
}

/**
 * Carga la configuración general de la congregación.
 * Intenta recuperar la data desde localStorage primero, y si no existe, la consulta desde Firestore.
 * La configuración se almacena en localStorage para futuras llamadas.
 * @async
 * @function
 * @returns {Promise<Object|null>} Retorna el objeto de configuración si se encuentra, o `null` si hay error o no existe en Firestore.
 */
async function cargarConfiguracionGlobal() {
  const cacheKey = "configuracion_congregacion";

  // 1. Si ya está en localStorage, usarla
  const cache = localStorage.getItem(cacheKey);
  if (cache) {
    console.log("✅ Configuración cargada desde localStorage");
    return JSON.parse(cache);
  }

  // 2. Si no está, pedirla a Firestore
  try {
    mostrarBanner("Cargando información...", "info", true);

    const doc = await db.collection("configuracion").doc("global").get();
    cerrarBanner();

    if (!doc.exists) {
      mostrarBanner(
        "⚠️ No hay configuración en Firestore",
        "warning",
        false,
        3000
      );
      return null;
    }

    const config = doc.data();

    // Guardar en localStorage
    localStorage.setItem(cacheKey, JSON.stringify(config));
    console.log("📦 Configuración guardada en localStorage");

    return config;
  } catch (err) {
    cerrarBanner();
    console.error("❌ Error al obtener configuración:", err);
    mostrarBanner("❌ Error al obtener configuración", "danger");
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
 * y recarga la página.
 *
 * @async
 * @function
 * @param {Array<{nombre: string, filtros?: Object}>} colecciones
 * @returns {Promise<void>}
 */
async function actualizarColecciones(colecciones, noReload = false) {
  for (const item of colecciones) {
    const nombreColeccion = typeof item === "string" ? item : item.nombre;
    const filtros = typeof item === "object" ? item.filtros : null;

    try {
      mostrarBanner(`Consultando "${nombreColeccion}"...`, "info", true);

      let query = db.collection(nombreColeccion);

      // 🔍 Aplicar filtros si existen
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

      localStorage.setItem(`firebase_${nombreColeccion}`, JSON.stringify(data));

      cerrarBanner();
      mostrarBanner(
        `Datos de "${nombreColeccion}" actualizados ✅`,
        "success",
        false,
        3000
      );
    } catch (err) {
      console.error(`Error al actualizar ${nombreColeccion}:`, err);
      mostrarBanner(`❌ Error al actualizar "${nombreColeccion}"`, "danger");
    }
  }

  // 🔄 Recargar una sola vez al final
  if (!noReload) {
    guardarEstadoVista();
    location.reload();
  }
}

async function obtenerDataColeccion(coleccion) {
  // Intentar leer desde localStorage
  const cache = localStorage.getItem(`firebase_${coleccion}`);
  let data = [];

  if (cache) {
    console.log("✅ Datos cargados desde localStorage.");
    data = JSON.parse(cache);
  } else {
    // Si no hay cache, cargar y guardar
    data = await actualizarColecciones([coleccion]);
  }
  return data;
}

/**
 * Ordena los publicadores de una congregación según prioridad por rol espiritual y pertenencia a un grupo.
 * Si tienen la misma prioridad, se ordenan alfabéticamente por nombre.
 * @function
 * @param {Array<Object>} pubs - Lista de publicadores.
 * @param {number} grupo - Número identificador del grupo para filtrar relevancia.
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
      if (estado.includes("") || estado.length === 0) return 6;
      if (estado.includes("No bautizado")) return 7;
      if (estado.includes("Inactivo")) return 8;

      return 8;
    };

    const pA = prioridad(a);
    const pB = prioridad(b);

    if (pA !== pB) return pA - pB;

    // Mismo grupo de prioridad → ordenar por nombre
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
  // Esperar a que el DOM y las tablas estén renderizadas
  setTimeout(() => {
    window.scrollTo({
      top: estado.scrollY || 0,
      behavior: "smooth",
    });
  }, 300);

  localStorage.removeItem("estado_vista_servicio");
}

/**
 * Consulta una colección de Firestore con filtros opcionales
 * y retorna los datos.
 *
 * @param {string} coleccion - Nombre de la colección
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
