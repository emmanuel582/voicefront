// Avatar Selector Component
import heyGen from '../api/heygen.js';

class AvatarSelector {
    constructor() {
        this.avatars = [];
        this.selectedAvatar = null;
        this.currentTab = 'preset';
    }

    async init() {
        await this.loadPresetAvatars();
        this.render();
    }

    async loadPresetAvatars() {
        try {
            this.avatars = await heyGen.getAvatars();
            this.avatars = this.avatars.filter(avatar =>
                avatar.avatar_id && (avatar.preview_image_url || avatar.preview_video_url)
            );
        } catch (error) {
            console.error('Error loading preset avatars:', error);
            this.avatars = [];
        }
    }

    render() {
        document.querySelectorAll('.avatar-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === this.currentTab);
        });

        document.querySelectorAll('.avatar-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === this.currentTab);
        });

        if (this.currentTab === 'preset') {
            this.renderPresetAvatars();
        }
    }

    renderPresetAvatars() {
        const container = document.getElementById('preset-avatars-grid');
        if (!container) return;

        if (this.avatars.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4"/>
              <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
            </svg>
          </div>
          <p>No preset avatars available</p>
          <p class="text-sm">Check your API configuration</p>
        </div>
      `;
            return;
        }

        container.innerHTML = this.avatars.map(avatar => {
            const isSelected = this.selectedAvatar?.avatar_id === avatar.avatar_id && this.selectedAvatar?.isPreset;
            const imageUrl = avatar.preview_image_url || avatar.preview_video_url;

            return `
        <div class="character-card ${isSelected ? 'selected' : ''}" 
             data-avatar-id="${avatar.avatar_id}">
          <img src="${imageUrl}" alt="${avatar.avatar_name || 'Avatar'}" class="character-image">
          <div class="character-overlay">
            <div class="character-name">${avatar.avatar_name || 'Unnamed Avatar'}</div>
          </div>
        </div>
      `;
        }).join('');

        container.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', () => {
                const avatarId = card.dataset.avatarId;
                const avatar = this.avatars.find(a => a.avatar_id === avatarId);
                this.selectAvatar(avatar);
            });
        });
    }

    selectAvatar(avatar) {
        this.selectedAvatar = avatar;
        this.selectedAvatar.isPreset = true;

        this.renderPresetAvatars();

        const nextBtn = document.getElementById('next-to-voice');
        if (nextBtn) nextBtn.disabled = false;

        if (window.toast) {
            window.toast.success(`Avatar "${avatar.avatar_name}" selected!`);
        }

        setTimeout(() => {
            if (window.app) window.app.goToStep(3);
        }, 800);
    }

    switchTab(tab) {
        document.querySelectorAll('.avatar-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        document.querySelectorAll('.avatar-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tab);
        });
    }

    getSelectedAvatar() {
        return this.selectedAvatar;
    }
}

export default AvatarSelector;
