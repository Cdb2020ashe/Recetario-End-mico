// auth.js
class AuthManager {
    constructor() {
        console.log('Inicializando AuthManager...');
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        
        // Si no hay usuarios, crea uno por defecto
        if (this.users.length === 0) {
            const defaultUser = {
                id: '1',
                name: 'Usuario Demo',
                email: 'demo@example.com',
                password: 'password123',
                createdAt: new Date().toISOString()
            };
            this.users.push(defaultUser);
            localStorage.setItem('users', JSON.stringify(this.users));
            console.log('Usuario por defecto creado');
        }
        
        // Configurar listeners de autenticación de Firebase
        console.log('Configurando listeners de autenticación...');
        if (window.firebase && window.firebase.auth) {
            console.log('Auth disponible, configurando onAuthStateChanged...');
            window.firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    // Usuario ha iniciado sesión o la sesión está activa
                    this.currentUser = {
                        id: user.uid,
                        email: user.email,
                        name: user.displayName || user.email.split('@')[0]
                    };
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                } else {
                    // Usuario ha cerrado sesión
                    this.currentUser = null;
                    localStorage.removeItem('currentUser');
                }
                this.checkAuthState();
            });
        }
        
        this.setupEventListeners();
        this.checkAuthState();
    }
    
    // Configurar los event listeners del formulario
    setupEventListeners() {
        // Listener para el formulario de inicio de sesión
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = loginForm.querySelector('input[type="email"]').value;
                const password = loginForm.querySelector('input[type="password"]').value;
                
                try {
                    await this.login({ email, password });
                } catch (error) {
                    console.error('Error al iniciar sesión:', error);
                    this.showError(error.message || 'Error al iniciar sesión');
                }
            });
        }
        
        // Listener para el botón de cerrar sesión
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async register(userData) {
        try {
            if (userData.password !== userData.confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            
            // Validar formato de email
            if (!userData.email || !userData.email.includes('@')) {
                throw new Error('Por favor ingresa un correo electrónico válido (debe contener @)');
            }

            // Crear usuario con Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                window.auth,
                userData.email,
                userData.password
            );

            // Guardar datos adicionales en localStorage
            const newUser = {
                id: userCredential.user.uid,
                name: userData.name,
                email: userData.email,
                createdAt: new Date().toISOString()
            };

            this.users.push(newUser);
            localStorage.setItem('users', JSON.stringify(this.users));
            
            // Iniciar sesión automáticamente
            this.currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            this.checkAuthState();
            
            return true;
        } catch (error) {
            console.error('Error en el registro:', error);
            throw error;
        }
    }

    async login(credentials) {
        try {
            console.log('Intentando iniciar sesión con:', credentials.email);
            
            // Verificar que Firebase esté disponible
            if (typeof firebase === 'undefined' || !firebase.auth) {
                const errorMsg = 'Error: Firebase no está disponible. Por favor, recarga la página.';
                console.error(errorMsg);
                this.showError(errorMsg);
                return false;
            }
            
            // Verificar credenciales
            if (!credentials.email || !credentials.password) {
                const errorMsg = 'Por favor ingresa tu correo y contraseña';
                console.error(errorMsg);
                this.showError(errorMsg);
                return false;
            }
            
            // Obtener la instancia de autenticación
            const auth = firebase.auth();
            
            // Verificar que el método signInWithEmailAndPassword exista
            if (typeof auth.signInWithEmailAndPassword !== 'function') {
                const errorMsg = 'Error: Método de autenticación no disponible';
                console.error(errorMsg);
                this.showError(errorMsg);
                return false;
            }
            
            console.log('Iniciando sesión en Firebase...');
            
            try {
                // Intentar iniciar sesión
                const userCredential = await auth.signInWithEmailAndPassword(
                    credentials.email, 
                    credentials.password
                );
                
                console.log('Inicio de sesión exitoso', userCredential);
                
                // Obtener el usuario de Firebase
                const firebaseUser = userCredential.user;
                
                if (!firebaseUser) {
                    throw new Error('No se pudo obtener la información del usuario');
                }
                
                // Buscar o crear el usuario en nuestra lista local
                let user = this.users.find(u => u.email === firebaseUser.email);
                
                if (!user) {
                    // Si no existe, crearlo
                    user = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                        email: firebaseUser.email,
                        createdAt: new Date().toISOString()
                    };
                    this.users.push(user);
                    localStorage.setItem('users', JSON.stringify(this.users));
                }

                // Actualizar el usuario actual
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // Actualizar la UI
                this.checkAuthState();
                
                // Cerrar el modal si está abierto
                const authModal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                if (authModal) {
                    authModal.hide();
                }
                
                // Mostrar mensaje de éxito
                this.showSuccess('¡Sesión iniciada correctamente!');
                
                return true;
                
            } catch (firebaseError) {
                console.error('Error de Firebase Auth:', firebaseError);
                throw firebaseError;
            }
            
        } catch (error) {
            console.error('Error en el inicio de sesión:', error);
            let errorMessage = 'Error al iniciar sesión. Por favor, inténtalo de nuevo.';
            
            // Mapear códigos de error a mensajes amigables
            const errorMap = {
                'auth/user-not-found': 'No existe una cuenta con este correo electrónico.',
                'auth/wrong-password': 'Contraseña incorrecta. Intenta de nuevo.',
                'auth/too-many-requests': 'Demasiados intentos fallidos. Por favor, inténtalo más tarde.',
                'auth/invalid-email': 'El correo electrónico no es válido.',
                'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
                'auth/operation-not-allowed': 'La autenticación por correo/contraseña no está habilitada.',
                'auth/configuration-not-found': 'Error de configuración. Por favor, recarga la página.'
            };
            
            if (error && error.code) {
                console.log('Código de error de Firebase:', error.code);
                errorMessage = errorMap[error.code] || error.message || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showError(errorMessage);
            return false;
        }
    }

    async logout() {
        try {
            // Cerrar sesión en Firebase
            if (window.firebase && window.firebase.auth) {
                await window.firebase.auth().signOut();
            }
            
            // Limpiar el estado local
            this.currentUser = null;
            localStorage.removeItem('currentUser');
            
            // Actualizar la UI
            this.checkAuthState();
            
            // Mostrar mensaje de éxito
            const toast = document.getElementById('toastContainer') || this.createToastContainer();
            const toastElement = document.createElement('div');
            toastElement.className = 'toast show align-items-center text-white bg-info';
            toastElement.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        Has cerrado sesión correctamente
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>`;
            toast.appendChild(toastElement);
            
            // Eliminar el toast después de 3 segundos
            setTimeout(() => {
                toastElement.remove();
            }, 3000);
            
            // Recargar la página para asegurar que toda la aplicación se actualice
            window.location.reload();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            throw error;
        }
    }

    // Verificar el estado de autenticación y actualizar la UI
    checkAuthState() {
        const authSection = document.getElementById('authSection');
        const appContent = document.getElementById('appContent');
        const userNameElement = document.getElementById('userName');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (this.currentUser) {
            // Usuario autenticado
            if (authSection) authSection.style.display = 'none';
            if (appContent) appContent.style.display = 'block';
            if (userNameElement) {
                userNameElement.textContent = this.currentUser.name || this.currentUser.email.split('@')[0];
            }
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            // Usuario no autenticado
            if (authSection) authSection.style.display = 'block';
            if (appContent) appContent.style.display = 'none';
            if (userNameElement) userNameElement.textContent = '';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }
    
    // Mostrar mensaje de éxito
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    // Mostrar mensaje de error
    showError(message) {
        this.showNotification(message, 'danger');
    }
    
    // Mostrar notificación
    showNotification(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer') || this.createToastContainer();
        
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast show align-items-center text-white bg-${type} border-0`;
        toast.role = 'alert';
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>`;
        
        toastContainer.appendChild(toast);
        
        // Eliminar el toast después de 5 segundos
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.classList.remove('show');
                setTimeout(() => toastElement.remove(), 300);
            }
        }, 5000);
    }
    
    // Crear contenedor de notificaciones si no existe
    createToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '1100';
            document.body.appendChild(container);
        }
        return container;
    }
}

// Inicializar el gestor de autenticación
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});