// Main Application with Step-based Wizard
import VoiceRecorder from './components/recorder.js';
import CharacterManager from './components/character-manager.js';
import AvatarSelector from './components/avatar-selector.js';
import VoiceSelector from './components/voice-selector.js';
import VideoGenerator from './components/video-generator.js';
import toast from './components/toast.js';
import videoHistoryManager from './utils/video-history.js';

class App {
    constructor() {
        this.recorder = new VoiceRecorder();
        this.characterManager = new CharacterManager();
        this.avatarSelector = new AvatarSelector();
        this.voiceSelector = new VoiceSelector();
        this.videoGenerator = null;

        this.currentStep = 1;
        this.audioUrl = null;
        this.isInitialized = false;
    }

    async init() {
        console.log('Initializing Voice-to-Video Service...');

        this.showLoadingOverlay('Initializing application...', 'Please wait while we load avatars and voices');

        try {
            const loadingToast = toast.loading('Loading avatars and voices...');

            await this.characterManager.init();

            try {
                await this.avatarSelector.init();
                toast.hide(loadingToast);
                toast.success('Avatars loaded successfully!');
            } catch (error) {
                toast.hide(loadingToast);
                toast.warning('Could not load preset avatars. You can still upload custom characters!');
            }

            try {
                await this.voiceSelector.init();
            } catch (error) {
                toast.warning('Could not load preset voices. You can still use your recorded voice!');
            }

            this.videoGenerator = new VideoGenerator(
                this.recorder,
                this.avatarSelector,
                this.voiceSelector,
                this.characterManager
            );
            this.videoGenerator.init();

            this.setupRecorderCallbacks();
            this.attachEventListeners();
            this.showStep(1);
            this.hideLoadingOverlay();

            this.isInitialized = true;
            console.log('Application initialized successfully!');
            toast.success('Application ready! Start by recording your voice.');
        } catch (error) {
            console.error('Initialization error:', error);
            this.hideLoadingOverlay();
            toast.error('Failed to initialize application. Please refresh the page.');
        }
    }

