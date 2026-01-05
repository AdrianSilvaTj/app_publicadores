// Variable globales
publicadores = [];
auxUltimasAsig = [];

function obtenerPublicador(id) {
  return publicadores.find((pub) => pub.id === id);
}

function obtenerSeccionesNVC(reunion) {
  let secciones = `
    <div class="row g-0">
      <span class="col-12 borde-celda"><b>Canción intermedia:</b> ${reunion.cancionInt}</span>
    </div>
  `;
  reunion.nvc.secciones.forEach((sec) => {
    secciones += `
      <div class="row g-0">
        <span class="col-md-6 borde-celda"><b>Título:</b></br>${
          sec.nvcTitulo
        }</span>
        <span class="col-md-6 borde-celda"><b>Encargado:</b></br>
          ${obtenerPublicador(sec.nvcEncargado)?.nombre}</span>
      </div>
    `;
  });
  secciones += `
    <div class="row g-0">
      <span class="col-md-6 borde-celda">
        <b>Estudio bíblico de la congregación (Conductor):</b></br>
        ${obtenerPublicador(reunion.nvc.estudioLibro)?.nombre}</span>
      <span class="col-md-6 borde-celda"><b>Lector:</b></br>
        ${obtenerPublicador(reunion.nvc.lectorEstudioLibro)?.nombre}</span>
    </div>
    <div class="row g-0">
      <span class="col-md-6 borde-celda"><b>Canción final:</b></br>
        ${reunion.cancionFin}</span>
      <span class="col-md-6 borde-celda"><b>Oración final:</b></br>
        ${obtenerPublicador(reunion.oracionFin)?.nombre}</span>
    </div>
  `;

  return secciones;
}

function obtenerSeccionesSMM(reunion) {
  let secciones = "";
  reunion.smm.forEach((sec) => {
    secciones += `
      <div class="row g-0">
        <span class="col-md-4 borde-celda"><b>Título:</b></br>${
          sec.smmTitulo
        }</span>
        <span class="col-md-4 borde-celda"><b>Encargado (Principal):</b></br>
          ${obtenerPublicador(sec.smmEncargado)?.nombre}</span>
    `;
    sec.smmAyudante &&
      (secciones += `
        <span class="col-md-4 borde-celda"><b>Ayudante (Principal):</b></br>
          ${obtenerPublicador(sec.smmAyudante)?.nombre}</span>
      `);
    secciones += "</div>";
    sec.smmAuxEnc &&
      (secciones += `
      <div class="row g-0">
        <span class="col-md-4 borde-celda"></span>
        <span class="col-md-4 borde-celda"><b>Encargado (Auxiliar):</b></br>
          ${obtenerPublicador(sec.smmAuxEnc)?.nombre}</span>
      `);
    sec.smmAuxAyud &&
      (secciones += `
        <span class="col-md-4 borde-celda"><b>Ayudante (Auxiliar):</b></br>
          ${obtenerPublicador(sec.smmAuxAyud)?.nombre}</span>
      `);
    (sec.smmAuxEnc || sec.smmAuxAyud) && (secciones += "</div>");
  });
  return secciones;
}

