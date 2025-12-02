// HeyGen API Integration
import CONFIG from '../config.js';

class HeyGenService {
    constructor() {
        this.apiKey = CONFIG.HEYGEN_API_KEY;
        this.baseUrl = CONFIG.HEYGEN.BASE_URL;

        // Debug: Show which URL is being used
        console.log('🔧 HeyGen Service initialized with base URL:', this.baseUrl);
        if (this.baseUrl.includes('localhost:3000')) {
            console.log('✅ Using CORS proxy server - CORS errors should be fixed!');
        } else {
            console.log('⚠️ Using direct API - May encounter CORS errors on localhost');
        }
    }

    async getAvatars() {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.HEYGEN.ENDPOINTS.AVATARS}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'x-api-key': this.apiKey
                },
                mode: 'cors'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('HeyGen API Error:', errorText);
                throw new Error(`Failed to fetch avatars: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('HeyGen Avatars Response:', data);
            return data.data?.avatars || [];
        } catch (error) {
            console.error('Error fetching avatars:', error);
            // Return empty array instead of throwing to allow app to continue
            return [];
        }
    }

    async getVoices() {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.HEYGEN.ENDPOINTS.VOICES}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'x-api-key': this.apiKey
                },
                mode: 'cors'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('HeyGen API Error:', errorText);
                throw new Error(`Failed to fetch voices: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('HeyGen Voices Response:', data);
            return data.data?.voices || [];
        } catch (error) {
            console.error('Error fetching voices:', error);
            // Return empty array instead of throwing to allow app to continue
            return [];
        }
    }

    async uploadAsset(file, type = 'image') {
        try {
            // HeyGen API expects RAW BINARY DATA, not FormData!
            // Get the blob data
            let blob = file;

            // If it's a File object, convert to Blob
            if (file instanceof File) {
                blob = new Blob([file], { type: file.type });
            }

            // Determine Content-Type based on file type
            let contentType;
            if (type === 'audio') {
                // HeyGen accepts audio/mpeg (MP3) or audio/x-wav (WAV)
                // Check the blob type to determine which one we have
                if (blob.type === 'audio/wav' || blob.type === 'audio/wave' || blob.type === 'audio/x-wav') {
                    contentType = 'audio/x-wav'; // HeyGen expects audio/x-wav for WAV files
                } else if (blob.type === 'audio/mpeg' || blob.type === 'audio/mp3') {
                    contentType = 'audio/mpeg';
                } else {
                    // Default to audio/x-wav (our converter outputs WAV)
                    contentType = 'audio/x-wav';
                }
                console.log('📤 Uploading audio as:', contentType);
            } else {
                // For images
                contentType = blob.type || 'image/jpeg';
            }

            // Use UPLOAD_URL for uploads (upload.heygen.com domain)
            const uploadUrl = CONFIG.HEYGEN.UPLOAD_URL || this.baseUrl;
            const endpoint = `${uploadUrl}${CONFIG.HEYGEN.ENDPOINTS.UPLOAD_ASSET}`;

            console.log('Uploading to:', endpoint);
            console.log('Content-Type:', contentType);
            console.log('File size:', blob.size, 'bytes');
            console.log('Blob type:', blob.type);

            // Send as RAW BINARY DATA
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': contentType  // IMPORTANT: Set the MIME type
                },
                body: blob,  // Send raw blob, NOT FormData
                mode: 'cors'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload Error:', errorText);
                throw new Error(`Failed to upload asset: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Upload Response:', data);
            return data.data;
        } catch (error) {
            console.error('Error uploading asset:', error);
            throw error;
        }
    }

    async createVideo(config) {
        try {
            // Build the video_input object according to HeyGen API v2
            const videoInput = {
                character: config.character
            };

            // Add voice configuration based on type
            if (config.voice.type === 'text') {
                // Text-based voice (preset AI voice)
                videoInput.voice = {
                    type: 'text',
                    voice_id: config.voice.voice_id,
                    input_text: config.text || ''
                };
            } else if (config.voice.type === 'audio') {
                // Audio-based voice (uploaded audio)
                videoInput.voice = {
                    type: 'audio',
                    audio_asset_id: config.voice.audio_asset_id
                };
            }

            // Build the complete request body
            const requestBody = {
                video_inputs: [videoInput],
                dimension: {
                    width: 1280,
                    height: 720
                },
                aspect_ratio: '16:9',
                test: false
            };

            console.log('Creating video with config:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(`${this.baseUrl}${CONFIG.HEYGEN.ENDPOINTS.CREATE_VIDEO}`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'x-api-key': this.apiKey
                },
                body: JSON.stringify(requestBody),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Video creation error:', errorData);
                throw new Error(`Failed to create video: ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('Video creation response:', data);
            return data.data?.video_id;
        } catch (error) {
            console.error('Error creating video:', error);
            throw error;
        }
    }

    async getVideoStatus(videoId) {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.HEYGEN.ENDPOINTS.VIDEO_STATUS}?video_id=${videoId}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'x-api-key': this.apiKey
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`Failed to get video status: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error getting video status:', error);
            throw error;
        }
    }

    async waitForVideo(videoId) {
        let attempts = 0;

        while (attempts < CONFIG.VIDEO.MAX_POLL_ATTEMPTS) {
            const status = await this.getVideoStatus(videoId);

            if (status.status === 'completed') {
                return status.video_url;
            }

            if (status.status === 'failed') {
                throw new Error('Video generation failed');
            }

            await new Promise(resolve => setTimeout(resolve, CONFIG.VIDEO.POLL_INTERVAL));
            attempts++;
        }

        throw new Error('Video generation timeout');
    }
}

// Export singleton instance
const heyGen = new HeyGenService();
export default heyGen;
