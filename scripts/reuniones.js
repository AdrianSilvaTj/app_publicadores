function agregarSeccionSMM() {
  const divSMM = document.getElementById('seccionSmm');

  const nuevaSeccion = document.createElement("div");
  nuevaSeccion.className = "bloqueSmm border-top pt-3 mt-3";

  // Obtener el índice de la nueva sección
  const secciones = divSMM.querySelectorAll('.bloqueSmm');
  const indice = secciones.length;

  // const idUnico = Date.now(); // Para diferenciar auxiliares por sección

  nuevaSeccion.innerHTML = `
    <div class="row g-2">
      <div class="col-md-4">
        <label class="form-label">Título <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="smmTitulo${indice}" required>
      </div>
      <div class="col-md-4">
        <label class="form-label">Encargado (Principal) <span class="text-danger">*</span></label>
        <div class="d-flex">
          <input type="text" class="form-control" id="smmEnc${indice}" required>
          <button class="btn btn-outline-secondary" type="button" 
            onclick="abrirSelectorPublicador('smmEnc${indice}', 'asignaciones')">
            🔍
          </button>
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Ayudante (Principal)</label>
        <div class="d-flex">
          <input type="text" class="form-control" id="smmAyud${indice}">
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


function agregarAuxiliar(id) {
  const contenedor = document.getElementById(`auxiliares${id}`);
  if (!contenedor) return;

  const fila = document.createElement("div");
  fila.className = "row g-2 mt-2";

  fila.innerHTML = `
    <div class="col-md-6">
      <label class="form-label">Encargado (Auxiliar)</label>
      <div class="d-flex">
        <input type="text" class="form-control" id="smmAuxEnc${id}" required>
        <button class="btn btn-outline-secondary" type="button" 
          onclick="abrirSelectorPublicador('smmAuxEnc${id}', 'asignaciones')">
          🔍
        </button>
      </div>
    </div>
    <div class="col-md-6">
      <label class="form-label">Ayudante (Auxiliar)</label>
      <div class="d-flex">
        <input type="text" class="form-control" id="smmAuxAyud${id}">
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

function agregarSeccionNVC() {
  const divNVC = document.getElementById('seccionesNvc');

  const nuevaSeccion = document.createElement("div");
  nuevaSeccion.className = "bloqueNvc border-top pt-3 mt-3";

  // Obtener el índice de la nueva sección
  const secciones = divNVC.querySelectorAll('.bloqueNvc');
  const indice = secciones.length;

  nuevaSeccion.innerHTML = `
    <div class="row g-2">
      <div class="col-md-6">
        <label class="form-label">Título <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="nvcTitulo${indice}" required>
      </div>
      <div class="col-md-6">
        <label class="form-label">Encargado <span class="text-danger">*</span></label>
        <div class="d-flex">
          <input type="text" class="form-control" id="nvcEnc${indice}" required>
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

  let publicadores = await obtenerDataColeccion("publicadores");
  publicadores = publicadores.filter(pub => pub.privilegiosCongregacion.includes(filtro));
  const tbody = document.querySelector("#tablaPublicadoresModal tbody");
  tbody.innerHTML = "";

  publicadores.forEach(pub => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${pub.nombre}</td>
      <td>${pub.grupo}</td>`;
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      if (inputDestinoPublicador) {
        inputDestinoPublicador.value = pub.nombre;
        inputDestinoPublicador.dataset.id = pub.id; // opcional
      }
      bootstrap.Modal.getInstance(document.getElementById("modalSeleccionPublicador")).hide();
    });
    tbody.appendChild(tr);
  });
  new bootstrap.Modal(document.getElementById("modalSeleccionPublicador")).show();
}

const formReunion = document.getElementById("formReunion");
formReunion.addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrarBanner("Guardando...", "info");
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
      lectorEstudioLibro: document.getElementById("lectorEstudioLibro")?.dataset.id || "",
    }
  };

  // Recopilar datos de las secciones SMM
  document.querySelectorAll("#seccionSmm .bloqueSmm").forEach((bloque, i) => {
    const smmTitulo = document.getElementById(`smmTitulo${i}`)?.value || "";
    const smmEncargado = document.getElementById(`smmEnc${i}`)?.dataset.id || "";
    const smmAyudante = document.getElementById(`smmAyud${i}`)?.dataset.id || "";
    const smmAuxEnc = document.getElementById(`smmAuxEnc${i}`)?.dataset.id || "";
    const smmAuxAyud = document.getElementById(`smmAuxAyud${i}`)?.dataset.id || "";

    datos.smm.push({ smmTitulo, smmEncargado, smmAyudante, smmAuxEnc, smmAuxAyud });
  });

  // Recopilar datos de las secciones NVC
  document.querySelectorAll("#seccionesNvc .bloqueNvc").forEach((bloque, i) => {
    const nvcTitulo = document.getElementById(`nvcTitulo${i}`)?.value || "";
    const nvcEncargado = document.getElementById(`nvcEnc${i}`)?.dataset.id || "";
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
    actualizarColeccion("reuniones");

    // Reset y cerrar modal
    formReunion.reset();
    formReunion.removeAttribute("data-edicion-id");
    bootstrap.Modal.getInstance(document.getElementById("modalReunion")).hide();

    // Actualizar vista
    // await actualizarYRecargar();
  } catch (err) {
    console.error(err);
    mostrarBanner("❌ Error al guardar", "danger");
  }
})

