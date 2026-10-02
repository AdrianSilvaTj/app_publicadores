// 1. Referencia a Firestore
const formConfig = document.getElementById("formConfiguracion");
const selects = {
  coordinador: document.getElementById("coordinador"),
  secretario: document.getElementById("secretario"),
  superServicio: document.getElementById("superServicio"),
  superAtalaya: document.getElementById("superAtalaya"),
  auxAtalaya: document.getElementById("auxAtalaya"),
  superReunionVidaMinisterio: document.getElementById("superReunionVidaMinisterio"),
  encargadoAudioVideo: document.getElementById("encargadoAudioVideo"),
  encargadoCuentas: document.getElementById("encargadoCuentas"),
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
      publicadores = await actualizarColecciones(["publicadores"], true);
    }

    const ancianos = publicadores.filter((pub) =>
      (pub.estadoEspiritual || []).includes("Anciano")
    );
    const varonesBautizados = publicadores.filter((pub) =>
      pub.sexo === "M" && !(pub.estadoEspiritual || []).includes("No bautizado")
    );
    const agregarOpciones = (selectsDestino, lista) => lista.forEach((doc) => {
      const option = document.createElement("option");
      option.value = doc.id; // guardamos el ID del publicador
      option.textContent = doc.nombre;
      selectsDestino.forEach((select) => {
        select.appendChild(option.cloneNode(true));
      });
    });
    agregarOpciones([selects.coordinador, selects.secretario, selects.superServicio, selects.superAtalaya, selects.auxAtalaya, selects.superReunionVidaMinisterio], ancianos);
    agregarOpciones([selects.encargadoAudioVideo, selects.encargadoCuentas], varonesBautizados);
    cerrarBanner();
  } catch (err) {
    console.error("Error al cargar ancianos:", err);
    mostrarBanner("❌ Error al cargar ancianos", "danger");
  }
}

// 3. Guardar configuración en Firestore
formConfig.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nombreCongregacion: document
      .getElementById("nombreCongregacion")
      .value.trim(),
    numeroCongregacion: document
      .getElementById("numeroCongregacion")
      .value.trim(),
    cantidadGrupos: parseInt(document.getElementById("cantidadGrupos").value),
    horasMensualesPrecursoresRegulares: Number(document.getElementById("horasMensualesPrecursoresRegulares").value) || 0,
    organigrama: {
      coordinador: selects.coordinador.value,
      secretario: selects.secretario.value,
      superServicio: selects.superServicio.value,
      superAtalaya: selects.superAtalaya.value,
      auxAtalaya: selects.auxAtalaya.value,
      superReunionVidaMinisterio: selects.superReunionVidaMinisterio.value,
      encargadoAudioVideo: selects.encargadoAudioVideo.value,
      encargadoCuentas: selects.encargadoCuentas.value,
    },
    actualizado: new Date(),
  };

  try {
    await db.collection("configuracion").doc("global").set(data); // documento único
    localStorage.setItem("configuracion_congregacion", JSON.stringify(data));
    mostrarBanner(
      "Configuración guardada con éxito ✅",
      "success",
      false,
      3000
    );
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
      mostrarBanner(
        "No hay configuración guardada aún ⚠️",
        "warning",
        false,
        3000
      );
      return;
    }

    // Llenar campos
    document.getElementById("nombreCongregacion").value =
      data.nombreCongregacion || "";
    document.getElementById("numeroCongregacion").value =
      data.numeroCongregacion || "";
    document.getElementById("cantidadGrupos").value = data.cantidadGrupos || "";
    document.getElementById("horasMensualesPrecursoresRegulares").value = data.horasMensualesPrecursoresRegulares ?? "";

    if (data.organigrama) {
      document.getElementById("coordinador").value =
        data.organigrama.coordinador || "";
      document.getElementById("secretario").value =
        data.organigrama.secretario || "";
      document.getElementById("superServicio").value =
        data.organigrama.superServicio || "";
      document.getElementById("superAtalaya").value =
        data.organigrama.superAtalaya || "";
      document.getElementById("auxAtalaya").value =
        data.organigrama.auxAtalaya || "";
      document.getElementById("superReunionVidaMinisterio").value =
        data.organigrama.superReunionVidaMinisterio || "";
      document.getElementById("encargadoAudioVideo").value =
        data.organigrama.encargadoAudioVideo || "";
      document.getElementById("encargadoCuentas").value =
        data.organigrama.encargadoCuentas || "";
    }

    mostrarBanner(
      "Configuración cargada correctamente ✅",
      "success",
      false,
      3000
    );
  } catch (err) {
    cerrarBanner();
    console.error("Error al cargar configuración:", err);
    mostrarBanner("❌ Error al cargar configuración", "danger");
  }
}

