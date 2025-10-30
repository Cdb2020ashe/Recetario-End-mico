// firebase-config.js
document.addEventListener('DOMContentLoaded', function() {
    // Configuración de Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyAtJC0U1oWh1Vx-ttgKyWZ9Jozo6kbBCTg",
        authDomain: "assistant-7bd5e.firebaseapp.com",
        projectId: "assistant-7bd5e",
        storageBucket: "assistant-7bd5e.firebasestorage.app",
        messagingSenderId: "89764467367",
        appId: "1:89764467367:web:e2199774561a16900f4182"
    };

    try {
        // Verificar si Firebase está disponible
        if (typeof firebase === 'undefined') {
            console.error('Firebase no está cargado. Verifica que los scripts de Firebase se estén cargando correctamente.');
            return;
        }

        // Inicializar Firebase
        const app = firebase.initializeApp(firebaseConfig);
        
        // Hacer que auth esté disponible globalmente
        window.auth = firebase.auth();
        window.db = firebase.firestore();
        
        console.log('Firebase inicializado correctamente');
        
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
    }
});