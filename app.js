class ErrorHandler {
    static showError(message, type = 'danger') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 150);
        }, 5000);
    }
}

class RecipeManager {
    constructor() {
        this.recipes = JSON.parse(localStorage.getItem('recipes')) || [];
        this.currentSearchTerm = null;
        this.currentMatches = [];
        this.currentMatchIndex = -1;
        this.searchKeydownHandler = null;
        
        this.setupEventListeners();
        this.setupRealTimeValidation();
        this.displayRecipes();
    }

    // Guardar receta en localStorage
    saveRecipes() {
        localStorage.setItem('recipes', JSON.stringify(this.recipes));
    }

    // Agregar una nueva receta
    addRecipe(recipeData) {
        const newRecipe = {
            id: Date.now().toString(),
            ...recipeData,
            ingredients: Array.isArray(recipeData.ingredients) 
                ? recipeData.ingredients 
                : (recipeData.ingredients || '').split('\n').filter(i => i.trim() !== ''),
            instructions: Array.isArray(recipeData.instructions) 
                ? recipeData.instructions 
                : (recipeData.instructions || '').split('\n').filter(i => i.trim() !== ''),
            createdAt: new Date().toISOString()
        };
        
        this.recipes.unshift(newRecipe);
        this.saveRecipes();
        this.displayRecipes();
        this.resetForm();
        ErrorHandler.showError('¡Receta agregada correctamente!', 'success');
    }