async function migrarCamposHistoricosServicio() {
  try {
    mostrarBanner("Consultando informes de servicio...", "info", true);
    const [servicioSnapshot, publicadoresSnapshot] = await Promise.all([
      db.collection("servicio").get(),
      db.collection("publicadores").get(),
    ]);
    const publicadoresPorId = new Map(
      publicadoresSnapshot.docs.map((doc) => [doc.id, doc.data()]),
    );

    let batch = db.batch();
    let operacionesEnLote = 0;
    let migrados = 0;
    let yaCompletos = 0;
    const confirmarLote = async () => {
      if (!operacionesEnLote) return;
      await batch.commit();
      batch = db.batch();
      operacionesEnLote = 0;
    };

    for (const doc of servicioSnapshot.docs) {
      const informe = doc.data();
      const actualizacion = {};
      const publicador = publicadoresPorId.get(String(informe.publicadorId));
      const estados = publicador?.estadoEspiritual || [];

      if (typeof informe.activo !== "boolean") {
        const inactivoEseMes =
          informe.participo === false && /\binactivo\b/i.test(String(informe.notas || ""));
        actualizacion.activo = !inactivoEseMes;
      }

      if (!Object.prototype.hasOwnProperty.call(informe, "privilegio")) {
        let privilegio = null;
        if (informe.auxiliar === true && publicador) {
          privilegio = estados.includes("Precursor auxiliar")
            ? "auxiliar"
            : "auxiliar_mes";
        } else if (
          publicador &&
          estados.includes("Precursor regular") &&
          Number(informe.horas) > 0
        ) {
          privilegio = "regular";
        }
        actualizacion.privilegio = privilegio;
      }

      if (!Object.keys(actualizacion).length) {
        yaCompletos++;
        continue;
      }

      batch.set(doc.ref, actualizacion, { merge: true });
      operacionesEnLote++;
      migrados++;
      if (operacionesEnLote === 400) await confirmarLote();
    }

    await confirmarLote();
    localStorage.removeItem("firebase_servicio");
    mostrarBanner(
      `✅ Migración terminada: ${migrados} registros actualizados, ${yaCompletos} ya estaban completos.`,
      "success",
      false,
      8000,
    );
  } catch (error) {
    console.error("Error migrando campos históricos del servicio:", error);
    mostrarBanner("❌ No se pudo completar la migración de servicio", "danger");
  }
}

// 4. Inicialización
cargarAncianos().then(() => {
  cargarConfiguracion();
});

document
  .getElementById("archivoExcel")
  .addEventListener("change", async function (e) {
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
      publicadores = publicadores.map((pub) => ({
        nombre: pub.Nombre?.trim() || "",
        grupo: parseInt(pub.Grupo) || "",
        sexo: pub.Sexo?.toUpperCase(),
        esperanza: pub.Esperanza || "",
        estadoEspiritual: (pub.EstadoEspiritual || "")
          .split(",")
          .map((p) => p.trim()),
        privilegiosCongregacion: (pub.PrivilegiosCongregacion || "")
          .split(",")
          .map((p) => p.trim()),
      }));

      localStorage.setItem("import_publicadores", JSON.stringify(publicadores));
      mostrarBanner(
        `✅ ${publicadores.length} publicadores cargados del Excel`,
        "success",
        false,
        4000
      );
    } catch (err) {
      console.error("❌ Error al leer Excel:", err);
      mostrarBanner("❌ Error al procesar el archivo Excel", "danger");
    }
  });

document
  .getElementById("archivoExcelServicio")
  .addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let servicio = XLSX.utils.sheet_to_json(sheet);

      if (!Array.isArray(servicio) || servicio.length === 0) {
        mostrarBanner("❌ El archivo no contiene datos válidos.", "danger");
        return;
      }

      // Guardar temporalmente en localStorage (igual que publicadores)
      localStorage.setItem("import_servicio", JSON.stringify(servicio));

      mostrarBanner(
        `✅ ${servicio.length} registros de servicio cargados del Excel`,
        "success",
        false,
        4000
      );
    } catch (err) {
      console.error("❌ Error al leer Excel de servicio:", err);
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

    const batchSize = 400;
    for (let inicio = 0; inicio < publicadores.length; inicio += batchSize) {
      const lote = db.batch();
      publicadores.slice(inicio, inicio + batchSize).forEach((pub) => {
        lote.set(db.collection("publicadores").doc(), pub);
      });
      await lote.commit();
    }

    mostrarBanner(
      `✅ ${publicadores.length} publicadores guardados en Firebase`,
      "success",
      false,
      4000
    );

    localStorage.removeItem("import_publicadores"); // limpiar
    localStorage.removeItem("firebase_publicadores");
    document.getElementById("archivoExcel").value = ""; // reset file input
  } catch (err) {
    console.error("❌ Error al guardar en Firebase:", err);
    mostrarBanner("❌ Error al guardar publicadores", "danger");
  }
}

