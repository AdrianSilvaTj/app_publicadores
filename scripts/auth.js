// Asegúrate de haber inicializado Firebase previamente
const auth = firebase.auth();

// Verifica si hay sesión activa
function verificarSesionActiva() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "login.html";
        }
    });
}

// Cerrar sesión
function cerrarSesion() {
    auth.signOut().then(() => {
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

// Verificar sesión al cargar
document.addEventListener("DOMContentLoaded", verificarSesionActiva);

// mostrar al usuario logeado en la interfaz
// auth.onAuthStateChanged(user => {
//   if (user) {
//     document.getElementById("usuarioActivo").textContent = user.email;
//   }
// });