function renderDetalleReunion(reunion) {
  return `
    <div class="row g-0">
      <span class="col-md-6 borde-celda"><b>Canción inicial:</b></br>${
        reunion.cancionIni
      }</span>
      <span class="col-md-6 borde-celda"><b>Presidente:</b></br>
        ${obtenerPublicador(reunion.presidente)?.nombre}</span>
    </div>
    <div class="row g-0">
      <span class="col-md-6 borde-celda"><b>Oración inicial:</b></br>
        ${obtenerPublicador(reunion.oracionIni)?.nombre}</span>
      <span class="col-md-6 borde-celda"><b>Consejero sala auxiliar:</b></br>
        ${obtenerPublicador(reunion.consejAux)?.nombre}</span>
    </div>
    <h5 class="mt-2" style="background-color: #575a5d; color: white; height: 30px;">
      💎 Tesoros de la Biblia</h5>
    <div class="row g-0">
      <span class="col-md-6 borde-celda"><b>Título:</b></br>${
        reunion.tesoros.tesorosTitulo
      }</span>
      <span class="col-md-6 borde-celda"><b>Encargado:</b></br>
        ${obtenerPublicador(reunion.tesoros.tesorosEnc)?.nombre}</span>
    </div>
    <div class="row g-0">
      <span class="col-md-4 borde-celda"><b>Busquemos perlas escondidas:</b></br>
        ${obtenerPublicador(reunion.tesoros.perlasEnc)?.nombre}</span>
      <span class="col-md-4 borde-celda"><b>Lectura de la Biblia (Principal)</b></br>
        ${obtenerPublicador(reunion.tesoros.lecturaEnc)?.nombre}</span>
      <span class="col-md-4 borde-celda"><b>Lectura de la Biblia (Auxiliar)</b></br>
        ${obtenerPublicador(reunion.tesoros.lecturaAuxEnc)?.nombre}</span>
    </div>
    <h5 class="mt-2" style="background-color: #be8900;color: white; height: 30px;">
      🌾 Seamos mejores maestros</h5>
    ${obtenerSeccionesSMM(reunion)}
    <h5 class="mt-2" style="background-color: #7e0024;color: white; height: 30px;">
      🐑 Nuestra vida cristiana</h5>
    ${obtenerSeccionesNVC(reunion)}
  `;
}

document.getElementById("anio").addEventListener("change", renderReuniones);
document.getElementById("mes").addEventListener("change", renderReuniones);

async function renderReuniones() {
  const contenedor = document.getElementById("tablasReuniones");
  contenedor.innerHTML = ""; // Limpiar contenido anterior

  mostrarBanner("Cargando información...", "info", true);
  // Intentar leer desde localStorage
  let reuniones = await obtenerDataColeccion("reuniones");
  publicadores = await obtenerDataColeccion("publicadores");

  // 🔽 TOMAR FILTROS
  const selectAnio = document.getElementById("anio");
  const selectMes = document.getElementById("mes");

  const anio = selectAnio ? parseInt(selectAnio.value) : null;
  const mes = selectMes ? parseInt(selectMes.value) : null;

  // 🔍 FILTRAR POR FECHA
  reuniones = reuniones.filter((reunion) => {
    if (!reunion.fecha) return false;

    const [y, m] = reunion.fecha.split("-").map(Number);

    if (anio && y !== anio) return false;
    if (mes && m !== mes) return false;

    return true;
  });

  reuniones.sort((a, b) => {
    const fechaA = stringToDateTime(a.fecha, "YYYY-MM-DD");
    const fechaB = stringToDateTime(b.fecha, "YYYY-MM-DD");
    return fechaA - fechaB;
  });

  reuniones.forEach((reunion) => {
    const tablaId = `tablaReuniones${reunion}`;

    const card = document.createElement("div");
    card.className = "col-12";

    card.innerHTML = `
      <div class="card card-shadow">
        <div class="card-header d-flex justify-content-between align-items-center group-header-color">
          <strong>Fecha ${dateTimeStrToAnother(
            reunion.fecha,
            "YYYY-MM-DD",
            "DD-MM-YYYY"
          )}</strong>
          <button class="btn btn-sm btn-outline-secondary" onclick="editarReunion('${
            reunion.id
          }')">✏️ Editar</button>
        </div>
        <div class="card-body p-0">
          ${renderDetalleReunion(reunion)}
        </div>
      </div>
    `;

    contenedor.appendChild(card);
  });

  cerrarBanner();
}

