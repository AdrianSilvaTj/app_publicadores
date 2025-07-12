function agregarSeccionSMM() {
  const divSMM = document.getElementById('seccion-smm');

  const nuevaSeccion = document.createElement("div");
  nuevaSeccion.className = "bloque-smm border-top pt-3 mt-3";

  const idUnico = Date.now(); // Para diferenciar auxiliares por sección

  nuevaSeccion.innerHTML = `
    <div class="row g-2">
      <div class="col-md-4">
        <label class="form-label">Título <span class="text-danger">*</span></label>
        <input type="text" class="form-control" required>
      </div>
      <div class="col-md-4">
        <label class="form-label">Encargado (Principal) <span class="text-danger">*</span></label>
        <select class="form-select" required>
          <option value="">Selecciona...</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label">Ayudante (Principal)</label>
        <select class="form-select">
          <option value="">Selecciona...</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
      </div>
    </div>

    <div class="auxiliares mt-2" id="auxiliares-${idUnico}"></div>

    <div class="text-end mt-2 d-flex gap-2 justify-content-end">
      <button type="button" class="btn btn-outline-secondary btn-sm d-flex align-items-center" onclick="agregarAuxiliar(${idUnico})">
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
  const contenedor = document.getElementById(`auxiliares-${id}`);
  if (!contenedor) return;

  const fila = document.createElement("div");
  fila.className = "row g-2 mt-2";

  fila.innerHTML = `
    <div class="col-md-6">
      <label class="form-label">Encargado (Auxiliar)</label>
      <select class="form-select">
        <option value="">Selecciona...</option>
        <option value="M">Masculino</option>
        <option value="F">Femenino</option>
      </select>
    </div>
    <div class="col-md-6">
      <label class="form-label">Ayudante (Auxiliar)</label>
      <select class="form-select">
        <option value="">Selecciona...</option>
        <option value="M">Masculino</option>
        <option value="F">Femenino</option>
      </select>
    </div>
  `;

  contenedor.appendChild(fila);
}


function eliminarSeccion(boton) {
  const bloque = boton.closest(".bloque-smm");
  if (bloque) bloque.remove();
}


function eliminarSeccionNVC(boton) {
  const bloque = boton.closest(".bloque-nvc");
  if (bloque) bloque.remove();
}

function agregarSeccionNVC() {
  const divNVC = document.getElementById('secciones-nvc');

  const nuevaSeccion = document.createElement("div");
  nuevaSeccion.className = "bloque-nvc border-top pt-3 mt-3";

  nuevaSeccion.innerHTML = `
    <div class="row g-2">
      <div class="col-md-6">
        <label class="form-label">Título <span class="text-danger">*</span></label>
        <input type="text" class="form-control" required>
      </div>
      <div class="col-md-6">
        <label class="form-label">Encargado <span class="text-danger">*</span></label>
        <select class="form-select" required>
          <option value="">Selecciona...</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
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

async function llenarSelectsReunion() {
  const publicadores = JSON.parse(localStorage.getItem("firebase_publicadores")) || [];

  // Define qué clase requiere qué tipo de publicador
  const roles = {
    oracion: pub => pub.privilegiosCongregacion?.includes("oracion"),
    presidente: pub => pub.estadoEspiritual?.includes("Anciano"),
    lector: pub => pub.estadoEspiritual?.includes("Anciano") || pub.estadoEspiritual?.includes("Siervo ministerial"),
    asignacion: pub => true, // todos
  };

  // Para cada tipo de clase definida...
  Object.keys(roles).forEach(clase => {
    const selects = document.querySelectorAll(`select.${clase}`);
    selects.forEach(select => {
      // limpiar
      select.innerHTML = '<option value="">Selecciona...</option>';

      // agregar publicadores filtrados
      publicadores
        .filter(roles[clase])
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(pub => {
          const opt = document.createElement("option");
          opt.value = pub.id || pub.nombre;
          opt.textContent = pub.nombre;
          select.appendChild(opt);
        });
    });
  });
}
