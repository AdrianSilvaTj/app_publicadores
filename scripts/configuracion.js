// 1. Referencia a Firestore
const formConfig = document.getElementById("formConfiguracion");
const selects = {
  coordinador: document.getElementById("coordinador"),
  secretario: document.getElementById("secretario"),
  superServicio: document.getElementById("superServicio"),
  superAtalaya: document.getElementById("superAtalaya"),
  auxAtalaya: document.getElementById("auxAtalaya"),
};


// 2. Cargar publicadores con privilegio "Anciano"
async function cargarAncianos() {
  mostrarBanner("Cargando información...", "info", true);
  try {
    // Intentar leer desde localStorage
    const cache = localStorage.getItem("firebase_publicadores");
    let publicadores = [];

    if (cache) {
      publicadores = JSON.parse(cache);
      console.log("✅ Datos cargados desde localStorage.");
    } else {
      // Si no hay cache, cargar y guardar
      publicadores = await actualizarColeccion("publicadores");
    }

    publicadores = publicadores.filter(pub => (pub.estadoEspiritual || []).includes("Anciano"))
    publicadores.forEach(doc => {
      const option = document.createElement("option");
      option.value = doc.id; // guardamos el ID del publicador
      option.textContent = doc.nombre;

      // Agregar la misma opción a todos los selects
      Object.values(selects).forEach(select => {
        select.appendChild(option.cloneNode(true));
      });
    });
    cerrarBanner()
  } catch (err) {
    console.error("Error al cargar ancianos:", err);
    mostrarBanner("❌ Error al cargar ancianos", "danger");
  }
}


// 3. Guardar configuración en Firestore
formConfig.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nombreCongregacion: document.getElementById("nombreCongregacion").value.trim(),
    numeroCongregacion: document.getElementById("numeroCongregacion").value.trim(),
    cantidadGrupos: parseInt(document.getElementById("cantidadGrupos").value),
    organigrama: {
      coordinador: selects.coordinador.value,
      secretario: selects.secretario.value,
      superServicio: selects.superServicio.value,
      superAtalaya: selects.superAtalaya.value,
      auxAtalaya: selects.auxAtalaya.value,
    },
    actualizado: new Date()
  };

  try {
    await db.collection("configuracion").doc("global").set(data); // documento único
    localStorage.setItem("configuracion_congregacion", JSON.stringify(data));
    mostrarBanner("Configuración guardada con éxito ✅", "success", false, 3000);
  } catch (err) {
    console.error("Error al guardar configuración:", err);
    mostrarBanner("❌ Error al guardar configuración", "danger");
  }
});


async function cargarConfiguracion() {
  try {
    mostrarBanner("Cargando configuración...", "info", true);

    const data = await cargarConfiguracionGlobal(); // 🔄 usar la nueva función

    cerrarBanner();

    if (!data) {
      mostrarBanner("No hay configuración guardada aún ⚠️", "warning", false, 3000);
      return;
    }

    // Llenar campos
    document.getElementById("nombreCongregacion").value = data.nombreCongregacion || "";
    document.getElementById("numeroCongregacion").value = data.numeroCongregacion || "";
    document.getElementById("cantidadGrupos").value = data.cantidadGrupos || "";

    if (data.organigrama) {
      document.getElementById("coordinador").value = data.organigrama.coordinador || "";
      document.getElementById("secretario").value = data.organigrama.secretario || "";
      document.getElementById("superServicio").value = data.organigrama.superServicio || "";
      document.getElementById("superAtalaya").value = data.organigrama.superAtalaya || "";
      document.getElementById("auxAtalaya").value = data.organigrama.auxAtalaya || "";
    }

    mostrarBanner("Configuración cargada correctamente ✅", "success", false, 3000);
  } catch (err) {
    cerrarBanner();
    console.error("Error al cargar configuración:", err);
    mostrarBanner("❌ Error al cargar configuración", "danger");
  }
}


// 4. Inicialización
cargarAncianos().then(() => {
  cargarConfiguracion();
});