function agregarSeccionSMM(titulo = null, encargado = null, ayudante = null) {
  const divSMM = document.getElementById("seccionSmm");

  const nuevaSeccion = document.createElement("div");
  nuevaSeccion.className = "bloqueSmm border-top pt-3 mt-3";

  // Obtener el índice de la nueva sección
  const secciones = divSMM.querySelectorAll(".bloqueSmm");
  const indice = secciones.length;
  let tituloValue = titulo ? `value="${titulo}"` : "";
  let encargadoValue = encargado ? `value="${encargado.nombre}"` : "";
  let encargadoId = encargado ? `data-id="${encargado.id}"` : "";
  let ayudanteValue = ayudante ? `value="${ayudante.nombre}"` : "";
  let ayudanteId = ayudante ? `data-id="${ayudante.id}"` : "";

  nuevaSeccion.innerHTML = `
    <div class="row g-2">
      <div class="col-md-4">
        <label class="form-label">Título <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="smmTitulo${indice}" required
          ${tituloValue}>
      </div>
      <div class="col-md-4">
        <label class="form-label">Encargado (Principal) <span class="text-danger">*</span></label>
        <div class="d-flex">
          <input disabled type="text" class="form-control" id="smmEnc${indice}" required
            ${encargadoValue} ${encargadoId}>
          <button class="btn btn-outline-secondary" type="button" 
            onclick="abrirSelectorPublicador('smmEnc${indice}', 'asignaciones')">
            🔍
          </button>
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Ayudante (Principal)</label>
        <div class="d-flex">
          <input disabled type="text" class="form-control" id="smmAyud${indice}"
            ${ayudanteValue} ${ayudanteId}>
          <button class="btn btn-outline-secondary" type="button" 
            onclick="abrirSelectorPublicador('smmAyud${indice}', 'asignaciones')">
            🔍
          </button>
        </div>
      </div>
    </div>

    <div class="auxiliares mt-2" id="auxiliares${indice}"></div>

    <div class="text-end mt-2 d-flex gap-2 justify-content-end">
      <button type="button" class="btn btn-outline-secondary btn-sm d-flex align-items-center" onclick="agregarAuxiliar(${indice})">
        <span class="me-2 d-none d-sm-inline">➕ Agregar auxiliar</span>
        <span class="d-inline d-sm-none">➕</span>
      </button>

      <button type="button" class="btn btn-outline-danger btn-sm d-flex align-items-center" onclick="eliminarSeccion(this)">
        <span class="me-2 d-none d-sm-inline">🗑️ Eliminar asignación</span>
        <span class="d-inline d-sm-none">🗑️</span>
      </button>
    </div>
  `;

  divSMM.appendChild(nuevaSeccion);
}

function agregarAuxiliar(id, encargado = null, ayudante = null) {
  const contenedor = document.getElementById(`auxiliares${id}`);
  if (!contenedor) return;

  let encargadoValue = encargado ? `value="${encargado.nombre}"` : "";
  let encargadoId = encargado ? `data-id="${encargado.id}"` : "";
  let ayudanteValue = ayudante ? `value="${ayudante.nombre}"` : "";
  let ayudanteId = ayudante ? `data-id="${ayudante.id}"` : "";
  const fila = document.createElement("div");
  fila.className = "row g-2 mt-2";

  fila.innerHTML = `
    <div class="col-md-6">
      <label class="form-label">Encargado (Auxiliar)</label>
      <div class="d-flex">
        <input disabled type="text" class="form-control" id="smmAuxEnc${id}" required
          ${encargadoValue} ${encargadoId}>
        <button class="btn btn-outline-secondary" type="button" 
          onclick="abrirSelectorPublicador('smmAuxEnc${id}', 'asignaciones')">
          🔍
        </button>
      </div>
    </div>
    <div class="col-md-6">
      <label class="form-label">Ayudante (Auxiliar)</label>
      <div class="d-flex">
        <input disabled type="text" class="form-control" id="smmAuxAyud${id}"
          ${ayudanteValue} ${ayudanteId}>
        <button class="btn btn-outline-secondary" type="button" 
          onclick="abrirSelectorPublicador('smmAuxAyud${id}', 'asignaciones')">
          🔍
        </button>
    </div>
  `;

  contenedor.appendChild(fila);
}

