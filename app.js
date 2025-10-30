// app.js
class RecipeManager {
    constructor() {
        this.recipes = [];
        this.currentUser = null;
        this.db = null;
        
        // Verificar que Firebase esté disponible
        if (!window.firebase) {
            console.error('Error: Firebase no está disponible');
            this.showError('Error: No se pudo cargar Firebase. Por favor, recarga la página.');
            return;
        }
        
        try {
            // Inicializar Firestore
            this.db = window.firebase.firestore();
            
            // Configuración adicional de Firestore si es necesario
            const settings = { timestampsInSnapshots: true, merge: true };
            this.db.settings(settings);
            
            console.log('Firestore inicializado correctamente');
            
            // Configurar el manejador de autenticación
            this.setupAuthListener();
            
            // Inicializar event listeners
            this.initEventListeners();
            
        } catch (error) {
            console.error('Error al inicializar Firestore:', error);
            this.showError('Error al conectar con la base de datos. Por favor, inténtalo de nuevo más tarde.');
        }
    }
    
    // Mostrar mensaje de error
    showError(message) {
        console.error('Error:', message);
        // Aquí puedes agregar lógica para mostrar el mensaje de error en la UI
        const errorContainer = document.getElementById('error-message');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            // Ocultar el mensaje después de 5 segundos
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        }
    }
    
    // Configurar el listener de autenticación
    setupAuthListener() {
        window.firebase.auth().onAuthStateChanged((user) => {
            console.log('Estado de autenticación cambiado:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
            this.currentUser = user;
            
            // Actualizar la UI según el estado de autenticación
            this.updateUIBasedOnAuth(!!user);
            
            if (user) {
                // Usuario autenticado, cargar recetas
                this.loadRecipes();
            } else {
                // Usuario no autenticado, limpiar recetas
                this.clearRecipes();
            }
        });
    }
    
    // Limpiar la lista de recetas
    clearRecipes() {
        this.recipes = [];
        const recipeList = document.getElementById('recipeList');
        if (recipeList) {
            recipeList.innerHTML = '';
        }
        console.log('Recetas limpiadas');
    }
    
    // Actualizar la UI según el estado de autenticación
    updateUIBasedOnAuth(isAuthenticated) {
        const authSection = document.getElementById('authSection');
        const appContent = document.getElementById('appContent');
        
        if (isAuthenticated) {
            if (authSection) authSection.style.display = 'none';
            if (appContent) appContent.style.display = 'block';
        } else {
            if (authSection) authSection.style.display = 'block';
            if (appContent) appContent.style.display = 'none';
        }
    }

    // Inicializar event listeners
    initEventListeners() {
        console.log('Inicializando event listeners...');
        
        // Formulario de receta
        const recipeForm = document.getElementById('recipeForm');
        if (recipeForm) {
            // Eliminar cualquier listener existente para evitar duplicados
            const newForm = recipeForm.cloneNode(true);
            recipeForm.parentNode.replaceChild(newForm, recipeForm);
            
            // Agregar el nuevo listener
            newForm.addEventListener('submit', async (e) => {
                console.log('Formulario enviado - Iniciando manejo del envío...');
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    await this.saveRecipe(e);
                } catch (error) {
                    console.error('Error al guardar la receta:', error);
                    this.showError('Error al guardar la receta: ' + (error.message || 'Error desconocido'));
                }
                
                return false;
            });
            
            console.log('Listener del formulario configurado correctamente');
        }
        
        // Vista previa de imagen
        const imageInput = document.getElementById('recipeImage');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const imagePreview = document.getElementById('imagePreview');
                        if (imagePreview) {
                            imagePreview.src = event.target.result;
                            imagePreview.style.display = 'block';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }
    
    // Cargar recetas desde Firestore
    async loadRecipes() {
        if (!this.currentUser) return;
        
        console.log('Cargando recetas...');
        
        try {
            const querySnapshot = await this.db.collection('recipes')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.recipes = [];
            querySnapshot.forEach(doc => {
                this.recipes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`${this.recipes.length} recetas cargadas`);
            this.displayRecipes();
            
        } catch (error) {
            console.error('Error al cargar recetas:', error);
            this.showError('Error al cargar las recetas. Por favor, recarga la página.');
        }
    }
    
    // Guardar receta en Firestore
    async saveRecipe(e) {
        console.log('Iniciando saveRecipe...');
        
        if (!this.currentUser) {
            const errorMsg = 'Debes iniciar sesión para guardar recetas';
            console.error(errorMsg);
            this.showError(errorMsg);
            throw new Error(errorMsg);
        }
        
        const form = document.getElementById('recipeForm');
        const saveButton = document.getElementById('saveRecipe');
        const originalButtonText = saveButton ? saveButton.innerHTML : null;
        
        try {
            console.log('Validando formulario...');
            
            // Validar formulario
            const name = document.getElementById('recipeName')?.value.trim() || '';
            const category = document.getElementById('category')?.value || '';
            const ingredients = document.getElementById('ingredients')?.value
                .split('\n')
                .map(i => i.trim())
                .filter(i => i) || [];
            const instructions = document.getElementById('instructions')?.value.trim() || '';
            const imageInput = document.getElementById('recipeImage');
            
            console.log('Datos del formulario:', { name, category, ingredients, instructions });
            
            // Validaciones
            if (!name) throw new Error('El nombre de la receta es obligatorio');
            if (!category) throw new Error('La categoría es obligatoria');
            if (ingredients.length === 0) throw new Error('Debes agregar al menos un ingrediente');
            if (!instructions) throw new Error('Las instrucciones son obligatorias');
            
            // Deshabilitar el botón de guardar
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
            }
            
            // Verificar si es una edición
            const isEditMode = form?.dataset.editMode === 'true';
            const recipeId = form?.dataset.recipeId;
            
            console.log('Modo edición:', isEditMode, 'ID de receta:', recipeId);
            
            // Crear objeto de receta con los datos validados
            const recipeData = {
                name,
                category,
                ingredients,
                instructions,
                userId: this.currentUser.uid,
                updatedAt: new Date().toISOString()
            };
            
            // Solo agregar createdAt si es una receta nueva
            if (!isEditMode) {
                recipeData.createdAt = new Date().toISOString();
            }
            
            console.log('Datos de la receta a guardar:', recipeData);
            
            // Manejar la imagen si se subió una
            if (imageInput?.files?.[0]) {
                console.log('Procesando imagen...');
                const file = imageInput.files[0];
                recipeData.imageName = file.name;
                
                // Crear una URL local para la vista previa
                recipeData.imageUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
                
                console.log('Imagen procesada, tamaño:', file.size, 'bytes');
            }
            
            // Guardar en Firestore
            console.log('Guardando en Firestore...');
            
            if (isEditMode && recipeId) {
                // Actualizar receta existente
                await this.db.collection('recipes').doc(recipeId).update(recipeData);
                console.log('Receta actualizada con ID:', recipeId);
                this.showSuccess('¡Receta actualizada exitosamente!');
            } else {
                // Crear nueva receta
                const docRef = await this.db.collection('recipes').add(recipeData);
                console.log('Receta guardada con ID:', docRef.id);
                this.showSuccess('¡Receta guardada exitosamente!');
            }
            
            // Limpiar el formulario
            this.clearForm();
            
            // Recargar la lista de recetas
            await this.loadRecipes();
            
        } catch (error) {
            console.error('Error en saveRecipe:', error);
            throw error; // Relanzar el error para que pueda ser manejado por el llamador
        } finally {
            // Restaurar el botón de guardar
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = originalButtonText || 'Guardar Receta';
            }
        }
    }
    
    // Mostrar recetas en la interfaz
    displayRecipes() {
        console.log('Mostrando recetas:', this.recipes);
        const recipeList = document.getElementById('recipeList');
        if (!recipeList) {
            console.error('No se encontró el elemento con ID recipeList');
            return;
        }
        
        if (this.recipes.length === 0) {
            recipeList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-utensils fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No hay recetas aún. ¡Agrega tu primera receta!</h4>
                </div>`;
            return;
        }
        
        recipeList.innerHTML = this.recipes.map(recipe => {
            // Asegurarse de que los ingredientes sean un array
            const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
            
            return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm">
                    ${recipe.imageUrl ? `
                        <img src="${recipe.imageUrl}" class="card-img-top" alt="${recipe.name}" style="height: 200px; object-fit: cover;">
                    ` : `
                        <div class="text-center py-5 bg-light">
                            <i class="fas fa-utensils fa-4x text-muted"></i>
                        </div>
                    `}
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${recipe.name || 'Receta sin nombre'}</h5>
                        ${recipe.category ? `<span class="badge bg-primary mb-2">${recipe.category}</span>` : ''}
                        <p class="card-text text-muted flex-grow-1">
                            ${ingredients.slice(0, 3).join(', ')}${ingredients.length > 3 ? '...' : ''}
                        </p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between">
                                <button class="btn btn-sm btn-outline-primary view-recipe" data-id="${recipe.id}">
                                    <i class="fas fa-eye me-1"></i> Ver
                                </button>
                                <button class="btn btn-sm btn-outline-secondary edit-recipe" data-id="${recipe.id}">
                                    <i class="fas fa-edit me-1"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-recipe" data-id="${recipe.id}">
                                    <i class="fas fa-trash-alt me-1"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
        
        console.log('Recetas renderizadas, configurando botones...');
        // Configurar los botones de las tarjetas
        this.setupRecipeButtons();
    }
    
    // Configurar los botones de las tarjetas de recetas
    setupRecipeButtons() {
        // Botones de ver receta
        document.querySelectorAll('.view-recipe').forEach(button => {
            button.addEventListener('click', (e) => {
                const recipeId = e.currentTarget.dataset.id;
                this.showRecipeDetails(recipeId);
            });
        });
        
        // Botones de editar receta
        document.querySelectorAll('.edit-recipe').forEach(button => {
            button.addEventListener('click', (e) => {
                const recipeId = e.currentTarget.dataset.id;
                this.editRecipe(recipeId);
            });
        });
        
        // Botones de eliminar receta
        document.querySelectorAll('.delete-recipe').forEach(button => {
            button.addEventListener('click', (e) => {
                const recipeId = e.currentTarget.dataset.id;
                if (confirm('¿Estás seguro de que deseas eliminar esta receta?')) {
                    this.deleteRecipe(recipeId);
                }
            });
        });
    }
    
    // Mostrar los detalles de una receta
    showRecipeDetails(recipeId) {
        console.log('Mostrando detalles de la receta:', recipeId);
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        // Aquí puedes implementar la lógica para mostrar los detalles de la receta
        // Por ejemplo, podrías abrir un modal con los detalles completos
        alert(`Detalles de la receta: ${recipe.name}\n\nIngredientes:\n${recipe.ingredients.join('\n')}\n\nInstrucciones:\n${recipe.instructions}`);
    }
    
    // Editar una receta existente
    async editRecipe(recipeId) {
        console.log('Editando receta:', recipeId);
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        // Rellenar el formulario con los datos de la receta
        document.getElementById('recipeName').value = recipe.name || '';
        document.getElementById('category').value = recipe.category || '';
        document.getElementById('ingredients').value = Array.isArray(recipe.ingredients) 
            ? recipe.ingredients.join('\n') 
            : '';
        document.getElementById('instructions').value = recipe.instructions || '';
        
        // Configurar el formulario para edición
        const form = document.getElementById('recipeForm');
        form.dataset.editMode = 'true';
        form.dataset.recipeId = recipeId;
        
        // Desplazarse al formulario
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (recipe.imageUrl) {
                imagePreview.src = recipe.imageUrl;
                imagePreviewContainer.style.display = 'block';
            } else {
                imagePreviewContainer.style.display = 'none';
            }
            
            // Actualizar el botón de guardar
            const saveButton = document.getElementById('saveRecipe');
            saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Receta';
            
            // Agregar el ID de la receta al formulario para actualización
            const form = document.getElementById('recipeForm');
            form.dataset.recipeId = recipe.id;
            
            // Desplazarse al formulario
            form.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error al cargar la receta para editar:', error);
            this.showError('Error al cargar la receta. Intenta de nuevo.');
        }
    }

    // Eliminar receta
    async deleteRecipe(recipeId) {
        if (!this.currentUser) return;
        
        if (!confirm('¿Estás seguro de que deseas eliminar esta receta? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            await window.firebase.firestore().collection('recipes').doc(recipeId).delete();
            this.showSuccess('Receta eliminada correctamente');
            await this.loadRecipes();
        } catch (error) {
            console.error('Error al eliminar la receta:', error);
            this.showError('Error al eliminar la receta. Intenta de nuevo.');
        }
    }

    // Limpiar el formulario
    clearForm() {
        const form = document.getElementById('recipeForm');
        if (form) {
            form.reset();
            form.removeAttribute('data-recipe-id');
            
            // Limpiar vista previa de imagen
            const imagePreview = document.getElementById('imagePreview');
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            imagePreview.src = '#';
            imagePreviewContainer.style.display = 'none';
            
            // Restaurar el botón de guardar
            const saveButton = document.getElementById('saveRecipe');
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Receta';
                saveButton.disabled = false;
            }
        }
    }

    // Vista previa de imagen
    previewImage(event) {
        const input = event.target;
        const preview = document.getElementById('imagePreview');
        const previewContainer = document.getElementById('imagePreviewContainer');
        
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                preview.src = e.target.result;
                previewContainer.style.display = 'block';
            }
            
            reader.readAsDataURL(input.files[0]);
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
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1100';
        document.body.appendChild(container);
        return container;
    }
}

// Inicializar RecipeManager cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado');
    
    // Inicializar el gestor de recetas
    window.recipeManager = new RecipeManager();
    
    // Configurar el evento para el botón de eliminar todas las recetas
    document.getElementById('clearAllRecipes')?.addEventListener('click', () => {
        if (window.recipeManager.clearAllRecipes) {
            window.recipeManager.clearAllRecipes();
        }
    });
});
