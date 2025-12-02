// Voice Recorder Component
import CONFIG from '../config.js';

class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.stream = null;
        this.startTime = null;
        this.timerInterval = null;
        this.isRecording = false;
    }

    async init() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access microphone. Please grant permission and try again.');
            return false;
        }
    }

    async startRecording() {
        if (this.isRecording) return;

        if (!this.stream) {
            const success = await this.init();
            if (!success) return;
        }

        this.audioChunks = [];
        this.audioBlob = null;

        const mimeType = MediaRecorder.isTypeSupported(CONFIG.RECORDING.MIME_TYPE)
            ? CONFIG.RECORDING.MIME_TYPE
            : CONFIG.RECORDING.FALLBACK_MIME_TYPE;

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
            this.onRecordingComplete(this.audioBlob);
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.startTime = Date.now();
        this.startTimer();
        this.onRecordingStart();

        // Auto-stop after max duration
        setTimeout(() => {
            if (this.isRecording) {
                this.stopRecording();
            }
        }, CONFIG.RECORDING.MAX_DURATION);
    }

    stopRecording() {
        if (!this.isRecording) return;

        this.mediaRecorder.stop();
        this.isRecording = false;
        this.stopTimer();
        this.onRecordingStop();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            this.onTimerUpdate(elapsed);
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getAudioBlob() {
        return this.audioBlob;
    }

    reset() {
        this.audioChunks = [];
        this.audioBlob = null;
        this.startTime = null;
    }

    // Callbacks to be overridden
    onRecordingStart() { }
    onRecordingStop() { }
    onRecordingComplete(blob) { }
    onTimerUpdate(elapsed) { }
}

export default VoiceRecorder;
