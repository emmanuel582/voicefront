// Loading Modal Component

class LoadingModal {
    constructor() {
        this.modal = null;
        this.statusText = null;
    }

    init() {
        this.modal = document.getElementById('loading-modal');
        this.statusText = document.getElementById('loading-status-text');
    }

    show(message = 'Processing...') {
        if (!this.modal) this.init();
        this.updateStatus(message);
        this.modal.classList.add('active');
    }

    hide() {
        if (!this.modal) this.init();
        this.modal.classList.remove('active');
    }

    updateStatus(message) {
        if (this.statusText) {
            this.statusText.textContent = message;
        }
    }

    showTranscribing() {
        this.updateStatus('Transcribing your voice...');
    }

    showGenerating() {
        this.updateStatus('Generating your video...');
    }

    showUploading() {
        this.updateStatus('Uploading assets...');
    }

    showComplete() {
        this.updateStatus('Complete! 🎉');
        setTimeout(() => this.hide(), 1500);
    }

    showError(message) {
        this.updateStatus(`Error: ${message}`);
        setTimeout(() => this.hide(), 3000);
    }
}

export default LoadingModal;
