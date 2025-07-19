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
  let pagina = path.substring(path.lastIndexOf("/") + 1).split('.')[0];
  const menu = document.getElementById('menu');
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
            <a class="nav-link ${pagina === 'publicadores' && 'active'}" href="publicadores.html">👨‍👩‍👧‍👦 Publicadores</a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${pagina === 'reuniones' && 'active'}" href="reuniones.html">📅 Reuniones</a>
          </li>
          <li class="nav-item">
            <a class="nav-link  ${pagina === 'servicio' && 'active'}" href="servicio.html">💼 Servicio</a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${pagina === 'configuracion' && 'active'}" href="configuracion.html">⚙ Configuración</a>
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
  await cargarScript("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js");

  // ✅ 2. Firebase core
  await cargarScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
  await cargarScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js");
  await cargarScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js");

  // ✅ 3. Tu inicialización de Firebase
  await cargarScript("scripts/firebase-config.js");

  // ✅ 4. Scripts globales
  await cargarScript("main.js");
  await cargarScript("scripts/auth.js");

  auth.onAuthStateChanged(user => {
      if (!user) {
          window.location.href = "login.html";
      }
  })

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
function mostrarBanner(mensaje, tipo = 'info', conSpinner = false, duracion = null) {
  const banner = document.getElementById('bannerEstado');
  if (!banner) return;

  // Limpiar clases anteriores
  banner.className = 'alert text-center m-0 py-2 banner';
  banner.classList.add(`alert-${tipo}`);

  // Construir contenido
  banner.innerHTML = conSpinner
    ? `<span class="spinner-emoji">📀</span> ${mensaje}`
    : mensaje;

  banner.classList.remove('d-none');

  if (duracion) {
    setTimeout(() => {
      banner.classList.add('d-none');
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
      mostrarBanner("⚠️ No hay configuración en Firestore", "warning", false, 3000);
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

/**
 * Consulta los documentos de una colección específica en Firestore,
 * guarda los resultados en localStorage, y recarga la página.
 * @async
 * @function
 * @param {string} coleccion - Nombre de la colección a consultar.
 * @returns {Promise<Array<Object>>} Array de objetos con los datos de cada documento.
 */
async function actualizarColeccion(coleccion) {
  try {
    mostrarBanner(`Consultando "${coleccion}"...`, "info", true);

    const snapshot = await db.collection(coleccion).get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    localStorage.setItem(`firebase_${coleccion}`, JSON.stringify(data));

    cerrarBanner();
    mostrarBanner(`Datos de "${coleccion}" actualizados ✅`, "success", false, 3000);
    location.reload()
    return data;
  } catch (err) {
    console.error(`Error al actualizar ${coleccion}:`, err);
    mostrarBanner(`❌ Error al actualizar "${coleccion}"`, "danger");
    return [];
  }
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
    const prioridad = pub => {
      const estado = pub.estadoEspiritual || [];

      if (pub.superGrupo && Number(pub.grupo) === grupo) return 0;
      if (pub.auxGrupo && Number(pub.grupo) === grupo) return 1;
      if (estado.includes("Anciano")) return 2;
      if (estado.includes("Siervo ministerial")) return 3;
      if (estado.includes("Precursor regular")) return 4;
      if (estado.includes("") || estado.length === 0) return 5;
      if (estado.includes("No bautizado")) return 6;
      if (estado.includes("Inactivo")) return 7;

      return 8;
    };

    const pA = prioridad(a);
    const pB = prioridad(b);

    if (pA !== pB) return pA - pB;

    // Mismo grupo de prioridad → ordenar por nombre
    return (a.nombre || "").localeCompare(b.nombre || "");
  });
}
