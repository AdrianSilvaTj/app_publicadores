// ⚠️ Reemplaza con los datos reales de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDWY69uVzD823JIIVFTvADJndksyBmzFLs",
  authDomain: "app-congregacion.firebaseapp.com",
  projectId: "app-congregacion",
  storageBucket: "app-congregacion.firebasestorage.app",
  messagingSenderId: "1025388356841",
  appId: "1:1025388356841:web:61e4c16d61c46457fcbc78"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
