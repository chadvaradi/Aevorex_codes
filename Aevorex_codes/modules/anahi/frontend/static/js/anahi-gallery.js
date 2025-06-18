/**
 * Anahi Gallery JavaScript
 * Handles photo gallery functionality, uploads, and management
 */

class AnahiGallery {
    constructor() {
        this.photos = [];
        this.currentView = 'grid';
        this.currentSort = 'newest';
        this.selectedPhoto = null;
        this.isLoading = false;

        // API base URL - adjust based on your backend setup
        this.apiBase = '/api/anahi';

        this.init();
    }

    async init() {
        console.log('🖼️ Initializing Anahi Gallery');
        
        this.initEventHandlers();
        this.initDragDrop();
        await this.loadPhotos();
        
        console.log('✅ Gallery initialized successfully');
    }

    initEventHandlers() {
        // Upload button
        const uploadBtn = document.getElementById('upload-btn');
        const uploadModal = document.getElementById('upload-modal');
        const closeUpload = document.getElementById('close-upload');
        
        uploadBtn?.addEventListener('click', () => this.showUploadModal());
        closeUpload?.addEventListener('click', () => this.hideUploadModal());

        // File input
        const fileInput = document.getElementById('file-input');
        fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

        // Stats button
        const statsBtn = document.getElementById('stats-btn');
        const statsModal = document.getElementById('stats-modal');
        const closeStats = document.getElementById('close-stats');

        statsBtn?.addEventListener('click', () => this.showStatsModal());
        closeStats?.addEventListener('click', () => this.hideStatsModal());

        // Photo modal
        const photoModal = document.getElementById('photo-modal');
        const closePhoto = document.getElementById('close-photo');
        const deletePhoto = document.getElementById('delete-photo');

        closePhoto?.addEventListener('click', () => this.hidePhotoModal());
        deletePhoto?.addEventListener('click', () => this.deleteCurrentPhoto());

        // View controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.changeView(view);
            });
        });

        // Sort control
        const sortSelect = document.getElementById('sort-select');
        sortSelect?.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortPhotos();
            this.renderPhotos();
        });

        // Modal backdrop clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    initDragDrop() {
        const uploadArea = document.getElementById('upload-area');
        if (!uploadArea) return;

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            
            if (imageFiles.length > 0) {
                this.uploadFiles(imageFiles);
            }
        });

        // Click to select files
        uploadArea.addEventListener('click', () => {
            document.getElementById('file-input')?.click();
        });
    }

    async loadPhotos() {
        console.log('📥 Loading photos from gallery');
        
        this.showLoading();
        
        try {
            // In production, this would call your backend API
            // For now, simulate API call with local photo data
            const response = await this.simulatePhotoAPI();
            
            if (response.success) {
                this.photos = response.photos;
                this.sortPhotos();
                this.renderPhotos();
                console.log(`✅ Loaded ${this.photos.length} photos`);
            } else {
                throw new Error('Failed to load photos');
            }
        } catch (error) {
            console.error('❌ Error loading photos:', error);
            this.showError('Hiba történt a képek betöltése során');
        } finally {
            this.hideLoading();
        }
    }

    async simulatePhotoAPI() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production, replace this with actual API call:
        // return fetch(`${this.apiBase}/gallery`).then(r => r.json());
        
        // For now, create mock data based on the moved photos
        const mockPhotos = Array.from({length: 29}, (_, i) => ({
            filename: `photo_${i + 1}.jpg`,
            size: Math.floor(Math.random() * 500000) + 50000, // 50KB - 550KB
            created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            modified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            path: `/static/anahi/gallery/photo_${i + 1}.jpg`
        }));

        return {
            success: true,
            count: mockPhotos.length,
            photos: mockPhotos
        };
    }

    sortPhotos() {
        switch (this.currentSort) {
            case 'newest':
                this.photos.sort((a, b) => new Date(b.created) - new Date(a.created));
                break;
            case 'oldest':
                this.photos.sort((a, b) => new Date(a.created) - new Date(b.created));
                break;
            case 'name':
                this.photos.sort((a, b) => a.filename.localeCompare(b.filename));
                break;
            case 'size':
                this.photos.sort((a, b) => b.size - a.size);
                break;
        }
    }

    renderPhotos() {
        const grid = document.getElementById('gallery-grid');
        const emptyState = document.getElementById('empty-state');
        
        if (!grid) return;

        if (this.photos.length === 0) {
            grid.innerHTML = '';
            emptyState?.classList.remove('hidden');
            return;
        }

        emptyState?.classList.add('hidden');
        
        grid.innerHTML = this.photos.map(photo => this.createPhotoCard(photo)).join('');
        
        // Add click handlers to photo cards
        grid.querySelectorAll('.photo-card').forEach((card, index) => {
            card.addEventListener('click', () => this.showPhotoModal(this.photos[index]));
        });

        // Add animation
        grid.querySelectorAll('.photo-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.05}s`;
            card.classList.add('fade-in');
        });
    }

    createPhotoCard(photo) {
        const sizeFormatted = this.formatFileSize(photo.size);
        const dateFormatted = this.formatDate(photo.created);
        
        return `
            <div class="photo-card">
                <img 
                    src="${photo.path}" 
                    alt="${photo.filename}"
                    class="photo-thumbnail"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >
                <div class="photo-info">
                    <h4>${photo.filename}</h4>
                    <div class="photo-meta">
                        <span>${sizeFormatted}</span>
                        <span>${dateFormatted}</span>
                    </div>
                </div>
            </div>
        `;
    }

    changeView(view) {
        this.currentView = view;
        
        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Update grid class
        const grid = document.getElementById('gallery-grid');
        if (grid) {
            grid.className = view === 'grid' ? 'gallery-grid' : 'gallery-list';
        }
    }

    showUploadModal() {
        const modal = document.getElementById('upload-modal');
        modal?.classList.add('active');
        this.resetUploadForm();
    }

    hideUploadModal() {
        const modal = document.getElementById('upload-modal');
        modal?.classList.remove('active');
    }

    showPhotoModal(photo) {
        this.selectedPhoto = photo;
        
        const modal = document.getElementById('photo-modal');
        const img = document.getElementById('modal-photo');
        const title = document.getElementById('photo-title');
        const filename = document.getElementById('photo-filename');
        const size = document.getElementById('photo-size');
        const created = document.getElementById('photo-created');

        if (img) img.src = photo.path;
        if (title) title.textContent = photo.filename;
        if (filename) filename.textContent = photo.filename;
        if (size) size.textContent = this.formatFileSize(photo.size);
        if (created) created.textContent = this.formatDate(photo.created);

        modal?.classList.add('active');
    }

    hidePhotoModal() {
        const modal = document.getElementById('photo-modal');
        modal?.classList.remove('active');
        this.selectedPhoto = null;
    }

    async showStatsModal() {
        const modal = document.getElementById('stats-modal');
        
        try {
            const stats = await this.getGalleryStats();
            
            const totalPhotos = document.getElementById('total-photos');
            const totalSize = document.getElementById('total-size');
            
            if (totalPhotos) totalPhotos.textContent = stats.total_photos;
            if (totalSize) totalSize.textContent = this.formatFileSize(stats.total_size);
            
            modal?.classList.add('active');
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError('Hiba történt a statisztikák betöltése során');
        }
    }

    hideStatsModal() {
        const modal = document.getElementById('stats-modal');
        modal?.classList.remove('active');
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            this.uploadFiles(files);
        }
    }

    async uploadFiles(files) {
        console.log(`📤 Uploading ${files.length} files`);
        
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const uploadArea = document.getElementById('upload-area');

        // Show progress
        uploadArea?.classList.add('hidden');
        progressContainer?.classList.remove('hidden');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = ((i + 1) / files.length) * 100;
                
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `Feltöltés: ${file.name} (${i + 1}/${files.length})`;

                await this.uploadSingleFile(file);
                
                // Simulate upload time
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Success
            if (progressText) progressText.textContent = 'Feltöltés sikeres!';
            
            setTimeout(() => {
                this.hideUploadModal();
                this.loadPhotos(); // Refresh gallery
            }, 1000);

        } catch (error) {
            console.error('Upload error:', error);
            if (progressText) progressText.textContent = 'Hiba történt a feltöltés során';
            this.showError('Hiba történt a képek feltöltése során');
        }
    }

    async uploadSingleFile(file) {
        // In production, implement actual file upload
        // const formData = new FormData();
        // formData.append('file', file);
        // return fetch(`${this.apiBase}/gallery/upload`, {
        //     method: 'POST',
        //     body: formData
        // });
        
        console.log(`📎 Uploading file: ${file.name}`);
        return Promise.resolve();
    }

    async deleteCurrentPhoto() {
        if (!this.selectedPhoto) return;

        const confirmDelete = confirm(`Biztosan törölni szeretnéd ezt a képet: ${this.selectedPhoto.filename}?`);
        if (!confirmDelete) return;

        try {
            // In production, call delete API
            // await fetch(`${this.apiBase}/gallery/${this.selectedPhoto.filename}`, {
            //     method: 'DELETE'
            // });

            console.log(`🗑️ Deleting photo: ${this.selectedPhoto.filename}`);
            
            // Remove from local array
            this.photos = this.photos.filter(p => p.filename !== this.selectedPhoto.filename);
            
            this.hidePhotoModal();
            this.renderPhotos();
            
            this.showSuccess('Kép sikeresen törölve');
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Hiba történt a kép törlése során');
        }
    }

    async getGalleryStats() {
        // In production, call stats API
        // return fetch(`${this.apiBase}/gallery/stats`).then(r => r.json());
        
        const totalSize = this.photos.reduce((sum, photo) => sum + photo.size, 0);
        
        return {
            total_photos: this.photos.length,
            total_size: totalSize,
            total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
        };
    }

    resetUploadForm() {
        const uploadArea = document.getElementById('upload-area');
        const progressContainer = document.getElementById('upload-progress');
        const fileInput = document.getElementById('file-input');

        uploadArea?.classList.remove('hidden');
        progressContainer?.classList.add('hidden');
        if (fileInput) fileInput.value = '';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const grid = document.getElementById('gallery-grid');
        
        loading?.classList.remove('hidden');
        if (grid) grid.innerHTML = '';
        
        this.isLoading = true;
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        loading?.classList.add('hidden');
        this.isLoading = false;
    }

    showError(message) {
        // Simple error display - in production, use a proper toast/notification system
        alert(`❌ ${message}`);
    }

    showSuccess(message) {
        // Simple success display - in production, use a proper toast/notification system
        alert(`✅ ${message}`);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.anahiGallery = new AnahiGallery();
}); 