    showLoadingOverlay(text, subtext) {
        const overlay = document.createElement('div');
        overlay.id = 'app-loading-overlay';
        overlay.className = 'app-loading';
        overlay.innerHTML = `
      <div class="app-loading-spinner"></div>
      <div class="app-loading-text">${text}</div>
      <div class="app-loading-subtext">${subtext}</div>
    `;
        document.body.appendChild(overlay);
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('app-loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    setupRecorderCallbacks() {
        this.recorder.onRecordingStart = () => {
            this.updateRecordingUI(true);
            toast.info('Recording started...');
        };

        this.recorder.onRecordingStop = () => {
            this.updateRecordingUI(false);
            toast.success('Recording stopped!');
        };

        this.recorder.onRecordingComplete = (blob) => {
            this.handleRecordingComplete(blob);
        };

        this.recorder.onTimerUpdate = (elapsed) => {
            this.updateTimer(elapsed);
        };
    }

    attachEventListeners() {
        document.getElementById('record-btn')?.addEventListener('click', () => this.startRecording());
        document.getElementById('stop-btn')?.addEventListener('click', () => this.stopRecording());
        document.getElementById('play-btn')?.addEventListener('click', () => this.playRecording());

        document.getElementById('next-to-avatar')?.addEventListener('click', () => this.goToStep(2));
        document.getElementById('back-to-record')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('next-to-voice')?.addEventListener('click', () => this.goToStep(3));
        document.getElementById('back-to-avatar')?.addEventListener('click', () => this.goToStep(2));
        document.getElementById('next-to-generate')?.addEventListener('click', () => this.goToStep(4));
        document.getElementById('back-to-voice')?.addEventListener('click', () => this.goToStep(3));

        const uploadInput = document.getElementById('character-upload-input');
        const uploadArea = document.getElementById('upload-area');

        uploadInput?.addEventListener('change', (e) => this.handleCharacterUpload(e));

        if (uploadArea) {
            uploadArea.addEventListener('click', () => uploadInput?.click());
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.handleCharacterUpload({ target: { files: e.dataTransfer.files } });
                }
            });
        }


        document.querySelectorAll('.avatar-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.avatarSelector.switchTab(tab.dataset.tab);
                // CharacterManager already rendered on init, no need to re-render
            });
        });

        this.voiceSelector.attachEventListeners();

        document.getElementById('generate-video-btn')?.addEventListener('click', () => this.generateVideo());
        document.getElementById('close-video-modal')?.addEventListener('click', () => this.closeVideoModal());
        document.getElementById('create-another-btn')?.addEventListener('click', () => this.createAnother());
        document.getElementById('download-video-btn')?.addEventListener('click', () => this.downloadVideo());

        document.getElementById('view-history-btn')?.addEventListener('click', () => this.showHistory());
        document.getElementById('close-history-modal')?.addEventListener('click', () => this.closeHistory());
    }

    showStep(step) {
        this.currentStep = step;

        // Stop recording if moving away from step 1
        if (step !== 1 && this.recorder.isRecording) {
            this.recorder.stopRecording();
        }

        document.querySelectorAll('.step-item').forEach((item, index) => {
            const stepNum = index + 1;
            item.classList.remove('active', 'completed');

            if (stepNum === step) {
                item.classList.add('active');
            } else if (stepNum < step) {
                item.classList.add('completed');
            }
        });

        document.querySelectorAll('.step-content').forEach((content, index) => {
            content.classList.toggle('active', index + 1 === step);
        });

        if (step === 4) {
            this.updateSummary();
        }
    }

    goToStep(step) {
        if (step > this.currentStep) {
            if (!this.validateStep(this.currentStep)) {
                return;
            }
        }

        this.showStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    validateStep(step) {
        switch (step) {
            case 1:
                if (!this.recorder.getAudioBlob()) {
                    toast.error('Please record your voice before proceeding');
                    return false;
                }
                return true;

            case 2:
                const avatar = this.avatarSelector.getSelectedAvatar();
                const character = this.characterManager.getSelectedCharacter();
                if (!avatar && !character) {
                    toast.error('Please select an avatar or character');
                    return false;
                }
                document.getElementById('next-to-voice').disabled = false;
                return true;

            case 3:
                const voice = this.voiceSelector.getSelectedVoice();
                if (!voice) {
                    toast.error('Please select a voice option');
                    return false;
                }
                document.getElementById('next-to-generate').disabled = false;
                return true;

            default:
                return true;
        }
    }

    async startRecording() {
        if (!this.isInitialized) {
            toast.warning('Please wait for initialization to complete');
            return;
        }
        await this.recorder.startRecording();
    }

    stopRecording() {
        this.recorder.stopRecording();
    }

    playRecording() {
        if (this.audioUrl) {
            const audio = new Audio(this.audioUrl);
            audio.play();
            toast.info('Playing recording...');
        }
    }

    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('record-btn');
        const stopBtn = document.getElementById('stop-btn');
        const waveform = document.getElementById('waveform');
        const recordingIndicator = document.getElementById('recording-indicator');

        if (recordBtn) recordBtn.disabled = isRecording;
        if (stopBtn) stopBtn.disabled = !isRecording;

        waveform?.classList.toggle('hidden', !isRecording);
        recordingIndicator?.classList.toggle('hidden', !isRecording);
    }

    updateTimer(elapsed) {
        const timerElement = document.getElementById('recorder-timer');
        if (timerElement) {
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }

    handleRecordingComplete(blob) {
        if (this.audioUrl) {
            URL.revokeObjectURL(this.audioUrl);
        }
        this.audioUrl = URL.createObjectURL(blob);

        const playBtn = document.getElementById('play-btn');
        const nextBtn = document.getElementById('next-to-avatar');

        if (playBtn) playBtn.disabled = false;
        if (nextBtn) nextBtn.disabled = false;

        const recordingStatus = document.getElementById('recording-status');
        if (recordingStatus) {
            recordingStatus.textContent = '✓ Recording complete! Click Next to continue.';
            recordingStatus.style.color = 'var(--color-white)';
        }

        toast.success('Recording complete! You can now proceed to the next step.');
    }

    async handleCharacterUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const name = prompt('Enter a name for this character:', file.name.split('.')[0]);

        if (!name) return;

        try {
            await this.characterManager.uploadCharacter(file, name);
            // CharacterManager.uploadCharacter already calls renderCharacters()
        } catch (error) {
            // Error already shown by character manager
            console.error('Upload error:', error);
        }
    }

    updateSummary() {
        const recordingSummary = document.getElementById('summary-recording');
        if (recordingSummary) {
            recordingSummary.textContent = this.recorder.getAudioBlob() ? '✓ Ready' : 'Not recorded';
        }

        const avatarSummary = document.getElementById('summary-avatar');
        const avatar = this.avatarSelector.getSelectedAvatar();
        const character = this.characterManager.getSelectedCharacter();

        if (avatarSummary) {
            if (avatar && avatar.isPreset) {
                avatarSummary.textContent = avatar.avatar_name || 'Preset Avatar';
            } else if (character) {
                avatarSummary.textContent = character.name || 'Custom Character';
            } else {
                avatarSummary.textContent = 'Not selected';
            }
        }

        const voiceSummary = document.getElementById('summary-voice');
        const voice = this.voiceSelector.getSelectedVoice();

        if (voiceSummary) {
            if (voice?.type === 'preset') {
                voiceSummary.textContent = voice.voice.display_name || voice.voice.name || 'Preset Voice';
            } else if (voice?.type === 'custom') {
                voiceSummary.textContent = 'My Voice (Custom)';
            } else {
                voiceSummary.textContent = 'Not selected';
            }
        }
    }

    async generateVideo() {
        try {
            await this.videoGenerator.generateVideo();
        } catch (error) {
            console.error('Video generation error:', error);
        }
    }

    showVideoModal(videoUrl, videoId = null) {
        const modal = document.getElementById('video-result-modal');
        const videoPlayer = document.getElementById('video-player');

        if (modal && videoPlayer) {
            videoPlayer.src = videoUrl;
            videoPlayer.load();
            modal.classList.add('active');

            // Store videoId for download with proper filename
            if (videoId) {
                videoPlayer.dataset.videoId = videoId;
            }

            toast.success('Video is ready! You can now watch or download it.');
        }
    }

    closeVideoModal() {
        const modal = document.getElementById('video-result-modal');
        modal?.classList.remove('active');
    }

    createAnother() {
        this.closeVideoModal();
        this.goToStep(1);

        this.recorder.reset();
        document.getElementById('recorder-timer').textContent = '00:00';
        document.getElementById('recording-status').textContent = '';
        document.getElementById('play-btn').disabled = true;
        document.getElementById('next-to-avatar').disabled = true;

        toast.info('Ready to create a new video!');
    }

    downloadVideo() {
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer && videoPlayer.src) {
            const videoId = videoPlayer.dataset.videoId || Date.now();
            const filename = `voice-video-${videoId}.mp4`;

            const a = document.createElement('a');
            a.href = videoPlayer.src;
            a.download = filename;
            a.target = '_blank'; // Open in new tab if download fails
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success('Video download started!');
        }
    }

    async showHistory() {
        const modal = document.getElementById('history-modal');
        const content = document.getElementById('history-content');

        if (!modal || !content) return;

        modal.classList.add('active');

        try {
            const videos = await videoHistoryManager.getAllVideos();

            if (videos.length === 0) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                        <p style="font-size: 18px; margin-bottom: 10px;">No videos generated yet.</p>
                        <p>Create your first video!</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = videos.map(video => `
                <div class="history-item">
                    <div class="history-item-header">
                        <img src="${video.avatarImage || 'placeholder.png'}" alt="${video.avatarName || 'Video'}" class="history-avatar">
                        <div class="history-info">
                            <h3>${video.avatarName || 'Untitled Video'}</h3>
                            <span class="history-status status-${video.status}">${video.status}</span>
                        </div>
                    </div>
                    <div class="history-details">
                        <p><strong>Voice:</strong> ${video.voiceName || 'Unknown'}</p>
                        <p><strong>Created:</strong> ${new Date(video.createdAt).toLocaleString()}</p>
                        ${video.transcript ? `
                        <p class="history-transcript">"${video.transcript.substring(0, 100)}${video.transcript.length > 100 ? '...' : ''}"</p>
                        ` : ''}
                    </div>
                    <div class="history-actions">
                        ${video.status === 'completed' && video.videoUrl ? `
                            <button class="btn btn-primary" onclick="window.app.playHistoryVideo('${video.videoUrl}', '${video.id}')">
                                <i class="fas fa-play"></i> Play
                            </button>
                            <button class="btn btn-secondary" onclick="window.app.downloadHistoryVideo('${video.videoUrl}', '${video.id}')">
                                <i class="fas fa-download"></i> Download
                            </button>
                        ` : video.status === 'processing' ? `
                            <button class="btn btn-secondary" disabled>
                                <i class="fas fa-spinner fa-spin"></i> Processing...
                            </button>
                        ` : `
                            <button class="btn btn-secondary" disabled>
                                <i class="fas fa-exclamation-triangle"></i> Failed
                            </button>
                        `}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading history:', error);
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--color-error);">
                    <p style="font-size: 18px; margin-bottom: 10px;">Failed to load history</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    closeHistory() {
        const modal = document.getElementById('history-modal');
        modal?.classList.remove('active');
    }

    playHistoryVideo(videoUrl, videoId) {
        this.closeHistory();
        this.showVideoModal(videoUrl, videoId);
    }

    downloadHistoryVideo(videoUrl, videoId) {
        const filename = `voice-video-${videoId}.mp4`;

        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast.success('Video download started!');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

    window.app = app;
});