function eliminarSeccion(boton) {
  const bloque = boton.closest(".bloqueSmm");
  if (bloque) bloque.remove();
}

function eliminarSeccionNVC(boton) {
  const bloque = boton.closest(".bloqueNvc");
  if (bloque) bloque.remove();
}

function agregarSeccionNVC(titulo = null, encargado = null) {
  const divNVC = document.getElementById("seccionesNvc");

  const nuevaSeccion = document.createElement("div");
  nuevaSeccion.className = "bloqueNvc border-top pt-3 mt-3";

  // Obtener el índice de la nueva sección
  const secciones = divNVC.querySelectorAll(".bloqueNvc");
  const indice = secciones.length;
  let tituloValue = titulo ? `value="${titulo}"` : "";
  let encargadoValue = encargado ? `value="${encargado.nombre}"` : "";
  let encargadoId = encargado ? `data-id="${encargado.id}"` : "";

  nuevaSeccion.innerHTML = `
    <div class="row g-2">
      <div class="col-md-6">
        <label class="form-label">Título <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="nvcTitulo${indice}" required
          ${tituloValue}>
      </div>
      <div class="col-md-6">
        <label class="form-label">Encargado <span class="text-danger">*</span></label>
        <div class="d-flex">
          <input disabled type="text" class="form-control" id="nvcEnc${indice}" required
            ${encargadoValue} ${encargadoId}>
          <button class="btn btn-outline-secondary" type="button" 
            onclick="abrirSelectorPublicador('nvcEnc${indice}', 'nuestraVida')">
            🔍
          </button>
        </div>
      </div>
    </div>
    <div class="text-end mt-2 d-flex gap-2 justify-content-end">
      <button type="button" class="btn btn-outline-danger btn-sm d-flex align-items-center" onclick="eliminarSeccionNVC(this)">
        <span class="me-2 d-none d-sm-inline">🗑️ Eliminar asignación</span>
        <span class="d-inline d-sm-none">🗑️</span>
      </button>
    </div>
  `;

  divNVC.appendChild(nuevaSeccion);
}

