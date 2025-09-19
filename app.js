// Recipe Management System with Enhanced Features
class RecipeManager {
    constructor() {
        this.recipes = JSON.parse(localStorage.getItem('recipes')) || [];
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.displayRecipes();
        this.animateOnScroll();
        
        // Animate elements on load
        setTimeout(() => {
            document.querySelectorAll('.animate-fade-in-up').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        }, 300);
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('recipeForm');
        form.addEventListener('submit', (e) => this.addRecipe(e));
        
        // Floating button
        const floatingBtn = document.querySelector('.floating-btn');
        if (floatingBtn) {
            floatingBtn.addEventListener('click', () => {
                document.getElementById('recipeForm').scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        // Ingredients input handling
        const ingredientsContainer = document.getElementById('ingredientsContainer');
        const ingredientsList = document.getElementById('ingredientsList');
        const ingredientsTextarea = document.getElementById('ingredients');
        
        if (ingredientsContainer && ingredientsList && ingredientsTextarea) {
            ingredientsContainer.addEventListener('click', (e) => {
                if (ingredientsTextarea.style.display !== 'block') {
                    ingredientsList.style.display = 'none';
                    ingredientsTextarea.style.display = 'block';
                    ingredientsTextarea.focus();
                }
            });
            
            ingredientsTextarea.addEventListener('blur', () => {
                if (ingredientsTextarea.value.trim() === '') {
                    ingredientsList.style.display = 'block';
                    ingredientsTextarea.style.display = 'none';
                }
            });
            
            // Prevent form submission on Enter in textarea
            ingredientsTextarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                }
            });
        }
        
        // Initialize Bootstrap tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    addRecipe(e) {
        e.preventDefault();
        
        const recipe = {
            id: Date.now(),
            name: document.getElementById('recipeName').value.trim(),
            category: document.getElementById('recipeCategory').value,
            image: this.handleImageUpload(),
            ingredients: this.getIngredients(),
            instructions: document.getElementById('instructions').value.trim(),
            notes: document.getElementById('notes').value.trim(),
            createdAt: new Date().toISOString()
        };

        if (!recipe.name) {
            this.showToast('Por favor, ingrese un nombre para la receta.', 'warning');
            return false;
        }

        if (recipe.ingredients.length === 0) {
            this.showToast('Por favor, ingrese al menos un ingrediente.', 'warning');
            return false;
        }

        this.recipes.unshift(recipe);
        localStorage.setItem('recipes', JSON.stringify(this.recipes));
        
        // Reset form
        this.resetForm();
        
        // Update display
        this.displayRecipes();
        
        // Show success message
        this.showToast('¡Receta agregada exitosamente!', 'success');
        
        // Scroll to the new recipe
        window.scrollTo({
            top: document.getElementById('recipeList').offsetTop - 20,
            behavior: 'smooth'
        });
        
        return false;
    }

    resetForm() {
        const form = document.getElementById('recipeForm');
        if (form) form.reset();
        
        const ingredientsList = document.getElementById('ingredientsList');
        const ingredientsTextarea = document.getElementById('ingredients');
        
        if (ingredientsList && ingredientsTextarea) {
            ingredientsList.style.display = 'block';
            ingredientsTextarea.style.display = 'none';
            ingredientsTextarea.value = '';
        }
    }

    getIngredients() {
        const ingredientsText = document.getElementById('ingredients').value;
        if (!ingredientsText.trim()) return [];
        
        return ingredientsText.split('\n')
            .map(ingredient => ingredient.trim())
            .filter(ingredient => ingredient !== '');
    }

    handleImageUpload() {
        const fileInput = document.getElementById('recipeImage');
        if (fileInput.files && fileInput.files[0]) {
            return URL.createObjectURL(fileInput.files[0]);
        }
        return `https://picsum.photos/seed/recipe-${Date.now()}/400/300.jpg`;
    }

