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
  banner.className = 'alert text-center m-0 py-2';
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

function cerrarBanner() {
  const banner = document.getElementById("bannerEstado");
  if (banner) banner.classList.add("d-none");
}

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

function getConfig() {
  const cache = localStorage.getItem("configuracion_congregacion");
  return cache ? JSON.parse(cache) : null;
}

async function actualizarColeccion(coleccion) {
  try {
    mostrarBanner(`Consultando "${coleccion}"...`, "info", true);

    const snapshot = await db.collection(coleccion).get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    localStorage.setItem(`firebase_${coleccion}`, JSON.stringify(data));

    cerrarBanner();
    mostrarBanner(`Datos de "${coleccion}" actualizados ✅`, "success", false, 3000);

    return data;
  } catch (err) {
    console.error(`Error al actualizar ${coleccion}:`, err);
    mostrarBanner(`❌ Error al actualizar "${coleccion}"`, "danger");
    return [];
  }
}