async function reiniciarPublicadores() {
  const confirmar = await confirmarAccion(
    "⚠️ ¿Estás seguro de que deseas eliminar TODOS los publicadores? Esta acción no se puede deshacer.",
    { titulo: "Eliminar todos los publicadores", textoConfirmar: "Eliminar todo", claseConfirmar: "btn-danger" },
  );

  if (!confirmar) return;

  try {
    mostrarBanner("Eliminando todos los publicadores...", "warning", true);

    const snapshot = await db.collection("publicadores").get();

    const lotes = [];

    snapshot.forEach((doc) => {
      lotes.push(db.collection("publicadores").doc(doc.id).delete());
    });

    await Promise.all(lotes);

    localStorage.removeItem("firebase_publicadores");

    mostrarBanner(
      "✅ Todos los publicadores fueron eliminados",
      "success",
      false,
      4000
    );

    // Refrescar vista
    await actualizarColecciones(["publicadores"]);
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

    snapshot.forEach((doc) => {
      backupData[colName].push({
        id: doc.id,
        ...doc.data(),
      });
    });
  }

  // Generar archivo JSON
  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `firebase_backup_${new Date().toISOString().slice(0, 10)}.json`;
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

        docs.forEach((doc) => {
          const docRef = colRef.doc(doc.id);
          const { id, ...data } = doc;
          batch.set(docRef, data);
        });
      }

      await batch.commit();
      mostrarBanner(
        "✅ Restore realizado correctamente",
        "success",
        false,
        4000
      );
    } catch (err) {
      console.error("❌ Error restaurando:", err);
      mostrarBanner("❌ Ocurrió un error al restaurar.", "danger", false, 4000);
    }
  };

  reader.readAsText(file);
}

function verificarUsuario() {
  const user = localStorage.getItem("user");
  if (!user) return;
  const seccion = document.getElementById("advanced-section");
  if (seccion) {
    user.toLowerCase() === "adrian.silva.tj@gmail.com"
      ? seccion.removeAttribute("hidden")
      : seccion.setAttribute("hidden", true);
  }
}

async function cargarServicioDesdeExcel(filasExcel) {
  const publicadores = JSON.parse(
    localStorage.getItem("firebase_publicadores") || "[]"
  );

  if (!publicadores.length) {
    return alert("No hay publicadores en localStorage");
  }

  mostrarBanner("Cargando servicio desde Excel...", "info", true);

  const batch = db.batch();
  let guardados = 0;
  let omitidos = 0;

  filasExcel.forEach((row) => {
    const nombreExcel = (row.publicador || "").toString().toLowerCase().trim();
    if (!nombreExcel) return;

    // 🔍 Buscar publicador por nombre
    const pub = publicadores.find((p) =>
      p.nombre.toLowerCase().includes(nombreExcel)
    );

    if (!pub) {
      console.log(`No se pudo crear el servicio de: ${nombreExcel}`);
      omitidos++;
      return; // no se guarda
    }

    const publicadorId = pub.id;
    const grupo = pub.grupo;

    const mes = Number(row.mes);
    const anio = Number(row.anio);

    if (!mes || !anio) {
      omitidos++;
      return;
    }

    // 🧠 Reglas de horas / auxiliar
    const horasAux = Number(row.horas_auxiliar) || 0;
    const horasNormal = Number(row.horas) || 0;

    const auxiliar = horasAux > 0;
    const horas = auxiliar ? horasAux : horasNormal;

    const docId = `${publicadorId}_${grupo}_${anio}_${mes}`;
    const ref = db.collection("servicio").doc(docId);
    const participo = String(row.participo).toLowerCase() === "si";
    let notas = row.notas + " " + (!participo ? "No participó." : "");
    notas = notas.trim()

    const data = {
      publicadorId,
      grupo,
      mes,
      anio,
      participo,
      cursos: Number(row.cursos) || 0,
      auxiliar,
      horas,
      notas,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(ref, data, { merge: true });
    guardados++;
  });

  await batch.commit();

  mostrarBanner(
    `✅ Servicio cargado: ${guardados} guardados, ${omitidos} omitidos`,
    "success",
    false,
    4000
  );
}

async function guardarServicioImportados() {
  const data = localStorage.getItem("import_servicio");

  if (!data) {
    mostrarBanner(
      "⚠️ No hay datos de servicio importados",
      "warning",
      false,
      3000
    );
    return;
  }

  const filasExcel = JSON.parse(data);

  try {
    await cargarServicioDesdeExcel(filasExcel);

    localStorage.removeItem("import_servicio");
    document.getElementById("archivoExcelServicio").value = "";
  } catch (err) {
    console.error("❌ Error al guardar servicio:", err);
    mostrarBanner("❌ Error al guardar servicio", "danger");
  }
}

async function reiniciarServicio() {
  const confirmar = await confirmarAccion(
    "⚠️ ¿Estás seguro de que deseas eliminar TODOS los registros de servicio?",
    { titulo: "Eliminar todo el servicio", textoConfirmar: "Eliminar todo", claseConfirmar: "btn-danger" },
  );
  if (!confirmar) return;

  try {
    mostrarBanner("Eliminando servicio...", "warning", true);

    const snapshot = await db.collection("servicio").get();
    const promesas = [];

    snapshot.forEach((doc) => {
      promesas.push(db.collection("servicio").doc(doc.id).delete());
    });

    await Promise.all(promesas);

    mostrarBanner(
      "✅ Servicio eliminado correctamente",
      "success",
      false,
      4000
    );
  } catch (err) {
    console.error("❌ Error al reiniciar servicio:", err);
    mostrarBanner("❌ Error al eliminar servicio", "danger");
  }
}