let inputDestinoPublicador = null;
async function abrirSelectorPublicador(inputId, filtro) {
  inputDestinoPublicador = document.getElementById(inputId);

  publicadores = await obtenerDataColeccion("publicadores");
  publicadores = publicadores.filter((pub) =>
    pub.privilegiosCongregacion.includes(filtro)
  );
  publicadores = ordenarPublicadores();
  const tbody = document.querySelector("#tablaPublicadoresModal tbody");
  tbody.innerHTML = "";

  publicadores.forEach((pub) => {
    let asignStr = "Sin asignaciones";
    let asigEstaReu = auxUltimasAsig.find((x) => x.id === pub.id);
    if (asigEstaReu) {
      asignStr = `Esta reunión - ${descripAsignacion(
        asigEstaReu.nueva.asignacion
      )}<span onclick="mostrarUltimasAsig('${pub}', ${asigEstaReu})" title="Ver últimas asignaciones">📜</span>`;
    } else if (pub.ultAsignaciones?.length > 0) {
      asignStr = `
        ${dateTimeStrToAnother(
          pub.ultAsignaciones[0].fecha,
          "YYYY-MM-DD",
          "DD-MM-YYYY"
        )}
        - ${descripAsignacion(pub.ultAsignaciones[0].asignacion)}
        <span onclick="mostrarUltimasAsig('${pub}')" title="Ver últimas asignaciones">🔼</span>`;
    }
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${pub.nombre}</td>
      <td>${pub.grupo}</td>
      <td>${asignStr}</td>
      `;
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      if (inputDestinoPublicador) {
        inputDestinoPublicador.value = pub.nombre;
        inputDestinoPublicador.dataset.id = pub.id;
        auxUltimasAsig = auxUltimasAsig.filter(
          (asig) => asig.nueva.asignacion !== inputId
        );
        auxUltimasAsig.push({
          id: pub.id,
          nueva: {
            fecha: document.getElementById("fecha").value,
            asignacion: inputId,
          },
        });
      }
      bootstrap.Modal.getInstance(
        document.getElementById("modalSeleccionPublicador")
      ).hide();
    });
    tbody.appendChild(tr);
  });
  new bootstrap.Modal(
    document.getElementById("modalSeleccionPublicador")
  ).show();
}

function asignarInputPublicador(inputId, valor) {
  let publicador = obtenerPublicador(valor);
  let inputEle = document.getElementById(inputId);
  if (publicador && inputEle) {
    inputEle.value = publicador.nombre;
    inputEle.dataset.id = publicador.id;
  }
}

const formReunion = document.getElementById("formReunion");
formReunion.addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrarBanner("Guardando...", "info", true);
  const idEdicion = formReunion.getAttribute("data-edicion-id");
  // Recopilar datos generales del formulario
  const datos = {
    fecha: document.getElementById("fecha")?.value || "",
    cancionIni: document.getElementById("cancionIni")?.value || "",
    cancionInt: document.getElementById("cancionInt")?.value || "",
    cancionFin: document.getElementById("cancionFin")?.value || "",
    presidente: document.getElementById("presidente")?.dataset.id || "",
    consejAux: document.getElementById("consejAux")?.dataset.id || "",
    oracionIni: document.getElementById("oracionIni")?.dataset.id || "",
    oracionFin: document.getElementById("oracionFin")?.dataset.id || "",
    tesoros: {
      tesorosTitulo: document.getElementById("tesorosTitulo")?.value || "",
      tesorosEnc: document.getElementById("tesorosEnc")?.dataset.id || "",
      perlasEnc: document.getElementById("perlasEnc")?.dataset.id || "",
      lecturaEnc: document.getElementById("lecturaEnc")?.dataset.id || "",
      lecturaAuxEnc: document.getElementById("lecturaAuxEnc")?.dataset.id || "",
    },
    smm: [],
    nvc: {
      secciones: [],
      estudioLibro: document.getElementById("estudioLibro")?.dataset.id || "",
      lectorEstudioLibro:
        document.getElementById("lectorEstudioLibro")?.dataset.id || "",
    },
  };

  // Recopilar datos de las secciones SMM
  document.querySelectorAll("#seccionSmm .bloqueSmm").forEach((bloque, i) => {
    const smmTitulo = document.getElementById(`smmTitulo${i}`)?.value || "";
    const smmEncargado =
      document.getElementById(`smmEnc${i}`)?.dataset.id || "";
    const smmAyudante =
      document.getElementById(`smmAyud${i}`)?.dataset.id || "";
    const smmAuxEnc =
      document.getElementById(`smmAuxEnc${i}`)?.dataset.id || "";
    const smmAuxAyud =
      document.getElementById(`smmAuxAyud${i}`)?.dataset.id || "";

    datos.smm.push({
      smmTitulo,
      smmEncargado,
      smmAyudante,
      smmAuxEnc,
      smmAuxAyud,
    });
  });

  // Recopilar datos de las secciones NVC
  document.querySelectorAll("#seccionesNvc .bloqueNvc").forEach((bloque, i) => {
    const nvcTitulo = document.getElementById(`nvcTitulo${i}`)?.value || "";
    const nvcEncargado =
      document.getElementById(`nvcEnc${i}`)?.dataset.id || "";
    datos.nvc.secciones.push({ nvcTitulo, nvcEncargado });
  });

  try {
    if (idEdicion) {
      await db.collection("reuniones").doc(idEdicion).update(datos);
      mostrarBanner("✅ Reunión actualizada", "success", false, 3000);
    } else {
      await db.collection("reuniones").add(datos);
      mostrarBanner("✅ Reunión creada", "success", false, 3000);
    }
    await agregarUltimasAsign(auxUltimasAsig);
    actualizarColecciones(["reuniones", "publicadores"]);

    // Reset y cerrar modal
    formReunion.reset();
    formReunion.removeAttribute("data-edicion-id");
    bootstrap.Modal.getInstance(document.getElementById("modalReunion")).hide();

    // Actualizar vista
    await renderReuniones();
  } catch (err) {
    console.error(err);
    mostrarBanner("❌ Error al guardar", "danger");
  }
});

function nuevaReunion() {
  document.getElementById("modalReunionLabel").innerText =
    "➕ Crear nueva reunión ";
  formReunion.reset();
  // SMM
  secciones = document.querySelectorAll(".bloqueSmm");
  secciones.forEach((sec) => sec.remove());
  // NVC
  secciones = document.querySelectorAll(".bloqueNvc");
  secciones.forEach((sec) => sec.remove());
  const modal = new bootstrap.Modal(document.getElementById("modalReunion"));
  modal.show();
}

async function editarReunion(id) {
  try {
    let reunion = await obtenerDataColeccion("reuniones");
    reunion = reunion.find((reu) => reu.id === id);
    // Guardar ID de edición
    formReunion.setAttribute("data-edicion-id", reunion.id);

    // Rellenar campos
    document.getElementById("fecha").value = reunion.fecha;
    document.getElementById("cancionIni").value = reunion.cancionIni || "";
    document.getElementById("cancionInt").value = reunion.cancionInt || "";
    document.getElementById("cancionFin").value = reunion.cancionFin || "";
    asignarInputPublicador("oracionIni", reunion.oracionIni);
    asignarInputPublicador("oracionFin", reunion.oracionFin);
    asignarInputPublicador("presidente", reunion.presidente);
    asignarInputPublicador("consejAux", reunion.consejAux);

    // Tesoros
    document.getElementById("tesorosTitulo").value =
      reunion.tesoros.tesorosTitulo || "";
    asignarInputPublicador("tesorosEnc", reunion.tesoros.tesorosEnc);
    asignarInputPublicador("perlasEnc", reunion.tesoros.perlasEnc);
    asignarInputPublicador("lecturaEnc", reunion.tesoros.lecturaEnc);
    asignarInputPublicador("lecturaAuxEnc", reunion.tesoros.lecturaAuxEnc);
    asignarInputPublicador("estudioLibro", reunion.nvc.estudioLibro);
    asignarInputPublicador(
      "lectorEstudioLibro",
      reunion.nvc.lectorEstudioLibro
    );

    // SMM
    secciones = document.querySelectorAll(".bloqueSmm");
    secciones.forEach((sec) => sec.remove());
    reunion.smm.forEach((seccion, i) => {
      let encargado = obtenerPublicador(seccion.smmEncargado);
      let ayudante = obtenerPublicador(seccion.smmAyudante);
      let titulo = seccion.smmTitulo;
      agregarSeccionSMM(titulo, encargado, ayudante);
      if (seccion.smmAuxEnc) {
        encargado = obtenerPublicador(seccion.smmAuxEnc);
        ayudante = obtenerPublicador(seccion.smmAuxAyud);
        agregarAuxiliar(i, encargado, ayudante);
      }
    });

    //NVC
    secciones = document.querySelectorAll(".bloqueNvc");
    secciones.forEach((sec) => sec.remove());
    reunion.nvc.secciones.forEach((seccion) => {
      let encargado = obtenerPublicador(seccion.nvcEncargado);
      let titulo = seccion.nvcTitulo;
      agregarSeccionNVC(titulo, encargado);
    });
    document.getElementById("modalReunionLabel").innerText =
      "✏️ Editar reunión";
    const modal = new bootstrap.Modal(document.getElementById("modalReunion"));
    modal.show();
  } catch (err) {
    console.error("Error al editar reunión:", err);
    alert("❌ Ocurrió un error al cargar los datos de la reunión.");
  }
}

async function agregarUltimasAsign(asignaciones) {
  const db = firebase.firestore();
  const batch = db.batch();

  for (const { id, nueva } of asignaciones) {
    const publicadorRef = db.collection("publicadores").doc(id);

    // leer documento actual
    const docSnap = await publicadorRef.get();
    let ultAsignaciones = [];

    if (docSnap.exists) {
      ultAsignaciones = docSnap.data().ultAsignaciones || [];
    }

    // agregar nueva asignación
    ultAsignaciones.push(nueva);

    // ordenar por fecha descendente (más reciente primero)
    ultAsignaciones.sort((a, b) => {
      const dateA = stringToDateTime(a.fecha, "YYYY-MM-DD");
      const dateB = stringToDateTime(b.fecha, "YYYY-MM-DD");
      return dateB - dateA; // descendente
    });

    // limitar a 4
    ultAsignaciones = ultAsignaciones.slice(0, 4);

    // guardar en batch
    batch.update(publicadorRef, { ultAsignaciones });
  }

  await batch.commit();
  console.log("✅ Asignaciones actualizadas y ordenadas en batch");
}

function ordenarPublicadores() {
  return [...publicadores].sort((a, b) => {
    const enAuxA = auxUltimasAsig.some((x) => x.id === a.id);
    const enAuxB = auxUltimasAsig.some((x) => x.id === b.id);

    // 1️⃣ Si alguno está en auxUltimasAsig -> mandarlos al final
    if (enAuxA && !enAuxB) return 1; // A va después
    if (!enAuxA && enAuxB) return -1; // B va después
    if (enAuxA && enAuxB) return 0; // ambos iguales (los dos últimos)

    // 2️⃣ Verificar ultAsignaciones
    const ultAsigA = a.ultAsignaciones?.[0];
    const ultAsigB = b.ultAsignaciones?.[0];

    // sin asignaciones -> primero
    if (!ultAsigA && ultAsigB) return -1;
    if (ultAsigA && !ultAsigB) return 1;
    if (!ultAsigA && !ultAsigB) return 0;

    // 3️⃣ Comparar fechas de la posición 0
    const fechaA = stringToDateTime(ultAsigA.fecha, "YYYY-MM-DD");
    const fechaB = stringToDateTime(ultAsigB.fecha, "YYYY-MM-DD");

    // Más vieja primero (ascendente)
    return fechaA - fechaB;
  });
}

function descripAsignacion(asig) {
  if (asig.includes("oracion")) return "Oración";
  if (asig.includes("tesorosEnc")) return "Tesoros";
  if (asig.includes("perlasEnc")) return "Perlas Esc.";
  if (asig.includes("lecturaEnc")) return "Lectura (Principal)";
  if (asig.includes("lecturaAuxEnc")) return "Lectura (Auxiliar)";
  if (asig.includes("consejAux")) return "Consejero aux.";
  if (asig.includes("estudioLibro")) return "Estudio libro";
  if (asig.includes("lectorEstudioLibro")) return "Lectura libro";
  if (asig.includes("presidente")) return "Presidente";
  if (asig.includes("smmEnc")) return "Encargado (Principal)";
  if (asig.includes("smmAyud")) return "Ayudante (Principal)";
  if (asig.includes("smmAuxEnc")) return "Encargado (Auxiliar)";
  if (asig.includes("smmAuxAyud")) return "Ayudante (Auxiliar)";
  if (asig.includes("nvcEnc")) return "Nuestra Vida Crist.";
}

function mostrarUltimasAsig(id, asigEstaReu = null) {}

async function actualizar() {
  await actualizarColecciones(["reuniones", "publicadores"]);
}
