// Character Manager Component
import storage from '../utils/storage.js';
import CONFIG from '../config.js';

class CharacterManager {
  constructor() {
    this.characters = [];
    this.selectedCharacter = null;
    this.storage = storage;
  }

  async init() {
    await this.storage.initDB();
    await this.loadCharacters();
  }

  async loadCharacters() {
    this.characters = await this.storage.getCharacters();
    this.renderCharacters();
  }

  async uploadCharacter(file, name) {
    // Validate file
    if (!CONFIG.CHARACTER.SUPPORTED_FORMATS.includes(file.type)) {
      throw new Error('Unsupported file format. Please use JPG, PNG, or WebP.');
    }

    if (file.size > CONFIG.CHARACTER.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit.');
    }

    // Show loading toast
    let uploadToast = null;
    if (window.toast) {
      uploadToast = window.toast.loading('Uploading character to HeyGen...');
    }

    try {
      // Upload to HeyGen first
      const heyGen = (await import('../services/heygen.js')).default;
      const heygenAsset = await heyGen.uploadAsset(file, 'image');

      if (!heygenAsset || !heygenAsset.id) {
        throw new Error('Failed to get HeyGen asset ID');
      }

      // Read file as blob for local storage
      const blob = await file.arrayBuffer().then(buffer => new Blob([buffer], { type: file.type }));

      // Save to IndexedDB with HeyGen ID
      const character = {
        name: name,
        imageBlob: blob,
        heygenId: heygenAsset.id,
        heygenUrl: heygenAsset.url || null,
        uploadedAt: new Date().toISOString(),
        isDefault: false
      };

      const id = await this.storage.saveCharacter(character);
      character.id = id;
      this.characters.push(character);

      // Hide loading toast and show success
      if (window.toast && uploadToast) {
        window.toast.hide(uploadToast);
        window.toast.success(`Character "${name}" uploaded to HeyGen successfully!`);
      }

      this.renderCharacters();
      return character;
    } catch (error) {
      // Hide loading toast and show error
      if (window.toast && uploadToast) {
        window.toast.hide(uploadToast);
        window.toast.error(`HeyGen upload failed: ${error.message}`);
      }
      throw error;
    }
  }

  async deleteCharacter(id) {
    await this.storage.deleteCharacter(id);
    if (this.selectedCharacter?.id === id) {
      this.selectedCharacter = null;
    }
    await this.loadCharacters();

    if (window.toast) {
      window.toast.success('Character deleted successfully');
    }
  }

  async setDefaultCharacter(id) {
    await this.storage.setDefaultCharacter(id);
    await this.loadCharacters();

    if (window.toast) {
      window.toast.success('Default character updated');
    }
  }

  selectCharacter(character) {
    this.selectedCharacter = character;
    this.renderCharacters();

    // Enable next button
    const nextBtn = document.getElementById('next-to-voice');
    if (nextBtn) {
      nextBtn.disabled = false;
    }

    // Show toast
    if (window.toast) {
      window.toast.success(`Character "${character.name}" selected!`);
    }

    // Auto-advance to next step after a short delay
    setTimeout(() => {
      if (window.app) {
        window.app.goToStep(3);
      }
    }, 800);
  }

  getSelectedCharacter() {
    return this.selectedCharacter;
  }

  getCharacters() {
    return this.characters;
  }

  createImageUrl(blob) {
    return URL.createObjectURL(blob);
  }

  renderCharacters() {
    const container = document.getElementById('custom-characters-grid');
    if (!container) return;

    if (this.characters.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p>No characters uploaded yet</p>
          <p style="font-size: 0.875rem; color: var(--color-gray-500);">Upload your first character to get started</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.characters.map(char => {
      const imageUrl = this.createImageUrl(char.imageBlob);
      const isSelected = this.selectedCharacter?.id === char.id;
      const isDefault = char.isDefault;

      return `
        <div class="character-card ${isSelected ? 'selected' : ''} ${isDefault ? 'default' : ''}" 
             data-id="${char.id}">
          <img src="${imageUrl}" alt="${char.name}" class="character-image">
          <div class="character-overlay">
            <div class="character-name">${char.name}</div>
            <div class="character-actions">
              <button class="btn icon-btn btn-secondary set-default-btn" 
                      data-id="${char.id}" 
                      title="Set as default">
                <svg class="icon" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                        fill="${isDefault ? 'currentColor' : 'none'}"/>
                </svg>
              </button>
              <button class="btn icon-btn btn-danger delete-btn" 
                      data-id="${char.id}" 
                      title="Delete">
                <svg class="icon" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Character selection
    document.querySelectorAll('#custom-characters-grid .character-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.character-actions')) return;
        const id = parseInt(card.dataset.id);
        const character = this.characters.find(c => c.id === id);
        if (character) {
          this.selectCharacter(character);
        }
      });
    });

    // Set default
    document.querySelectorAll('.set-default-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await this.setDefaultCharacter(id);
      });
    });

    // Delete
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const character = this.characters.find(c => c.id === id);
        if (confirm(`Are you sure you want to delete "${character?.name}"?`)) {
          await this.deleteCharacter(id);
        }
      });
    });
  }
}

export default CharacterManager;