document.getElementById("archivoExcel").addEventListener("change", async function (e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let publicadores = XLSX.utils.sheet_to_json(sheet);

    if (!Array.isArray(publicadores) || publicadores.length === 0) {
      mostrarBanner("❌ El archivo no contiene datos válidos.", "danger");
      return;
    }

    // Formatear campos clave
    publicadores = publicadores.map(pub => ({
      nombre: pub.Nombre?.trim() || "",
      grupo: parseInt(pub.Grupo) || "",
      sexo: pub.Sexo?.toUpperCase(),
      esperanza: pub.Esperanza || "",
      estadoEspiritual: (pub.EstadoEspiritual || "").split(",").map(p => p.trim()),
      privilegiosCongregacion: (pub.PrivilegiosCongregacion || "").split(",").map(p => p.trim()),
    }));

    localStorage.setItem("import_publicadores", JSON.stringify(publicadores));
    mostrarBanner(`✅ ${publicadores.length} publicadores cargados del Excel`, "success", false, 4000);

  } catch (err) {
    console.error("❌ Error al leer Excel:", err);
    mostrarBanner("❌ Error al procesar el archivo Excel", "danger");
  }
});


async function guardarPublicadoresImportados() {
  const data = localStorage.getItem("import_publicadores");
  if (!data) {
    mostrarBanner("⚠️ No hay datos importados", "warning", false, 3000);
    return;
  }

  const publicadores = JSON.parse(data);

  try {
    mostrarBanner("Subiendo publicadores a Firebase...", "info", true);

    const batchSize = 50; // Control por lotes si necesitas
    const promesas = publicadores.map(pub => db.collection("publicadores").add(pub));
    await Promise.all(promesas);

    mostrarBanner(`✅ ${publicadores.length} publicadores guardados en Firebase`, "success", false, 4000);

    localStorage.removeItem("import_publicadores"); // limpiar
    document.getElementById("archivoExcel").value = ""; // reset file input

  } catch (err) {
    console.error("❌ Error al guardar en Firebase:", err);
    mostrarBanner("❌ Error al guardar publicadores", "danger");
  }
}


async function reiniciarPublicadores() {
  const confirmar = confirm("⚠️ ¿Estás seguro de que deseas eliminar TODOS los publicadores? Esta acción no se puede deshacer.");

  if (!confirmar) return;

  try {
    mostrarBanner("Eliminando todos los publicadores...", "warning", true);

    const snapshot = await db.collection("publicadores").get();

    const lotes = [];

    snapshot.forEach(doc => {
      lotes.push(db.collection("publicadores").doc(doc.id).delete());
    });

    await Promise.all(lotes);

    localStorage.removeItem("firebase_publicadores");

    mostrarBanner("✅ Todos los publicadores fueron eliminados", "success", false, 4000);

    // Refrescar vista
    await actualizarColeccion("publicadores");
  } catch (err) {
    console.error("Error al reiniciar publicadores:", err);
    mostrarBanner("❌ Error al eliminar publicadores", "danger");
  }
}


async function backupFirebaseDB() {
  const db = firebase.firestore();
  const colecciones = ["publicadores", "configuracion", "reuniones"]; // 🔁 agrega aquí tus colecciones
  const backupData = {};

  mostrarBanner("Generando backup...", "warning", true);

  for (const colName of colecciones) {
    const snapshot = await db.collection(colName).get();
    backupData[colName] = [];

    snapshot.forEach(doc => {
      backupData[colName].push({
        id: doc.id,
        ...doc.data()
      });
    });
  }

  // Generar archivo JSON
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `firebase_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  mostrarBanner("✅ Backup creado correctamente", "success", false, 4000);
}


async function restoreFirebaseDBFromFile(file) {
  mostrarBanner("Restaurando backup...", "warning", true);
  const db = firebase.firestore();

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const backupData = JSON.parse(e.target.result);
      const batch = db.batch();

      for (const [colName, docs] of Object.entries(backupData)) {
        const colRef = db.collection(colName);

        docs.forEach(doc => {
          const docRef = colRef.doc(doc.id);
          const { id, ...data } = doc;
          batch.set(docRef, data);
        });
      }

      await batch.commit();
      mostrarBanner("✅ Restore realizado correctamente", "success", false, 4000);
      
    } catch (err) {
      console.error("❌ Error restaurando:", err);
      mostrarBanner("❌ Ocurrió un error al restaurar.", "danger", false, 4000);
    }
  };

  reader.readAsText(file);
}

function verificarUsuario() {
  const user = localStorage.getItem('user');
  if (!user) return;
  const seccion = document.getElementById('advanced-section');
  if (seccion) {
    user.toLowerCase() === "adrian.silva.tj@gmail.com" ?
      seccion.removeAttribute("hidden") : seccion.setAttribute('hidden', true);
  }
}