    displayRecipes() {
        const recipeList = document.getElementById('recipeList');
        
        if (this.recipes.length === 0) {
            recipeList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-utensils fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No hay recetas aún. ¡Agrega tu primera receta!</h4>
                </div>
            `;
            return;
        }

        recipeList.innerHTML = this.recipes.map(recipe => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 recipe-card">
                    <img src="${recipe.image}" class="card-img-top recipe-image" alt="${recipe.name}">
                    <div class="card-body">
                        <h5 class="card-title">${recipe.name}</h5>
                        <span class="category-badge mb-2">${recipe.category}</span>
                        <p class="card-text"><strong>Ingredientes:</strong></p>
                        <ul class="list-unstyled mb-3">
                            ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                        </ul>
                        <p class="card-text"><strong>Instrucciones:</strong></p>
                        <p class="small text-muted">${recipe.instructions.substring(0, 150)}${recipe.instructions.length > 150 ? '...' : ''}</p>
                        ${recipe.notes ? `<p class="mt-2 small text-info"><i class="fas fa-sticky-note me-1"></i> ${recipe.notes}</p>` : ''}
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-danger me-2" onclick="recipeManager.deleteRecipe(${recipe.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="recipeManager.viewRecipe(${recipe.id})">
                            <i class="fas fa-eye"></i> Ver Detalles
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    deleteRecipe(id) {
        if (confirm('¿Estás seguro de eliminar esta receta?')) {
            this.recipes = this.recipes.filter(recipe => recipe.id !== id);
            localStorage.setItem('recipes', JSON.stringify(this.recipes));
            this.displayRecipes();
            this.showToast('Receta eliminada exitosamente!', 'danger');
        }
    }

    viewRecipe(id) {
        const recipe = this.recipes.find(r => r.id === id);
        if (!recipe) return;

        const modalHtml = `
            <div class="modal fade" id="recipeModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content modal-content-custom">
                        <div class="modal-header">
                            <h5 class="modal-title">${recipe.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <img src="${recipe.image}" class="img-fluid rounded mb-3" alt="${recipe.name}">
                            <span class="category-badge mb-3">${recipe.category}</span>
                            
                            <h6><i class="fas fa-list-ul me-2"></i>Ingredientes:</h6>
                            <ul class="list-group mb-4">
                                ${recipe.ingredients.map(ingredient => `<li class="list-group-item">${ingredient}</li>`).join('')}
                            </ul>
                            
                            <h6><i class="fas fa-step-forward me-2"></i>Instrucciones:</h6>
                            <div class="mb-4">${recipe.instructions.replace(/\n/g, '<br>')}</div>
                            
                            ${recipe.notes ? `
                                <h6><i class="fas fa-sticky-note me-2"></i>Notas Personales:</h6>
                                <div class="alert alert-info">${recipe.notes}</div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-primary" onclick="recipeManager.editRecipe(${recipe.id})">Editar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('recipeModal');
        if (existingModal) existingModal.remove();

        // Add new modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('recipeModal'));
        modal.show();
    }

    editRecipe(id) {
        const recipe = this.recipes.find(r => r.id === id);
        if (!recipe) return;

        // Fill form with recipe data
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('recipeCategory').value = recipe.category;
        document.getElementById('ingredients').value = recipe.ingredients.join('\n');
        document.getElementById('instructions').value = recipe.instructions;
        document.getElementById('notes').value = recipe.notes;

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('recipeModal'));
        modal.hide();

        // Scroll to form
        document.getElementById('recipeForm').scrollIntoView({ behavior: 'smooth' });

        // Delete the recipe from list as we're editing it
        this.recipes = this.recipes.filter(r => r.id !== id);
        localStorage.setItem('recipes', JSON.stringify(this.recipes));
        this.displayRecipes();
    }

    showToast(message, type) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} position-fixed top-0 end-0 m-3 z-index-1050`;
        notification.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    animateOnScroll() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-up');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.animate-fade-in-up').forEach(el => {
            observer.observe(el);
        });
    }
}

// Initialize the app after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.recipeManager = new RecipeManager();
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});