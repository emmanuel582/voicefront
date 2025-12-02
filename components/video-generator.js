// Video Generator Component
import assemblyAI from '../api/assemblyai.js';
import heyGen from '../api/heygen.js';
import LoadingModal from './loading-modal.js';
import audioConverter from '../utils/audio-converter.js';
import videoHistoryManager from '../utils/video-history.js';

class VideoGenerator {
    constructor(recorder, avatarSelector, voiceSelector, characterManager) {
        this.recorder = recorder;
        this.avatarSelector = avatarSelector;
        this.voiceSelector = voiceSelector;
        this.characterManager = characterManager;
        this.loadingModal = new LoadingModal();
        this.currentVideoUrl = null;
        this.currentVideoId = null;
    }

    async init() {
        this.loadingModal.init();
        // Initialize video history database
        await videoHistoryManager.init();
    }

    async generateVideo() {
        try {
            // Validate inputs
            const validation = this.validate();
            if (!validation.valid) {
                alert(validation.message);
                return;
            }

            this.loadingModal.show('Starting...');

            // Get audio blob
            const audioBlob = this.recorder.getAudioBlob();

            // Get voice selection to determine workflow
            const voiceSelection = this.voiceSelector.getSelectedVoice();

            let transcript = null;
            let voiceConfig;

            // Step 1: Handle voice configuration based on selection
            if (voiceSelection.type === 'preset') {
                // PRESET VOICE: Transcribe audio to get text, then use AI voice
                this.loadingModal.showTranscribing();
                transcript = await assemblyAI.getTranscript(audioBlob);

                voiceConfig = {
                    type: 'text',
                    voice_id: voiceSelection.voice.voice_id
                };
            } else {
                // CUSTOM VOICE: Convert audio to WAV, then upload
                this.loadingModal.show('Converting audio...');
                try {
                    // Convert WebM to WAV format (HeyGen compatible)
                    const wavBlob = await audioConverter.convertWebMToMP3(audioBlob);

                    this.loadingModal.showUploading();
                    const uploadedAudio = await heyGen.uploadAsset(wavBlob, 'audio');
                    voiceConfig = {
                        type: 'audio',
                        audio_asset_id: uploadedAudio.id
                    };
                } catch (uploadError) {
                    // Check if it's a CORS error
                    if (uploadError.message.includes('fetch') || uploadError.message.includes('CORS')) {
                        throw new Error('CORS Error: Cannot upload audio from localhost. Please deploy to a server or use HeyGen API with proper CORS configuration.');
                    }
                    throw uploadError;
                }
            }

            // Step 2: Get avatar/character configuration
            const avatar = this.avatarSelector.getSelectedAvatar();
            const character = this.characterManager.getSelectedCharacter();

            let characterConfig;
            let avatarName = '';
            if (character) {
                // Use custom character
                characterConfig = {
                    type: 'photo',
                    photo_id: character.heygenId
                };
                avatarName = character.name || 'Custom Character';
            } else if (avatar) {
                // Use preset avatar
                characterConfig = {
                    type: 'avatar',
                    avatar_id: avatar.avatar_id,
                    avatar_style: avatar.avatar_style || 'normal'
                };
                avatarName = avatar.avatar_name || avatar.avatar_id;
            }

            // Step 3: Create video
            this.loadingModal.showGenerating();
            console.log('🎬 Creating video with configuration:', {
                character: characterConfig,
                voice: voiceConfig,
                hasTranscript: !!transcript
            });

            const videoId = await heyGen.createVideo({
                character: characterConfig,
                voice: voiceConfig,
                text: transcript // Will be null for custom voice (audio-based), or transcript for preset voice
            });

            console.log('✅ Video creation initiated! Video ID:', videoId);

            // Save to history immediately with processing status
            this.currentVideoId = videoId;
            console.log('💾 Saving video to history...');

            await videoHistoryManager.addVideo({
                videoId: videoId,
                status: 'processing',
                avatarId: avatar?.avatar_id || character?.heygenId,
                avatarName: avatarName,
                voiceType: voiceSelection.type,
                voiceName: voiceSelection.type === 'preset' ? voiceSelection.voice.voice_name : 'Custom Voice',
                transcript: transcript
            });

            console.log('✅ Video saved to history database');

            // Step 4: Wait for video completion with improved polling
            console.log('⏳ Starting video status polling...');
            const videoUrl = await this.waitForVideoWithHistory(videoId);

            console.log('🎉 Video generation complete! URL:', videoUrl);

            // Step 5: Display video
            this.displayVideo(videoUrl, videoId);
            this.loadingModal.showComplete();

            console.log('✅ Video displayed in modal');

        } catch (error) {
            console.error('❌ Error generating video:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            this.loadingModal.showError(error.message || 'Failed to generate video');
        }
    }

    validate() {
        // Check if audio is recorded
        if (!this.recorder.getAudioBlob()) {
            return { valid: false, message: 'Please record your voice first' };
        }

        // Check if avatar/character is selected
        const avatar = this.avatarSelector.getSelectedAvatar();
        const character = this.characterManager.getSelectedCharacter();

        if (!avatar && !character) {
            return { valid: false, message: 'Please select an avatar or character' };
        }

        // Check if voice is selected
        const voice = this.voiceSelector.getSelectedVoice();
        if (!voice) {
            return { valid: false, message: 'Please select a voice option' };
        }

        return { valid: true };
    }

    /**
     * Wait for video completion with history updates
     * Polls indefinitely until video is complete or fails
     */
    async waitForVideoWithHistory(videoId) {
        let attempts = 0;
        const pollInterval = 3000; // 3 seconds

        console.log('⏳ Waiting for video to complete...');

        while (true) {
            try {
                const status = await heyGen.getVideoStatus(videoId);

                console.log(`📊 Video status: ${status.status} (attempt ${attempts + 1})`);

                if (status.status === 'completed') {
                    // Update history with completed status and URL
                    await videoHistoryManager.updateVideo(videoId, {
                        status: 'completed',
                        videoUrl: status.video_url,
                        thumbnailUrl: status.thumbnail_url,
                        duration: status.duration
                    });

                    console.log('✅ Video completed!');
                    return status.video_url;
                }

                if (status.status === 'failed') {
                    // Update history with failed status
                    await videoHistoryManager.updateVideo(videoId, {
                        status: 'failed'
                    });

                    throw new Error('Video generation failed');
                }

                // Update loading modal with progress
                this.loadingModal.show(`Generating video... (${attempts * 3}s)`);

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;

            } catch (error) {
                if (error.message === 'Video generation failed') {
                    throw error;
                }

                // Network error - keep trying
                console.warn('⚠️ Error checking status, retrying...', error.message);
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;
            }
        }
    }

    displayVideo(videoUrl, videoId) {
        this.currentVideoUrl = videoUrl;
        this.currentVideoId = videoId;

        // Show video in modal
        if (window.app) {
            window.app.showVideoModal(videoUrl, videoId);
        }
    }

    downloadVideo() {
        if (!this.currentVideoUrl) return;

        const a = document.createElement('a');
        a.href = this.currentVideoUrl;
        a.download = `voice-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

export default VideoGenerator;
