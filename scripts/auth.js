// Asegúrate de haber inicializado Firebase previamente
const auth = firebase.auth();

// Cerrar sesión
function cerrarSesion() {
    auth.signOut().then(() => {
        localStorage.removeItem('user');
        window.location.href = "login.html";
    });
}

// Recuperar contraseña
function recordarClave() {
    const email = prompt("Introduce tu correo para enviar un enlace de recuperación:");
    if (!email) return;
    auth.sendPasswordResetEmail(email)
        .then(() => alert("📧 Se envió un correo para restablecer la contraseña."))
        .catch(err => alert("❌ Error: " + err.message));
}

// Verifica si hay sesión activa
function verificarSesionActiva() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "login.html";
        }
    });
}
