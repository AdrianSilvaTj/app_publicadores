(() => {
  let installPrompt = null;
  const dismissedKey = "digitCongInstallInviteDismissed";
  const installedKey = "digitCongAppInstalled";
  const storage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch { /* Storage may be unavailable. */ }
    }
  };
  const standalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    const button = document.getElementById("pwaInstallAction");
    if (button) {
      button.textContent = "Instalar 🏠";
      button.dataset.mode = "install";
    }
  });

  window.addEventListener("appinstalled", () => {
    storage.set(installedKey, "true");
    document.getElementById("pwaInstallBanner")?.remove();
    document.getElementById("pwaInstallInstructions")?.remove();
    installPrompt = null;
  });

  function esIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function crearDialogoInstrucciones() {
    const dialog = document.createElement("dialog");
    dialog.id = "pwaInstallInstructions";
    dialog.className = "pwa-install-dialog";
    const instrucciones = esIOS()
      ? "En Safari, toca Compartir, elige Añadir a pantalla de inicio y confirma con Añadir."
      : /Android/i.test(navigator.userAgent)
        ? "Abre el menú ⋮ del navegador y selecciona Instalar aplicación o Añadir a pantalla principal."
        : "En Chrome o Edge, abre el menú del navegador y selecciona Instalar DigitCong o Crear acceso directo.";
    dialog.innerHTML = `
      <div class="pwa-dialog-content">
        <h2>Crear acceso directo 🏠</h2>
        <p>${instrucciones}</p>
        <button class="btn btn-primary" type="button" data-pwa-close>Entendido</button>
      </div>
    `;
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-pwa-close]")) {
        dialog.close();
      }
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function mostrarInvitacion() {
    if (
      standalone() ||
      storage.get(installedKey) === "true" ||
      storage.get(dismissedKey) === "true"
    ) return;

    const banner = document.createElement("aside");
    banner.id = "pwaInstallBanner";
    banner.className = "pwa-install-banner";
    banner.setAttribute("aria-label", "Acceso directo a DigitCong");
    banner.innerHTML = `
      <div class="pwa-install-copy">
        <strong>Agrega DigitCong a tu dispositivo 🏠</strong>
        <span>Ten un acceso directo en el escritorio o la pantalla de inicio.</span>
      </div>
      <div class="pwa-install-actions">
        <button class="btn btn-primary btn-sm" type="button" id="pwaInstallAction" data-mode="help">Cómo instalar 🏠</button>
        <button class="btn btn-outline-secondary btn-sm" type="button" id="pwaDismissAction" aria-label="Cerrar invitación">Ahora no</button>
      </div>
    `;
    document.body.appendChild(banner);
    if (installPrompt) {
      const button = document.getElementById("pwaInstallAction");
      button.textContent = "Instalar 🏠";
      button.dataset.mode = "install";
    }

    document.getElementById("pwaInstallAction").addEventListener("click", async () => {
      if (installPrompt) {
        const prompt = installPrompt;
        installPrompt = null;
        const result = await prompt.prompt();
        if (result?.outcome === "accepted") {
          storage.set(installedKey, "true");
          banner.remove();
          return;
        }
      }
      const dialog = document.getElementById("pwaInstallInstructions") || crearDialogoInstrucciones();
      dialog.showModal();
    });

    document.getElementById("pwaDismissAction").addEventListener("click", () => {
      storage.set(dismissedKey, "true");
      banner.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mostrarInvitacion, { once: true });
  } else {
    mostrarInvitacion();
  }
})();
