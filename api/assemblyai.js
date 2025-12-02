// AssemblyAI API Integration
import CONFIG from '../config.js';

class AssemblyAIService {
    constructor() {
        this.apiKey = CONFIG.ASSEMBLYAI_API_KEY;
        this.baseUrl = CONFIG.ASSEMBLYAI.BASE_URL;
    }

    async uploadAudio(audioBlob) {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.ASSEMBLYAI.ENDPOINTS.UPLOAD}`, {
                method: 'POST',
                headers: {
                    'authorization': this.apiKey,
                    'content-type': 'application/octet-stream'
                },
                body: audioBlob
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.upload_url;
        } catch (error) {
            console.error('Error uploading audio to AssemblyAI:', error);
            throw error;
        }
    }

    async submitTranscription(audioUrl) {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.ASSEMBLYAI.ENDPOINTS.TRANSCRIPT}`, {
                method: 'POST',
                headers: {
                    'authorization': this.apiKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    audio_url: audioUrl
                })
            });

            if (!response.ok) {
                throw new Error(`Transcription submission failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.id;
        } catch (error) {
            console.error('Error submitting transcription:', error);
            throw error;
        }
    }

    async pollTranscription(transcriptId) {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.ASSEMBLYAI.ENDPOINTS.TRANSCRIPT}/${transcriptId}`, {
                method: 'GET',
                headers: {
                    'authorization': this.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Polling failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error polling transcription:', error);
            throw error;
        }
    }

    async getTranscript(audioBlob) {
        try {
            // Step 1: Upload audio
            const audioUrl = await this.uploadAudio(audioBlob);

            // Step 2: Submit transcription job
            const transcriptId = await this.submitTranscription(audioUrl);

            // Step 3: Poll until complete
            let transcript = await this.pollTranscription(transcriptId);

            while (transcript.status !== 'completed' && transcript.status !== 'error') {
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                transcript = await this.pollTranscription(transcriptId);
            }

            if (transcript.status === 'error') {
                throw new Error('Transcription failed: ' + transcript.error);
            }

            return transcript.text;
        } catch (error) {
            console.error('Error getting transcript:', error);
            throw error;
        }
    }
}

// Export singleton instance
const assemblyAI = new AssemblyAIService();
export default assemblyAI;
