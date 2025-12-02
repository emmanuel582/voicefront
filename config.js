// Application Configuration
// This file uses environment-aware settings for deployment

const CONFIG = {
    // Backend URL - Set via environment variable in hosting platform
    // For Vercel: Add BACKEND_URL environment variable in project settings
    // For local development: defaults to http://localhost:3000
    BACKEND_URL:
        (typeof window !== 'undefined' && window.BACKEND_URL)
            ? window.BACKEND_URL
            : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? 'http://localhost:3000'
                : '__BACKEND_URL__', // This will be replaced during build/deployment

    // API Endpoints
    HEYGEN: {
        BASE_URL: '', // Will be set dynamically
        UPLOAD_URL: '', // Will be set dynamically
        ENDPOINTS: {
            AVATARS: '/v2/avatars',
            VOICES: '/v2/voices',
            UPLOAD_ASSET: '/v1/asset',
            CREATE_VIDEO: '/v2/video/generate',
            VIDEO_STATUS: '/v1/video_status.get'
        }
    },

    ASSEMBLYAI: {
        BASE_URL: '', // Will be set dynamically
        ENDPOINTS: {
            UPLOAD: '/v2/upload',
            TRANSCRIPT: '/v2/transcript'
        }
    },

    // Application Settings
    RECORDING: {
        MAX_DURATION: 300000, // 5 minutes in milliseconds
        // HeyGen only supports MP3 (audio/mpeg) and WAV (audio/wav)
        // Try WAV first, then webm as fallback (will need conversion)
        MIME_TYPE: 'audio/wav',
        FALLBACK_MIME_TYPE: 'audio/webm;codecs=opus'
    },

    CHARACTER: {
        SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        DB_NAME: 'VoiceVideoCharacters',
        DB_VERSION: 1,
        STORE_NAME: 'characters'
    },

    VIDEO: {
        POLL_INTERVAL: 3000, // 3 seconds
        MAX_POLL_ATTEMPTS: 200 // 10 minutes 
    }
};

// Initialize dynamic URLs based on backend
CONFIG.HEYGEN.BASE_URL = `${CONFIG.BACKEND_URL}/api/heygen`;
CONFIG.HEYGEN.UPLOAD_URL = `${CONFIG.BACKEND_URL}/upload/heygen`;
CONFIG.ASSEMBLYAI.BASE_URL = `${CONFIG.BACKEND_URL}/api/assemblyai`;

// Log configuration in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Configuration loaded:');
    console.log('   Backend URL:', CONFIG.BACKEND_URL);
    console.log('   HeyGen API:', CONFIG.HEYGEN.BASE_URL);
    console.log('   AssemblyAI API:', CONFIG.ASSEMBLYAI.BASE_URL);
}

export default CONFIG;
