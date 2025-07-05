const SECCIONES_S140 = [
  "Presidente de la reunión",
  "Lectura de la Biblia",
  "Tesoro de la Biblia",
  "Perlas escondidas",
  "Lectura bíblica semanal",
  "Primera asignación",
  "Segunda asignación",
  "Tercera asignación",
  "Nuestra vida cristiana",
  "Estudio bíblico de la congregación",
  "Oración inicial",
  "Oración final"
];

const TIPO_MINISTERIO = [
  "Empiece conversaciones",
  "Haga revisitas",
  "Haga discípulos"
];

document.addEventListener("DOMContentLoaded", () => {
  const publicadores = JSON.parse(localStorage.getItem("firebase_publicadores")) || [];

  const selectPublicadores = publicadores
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(p => `<option value="${p.id}">${p.nombre}</option>`)
    .join("");

  const cont = document.getElementById("seccionesAsignacion");

  SECCIONES_S140.forEach(seccion => {
    const id = seccion.toLowerCase().replace(/\s+/g, "_");

    const isMinisterio = seccion.toLowerCase().includes("asignación");

    cont.innerHTML += `
      <div class="col-md-6">
        <label class="form-label">${seccion}</label>
        <select name="asignado_${id}" class="form-select mb-2" required>
          <option value="">Selecciona publicador</option>
          ${selectPublicadores}
        </select>
        ${isMinisterio ? `
        <select name="tipo_${id}" class="form-select">
          <option value="">Tipo de asignación</option>
          ${TIPO_MINISTERIO.map(t => `<option>${t}</option>`).join("")}
        </select>` : ""}
      </div>
    `;
  });

  document.getElementById("formS140").addEventListener("submit", async e => {
    e.preventDefault();

    const fecha = document.getElementById("fechaAsignacion").value;
    if (!fecha) return mostrarBanner("❌ Debes seleccionar una fecha", "danger");

    const data = {
      fecha,
      creado: new Date(),
      asignaciones: {}
    };

    SECCIONES_S140.forEach(seccion => {
      const id = seccion.toLowerCase().replace(/\s+/g, "_");

      const pubId = document.querySelector(`[name="asignado_${id}"]`)?.value;
      const tipo = document.querySelector(`[name="tipo_${id}"]`)?.value || null;

      data.asignaciones[id] = {
        seccion,
        publicadorId: pubId,
        tipo: tipo
      };
    });

    try {
      await db.collection("asignaciones").doc(fecha).set(data);
      mostrarBanner("✅ Asignaciones guardadas", "success", false, 3000);
    } catch (err) {
      console.error(err);
      mostrarBanner("❌ Error al guardar", "danger");
    }
  });
});