    // Mostrar recetas en la interfaz
    displayRecipes() {
        const recipeList = document.getElementById('recipeList');
        if (!recipeList) return;

        if (this.recipes.length === 0) {
            recipeList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-utensils fa-4x text-muted mb-3"></i>
                    <h3 class="text-muted">No hay recetas aún</h3>
                    <p class="text-muted">¡Agrega tu primera receta usando el formulario!</p>
                </div>
            `;
            return;
        }

        recipeList.innerHTML = this.recipes.map(recipe => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 recipe-card" data-category="${recipe.category ? recipe.category.toLowerCase() : ''}">
                    ${recipe.image ? 
                        `<img src="${recipe.image}" class="card-img-top" alt="${recipe.name}" style="height: 200px; object-fit: cover;">` : 
                        `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                            <i class="fas fa-utensils fa-4x text-muted"></i>
                        </div>`
                    }
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${recipe.name}</h5>
                        ${recipe.category ? `<span class="badge bg-primary mb-2 align-self-start">${recipe.category}</span>` : ''}
                        <p class="card-text flex-grow-1">${recipe.description || 'Sin descripción'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${new Date(recipe.createdAt).toLocaleDateString()}</small>
                            <button class="btn btn-sm btn-outline-primary view-recipe" data-id="${recipe.id}">
                                Ver receta <i class="fas fa-arrow-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar event listeners a los botones de ver receta
        document.querySelectorAll('.view-recipe').forEach(button => {
            button.addEventListener('click', (e) => {
                const recipeId = e.currentTarget.dataset.id;
                this.showRecipeDetails(recipeId);
            });
        });
    }

    // Configurar event listeners
    setupEventListeners() {
        const form = document.getElementById('recipeForm');
        if (form) {
            // Guardar referencia a 'this' para usarla en los manejadores de eventos
            const self = this;
            
            // Agregar evento de envío del formulario
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Validar el formulario
                if (form.checkValidity()) {
                    try {
                        // Obtener los valores del formulario
                        const name = document.getElementById('recipeName').value;
                        const category = document.getElementById('recipeCategory').value;
                        const ingredients = document.getElementById('ingredients').value;
                        const instructions = document.getElementById('instructions').value;
                        const image = document.getElementById('imagePreview')?.src || '';
                        const notes = document.getElementById('notes')?.value || '';
                        
                        // Crear el objeto de la receta
                        const recipeData = {
                            name: name,
                            category: category,
                            description: notes, // Usamos las notas como descripción
                            ingredients: ingredients.split('\n').filter(i => i.trim() !== ''),
                            instructions: instructions.split('\n').filter(i => i.trim() !== ''),
                            image: image,
                            createdAt: new Date().toISOString()
                        };
                        
                        console.log('Datos de la receta a guardar:', recipeData);
                        
                        // Verificar si estamos editando una receta existente
                        if (form.dataset.editingId) {
                            self.updateRecipe(form.dataset.editingId, recipeData);
                        } else {
                            self.addRecipe(recipeData);
                        }
                        
                        // Cerrar el modal si está abierto
                        const modal = bootstrap.Modal.getInstance(document.getElementById('recipeModal'));
                        if (modal) modal.hide();
                        
                        // Mostrar mensaje de éxito
                        alert('¡Receta guardada exitosamente!');
                        
                    } catch (error) {
                        console.error('Error al guardar la receta:', error);
                        alert('Ocurrió un error al guardar la receta. Por favor, inténtalo de nuevo.');
                    }
                } else {
                    // Si el formulario no es válido, mostrar mensajes de validación
                    form.classList.add('was-validated');
                }
            });

            // Configurar el botón para limpiar el formulario
            const discardBtn = document.getElementById('discardRecipe');
            if (discardBtn) {
                discardBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.resetForm();
                });
            }
            
            // Configurar la vista previa de la imagen
            const imageInput = document.getElementById('recipeImage');
            const imagePreview = document.getElementById('imagePreview');
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            
            if (imageInput && imagePreview) {
                imageInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            imagePreview.src = event.target.result;
                            imagePreviewContainer.style.display = 'block';
                        };
                        reader.readAsDataURL(file);
                    } else {
                        imagePreview.src = '#';
                        imagePreviewContainer.style.display = 'none';
                    }
                });
            }
        }
    }

    // Configurar el toggle de ingredientes
    setupIngredientsToggle(toggle, list, textarea) {
        toggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Cambiar a textarea
                const ingredients = Array.from(list.querySelectorAll('input[name="ingredients"]'))
                    .map(input => input.value)
                    .filter(value => value.trim() !== '')
                    .join('\n');
                
                textarea.value = ingredients;
                list.style.display = 'none';
                textarea.style.display = 'block';
                textarea.required = true;
            } else {
                // Cambiar a lista de inputs
                const ingredients = textarea.value.split('\n')
                    .filter(ingredient => ingredient.trim() !== '');
                
                list.innerHTML = '';
                if (ingredients.length > 0) {
                    ingredients.forEach(ingredient => {
                        this.addIngredientField(list, ingredient);
                    });
                } else {
                    this.addIngredientField(list);
                }
                
                list.style.display = 'block';
                textarea.style.display = 'none';
                textarea.required = false;
            }
        });

        // Manejar blur del textarea
        textarea.addEventListener('blur', () => {
            if (textarea.value.trim() === '') {
                list.style.display = 'block';
                textarea.style.display = 'none';
                textarea.required = false;
            }
        });
        
        // Prevenir envío del formulario al presionar Enter en el textarea
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.stopPropagation();
            }
        });
    }

    // Función para buscar recetas
    searchRecipes(searchTerm) {
        // Si no hay término de búsqueda, limpiar resaltados
        if (!searchTerm || searchTerm.trim() === '') {
            this.clearSearchHighlights();
            return;
        }

        searchTerm = searchTerm.trim().toLowerCase();
        const recipeCards = document.querySelectorAll('.recipe-card');
        let hasResults = false;
        let currentMatchIndex = 0;
        const matches = [];

        // Limpiar resaltados anteriores
        this.clearSearchHighlights();

        // Buscar coincidencias en todas las tarjetas
        recipeCards.forEach((card, index) => {
            const cardContent = card.textContent.toLowerCase();
            const cardElement = card.parentElement;
            
            if (cardContent.includes(searchTerm)) {
                // Resaltar coincidencias
                this.highlightText(card, searchTerm);
                cardElement.style.display = '';
                cardElement.dataset.hasMatch = 'true';
                
                // Guardar referencia a la tarjeta con coincidencias
                matches.push(cardElement);
                
                // Contar el número de coincidencias en esta tarjeta
                const matchCount = (card.textContent.toLowerCase().match(new RegExp(searchTerm, 'gi')) || []).length;
                cardElement.dataset.matchCount = matchCount;
                
                hasResults = true;
            } else {
                cardElement.style.display = 'none';
                cardElement.removeAttribute('data-has-match');
                cardElement.removeAttribute('data-match-count');
            }
        });

        // Mostrar contador de resultados
        this.showSearchResultsCount(searchTerm, matches.length);

        // Si hay coincidencias, resaltar la primera
        if (matches.length > 0) {
            this.scrollToMatch(matches[0], true);
        } else {
            this.showNoResultsMessage(searchTerm);
        }

        // Guardar referencia a las coincidencias para navegación
        this.currentSearchTerm = searchTerm;
        this.currentMatches = matches;
        this.currentMatchIndex = 0;

        // Configurar eventos de teclado para navegación
        this.setupSearchNavigation();
    }

    // Función para limpiar resaltados de búsqueda
    clearSearchHighlights() {
        const highlights = document.querySelectorAll('.search-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });

        // Mostrar todas las tarjetas
        const recipeCards = document.querySelectorAll('.recipe-card');
        recipeCards.forEach(card => {
            card.parentElement.style.display = '';
            card.parentElement.removeAttribute('data-has-match');
            card.parentElement.removeAttribute('data-match-count');
        });

        // Ocultar contador de resultados
        const resultsCounter = document.getElementById('searchResultsCounter');
        if (resultsCounter) {
            resultsCounter.remove();
        }

        // Limpiar referencias
        this.currentSearchTerm = null;
        this.currentMatches = [];
        this.currentMatchIndex = -1;
    }

    // Función para mostrar el contador de resultados
    showSearchResultsCount(term, count) {
        // Eliminar contador anterior si existe
        let counter = document.getElementById('searchResultsCounter');
        
        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'searchResultsCounter';
            counter.className = 'search-results-counter';
            document.body.appendChild(counter);
        }

        if (count > 0) {
            counter.innerHTML = `
                <span class="search-count">${count} ${count === 1 ? 'coincidencia' : 'coincidencias'}</span>
                <div class="search-nav">
                    <button id="prevMatch" class="btn btn-sm btn-outline-secondary" title="Anterior (Shift+Enter)">
                        <i class="fas fa-chevron-up"></i> Anterior
                    </button>
                    <span id="currentMatch">1</span>/<span id="totalMatches">${count}</span>
                    <button id="nextMatch" class="btn btn-sm btn-outline-secondary" title="Siguiente (Enter)">
                        <i class="fas fa-chevron-down"></i> Siguiente
                    </button>
                    <button id="closeSearch" class="btn btn-sm btn-outline-danger ms-2" title="Cerrar búsqueda (Esc)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            counter.style.display = 'flex';
            
            // Configurar eventos de los botones de navegación
            document.getElementById('prevMatch').addEventListener('click', () => this.navigateMatches(-1));
            document.getElementById('nextMatch').addEventListener('click', () => this.navigateMatches(1));
            document.getElementById('closeSearch').addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = '';
                    this.searchRecipes('');
                    searchInput.focus();
                }
            });
        } else {
            counter.style.display = 'none';
        }
    }

    // Función para navegar entre coincidencias
    navigateMatches(direction) {
        if (!this.currentMatches || this.currentMatches.length === 0) return;

        // Actualizar índice
        this.currentMatchIndex += direction;
        
        // Asegurarse de que el índice esté dentro de los límites
        if (this.currentMatchIndex < 0) {
            this.currentMatchIndex = this.currentMatches.length - 1;
        } else if (this.currentMatchIndex >= this.currentMatches.length) {
            this.currentMatchIndex = 0;
        }

        // Desplazarse a la coincidencia
        this.scrollToMatch(this.currentMatches[this.currentMatchIndex], true);
        
        // Actualizar contador
        this.updateMatchCounter();
    }

    // Función para desplazarse a una coincidencia
    scrollToMatch(element, highlight = false) {
        if (!element) return;

        // Desplazamiento suave
        element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });

        // Resaltar temporalmente
        if (highlight) {
            element.classList.add('highlight-match');
            setTimeout(() => {
                element.classList.remove('highlight-match');
            }, 1500);
        }
    }

    // Función para actualizar el contador de coincidencias
    updateMatchCounter() {
        const currentMatchSpan = document.getElementById('currentMatch');
        const totalMatchesSpan = document.getElementById('totalMatches');
        
        if (currentMatchSpan && totalMatchesSpan) {
            currentMatchSpan.textContent = this.currentMatchIndex + 1;
        }
    }

    // Configurar navegación por teclado
    setupSearchNavigation() {
        // Eliminar event listeners anteriores para evitar duplicados
        if (this.searchKeydownHandler) {
            document.removeEventListener('keydown', this.searchKeydownHandler);
        }

        // Crear nuevo manejador
        this.searchKeydownHandler = (e) => {
            const searchInput = document.getElementById('searchInput');
            
            // Solo actuar si el foco no está en el campo de búsqueda
            if (document.activeElement !== searchInput) {
                // Ctrl+F o Cmd+F para enfocar el campo de búsqueda
                if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                    e.preventDefault();
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }
                // Tecla 'Escape' para limpiar la búsqueda
                else if (e.key === 'Escape') {
                    if (searchInput) {
                        searchInput.value = '';
                        this.searchRecipes('');
                    }
                }
                // Tecla 'Enter' para la siguiente coincidencia
                else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.navigateMatches(1);
                }
                // Shift+Enter para la coincidencia anterior
                else if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault();
                    this.navigateMatches(-1);
                }
            }
        };

        // Agregar event listener
        document.addEventListener('keydown', this.searchKeydownHandler);
    }

    // Mostrar mensaje cuando no hay resultados
    showNoResultsMessage(term) {
        const recipeList = document.getElementById('recipeList');
        if (!recipeList) return;

        // Verificar si ya existe un mensaje de "sin resultados"
        let noResultsMessage = document.getElementById('noResultsMessage');
        
        if (!noResultsMessage) {
            noResultsMessage = document.createElement('div');
            noResultsMessage.id = 'noResultsMessage';
            noResultsMessage.className = 'col-12 text-center py-5';
            recipeList.appendChild(noResultsMessage);
        }

        noResultsMessage.innerHTML = `
            <i class="fas fa-search fa-3x text-muted mb-3"></i>
            <h4 class="text-muted">No se encontraron recetas que coincidan con "${term}"</h4>
            <button class="btn btn-outline-primary mt-3" onclick="document.getElementById('searchInput').value = ''; recipeManager.searchRecipes('')">
                <i class="fas fa-undo me-2"></i>Mostrar todas las recetas
            </button>
        `;
    }
    // Función para resaltar texto
    highlightText(element, searchTerm) {
        if (!searchTerm) return;

        // Crear una expresión regular que coincida con cada carácter del término de búsqueda
        const regex = new RegExp(`([${this.escapeRegExp(searchTerm)}])`, 'gi');
        const textNodes = this.getTextNodes(element);
        
        textNodes.forEach(node => {
            const text = node.nodeValue;
            const parent = node.parentNode;
            
            if (regex.test(text)) {
                // Reset lastIndex para que la expresión regular funcione correctamente
                regex.lastIndex = 0;
                
                // Resaltar cada carácter individual que coincida
                const html = text.replace(regex, '<span class="search-highlight">$1</span>');
                const temp = document.createElement('div');
                temp.innerHTML = html;
                
                // Reemplazar el nodo de texto con el HTML procesado
                while (temp.firstChild) {
                    parent.insertBefore(temp.firstChild, node);
                }
                parent.removeChild(node);
            }
        });
    }

    // Función auxiliar para obtener nodos de texto
    getTextNodes(node) {
        const textNodes = [];
        
        const getNodes = (n) => {
            if (n.nodeType === Node.TEXT_NODE && n.nodeValue.trim() !== '') {
                textNodes.push(n);
            } else {
                for (let i = 0; i < n.childNodes.length; i++) {
                    // Ignorar elementos como script, style, textarea, etc.
                    if (!n.tagName || !/^(script|style|textarea|select|input|button)$/i.test(n.tagName)) {
                        getNodes(n.childNodes[i]);
                    }
                }
            }
        };
        
        getNodes(node);
        return textNodes;
    }

    // Función auxiliar para escapar caracteres especiales en expresiones regulares
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Función para filtrar por categoría
    filterByCategory(category) {
        const recipeCards = document.querySelectorAll('.recipe-card');
        
        recipeCards.forEach(card => {
            const cardElement = card.parentElement;
            const cardCategory = card.dataset.category || '';
            
            if (category === '' || cardCategory === category.toLowerCase()) {
                cardElement.style.display = '';
            } else {
                cardElement.style.display = 'none';
            }
        });
        
        // Si hay un término de búsqueda, volver a aplicarlo después de filtrar por categoría
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            this.searchRecipes(searchInput.value);
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el gestor de recetas
    window.recipeManager = new RecipeManager();
    
    // Configurar la vista previa de la imagen
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('imagePreview');
    
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview.src = event.target.result;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Configurar el botón para agregar ingrediente
    const addIngredientBtn = document.getElementById('addIngredientBtn');
    if (addIngredientBtn) {
        addIngredientBtn.addEventListener('click', () => {
            const ingredientsContainer = document.getElementById('ingredientsContainer');
            if (ingredientsContainer) {
                const ingredientGroup = document.createElement('div');
                ingredientGroup.className = 'input-group mb-2';
                ingredientGroup.innerHTML = `
                    <input type="text" class="form-control" name="ingredients" required>
                    <button type="button" class="btn btn-outline-danger remove-ingredient">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                ingredientsContainer.appendChild(ingredientGroup);
                
                // Agregar evento para eliminar ingrediente
                ingredientGroup.querySelector('.remove-ingredient').addEventListener('click', (e) => {
                    const ingredientGroups = ingredientsContainer.querySelectorAll('.input-group');
                    if (ingredientGroups.length > 1) {
                        e.target.closest('.input-group').remove();
                    } else {
                        // No permitir eliminar el último ingrediente
                        const input = e.target.closest('.input-group').querySelector('input');
                        if (input) input.value = '';
                    }
                });
            }
        });
    }
    
    // Configurar el botón para agregar instrucción
    const addInstructionBtn = document.getElementById('addInstructionBtn');
    if (addInstructionBtn) {
        addInstructionBtn.addEventListener('click', () => {
            const instructionsContainer = document.getElementById('instructionsContainer');
            if (instructionsContainer) {
                const instructionGroup = document.createElement('div');
                instructionGroup.className = 'input-group mb-2';
                instructionGroup.innerHTML = `
                    <input type="text" class="form-control" name="instructions" required>
                    <button type="button" class="btn btn-outline-danger remove-instruction">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                instructionsContainer.appendChild(instructionGroup);
                
                // Agregar evento para eliminar instrucción
                instructionGroup.querySelector('.remove-instruction').addEventListener('click', (e) => {
                    const instructionGroups = instructionsContainer.querySelectorAll('.input-group');
                    if (instructionGroups.length > 1) {
                        e.target.closest('.input-group').remove();
                    } else {
                        // No permitir eliminar la última instrucción
                        const input = e.target.closest('.input-group').querySelector('input');
                        if (input) input.value = '';
                    }
                });
            }
        });
    }
    
    // Delegación de eventos para eliminar ingredientes e instrucciones
    document.addEventListener('click', (e) => {
        // Manejar clic en botones de eliminar ingrediente
        if (e.target.closest('.remove-ingredient')) {
            const ingredientGroup = e.target.closest('.input-group');
            const ingredientsContainer = document.getElementById('ingredientsContainer');
            const ingredientGroups = ingredientsContainer.querySelectorAll('.input-group');
            
            if (ingredientGroups.length > 1) {
                ingredientGroup.remove();
            } else {
                // No permitir eliminar el último ingrediente, solo limpiarlo
                const input = ingredientGroup.querySelector('input');
                if (input) input.value = '';
            }
        }
        
        // Manejar clic en botones de eliminar instrucción
        if (e.target.closest('.remove-instruction')) {
            const instructionGroup = e.target.closest('.input-group');
            const instructionsContainer = document.getElementById('instructionsContainer');
            const instructionGroups = instructionsContainer.querySelectorAll('.input-group');
            
            if (instructionGroups.length > 1) {
                instructionGroup.remove();
            } else {
                // No permitir eliminar la última instrucción, solo limpiarla
                const input = instructionGroup.querySelector('input');
                if (input) input.value = '';
            }
        }
    });
});