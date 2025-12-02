// Audio Converter Utility
// Converts WebM audio to MP3 format for HeyGen API compatibility

class AudioConverter {
    /**
     * Convert WebM blob to MP3 using lamejs library
     * Note: This is a client-side conversion using Web Audio API
     * @param {Blob} webmBlob - The WebM audio blob to convert
     * @returns {Promise<Blob>} - The converted MP3 blob
     */
    async convertWebMToMP3(webmBlob) {
        try {
            console.log('🔄 Converting WebM to MP3...');
            console.log('Input size:', webmBlob.size, 'bytes');

            // For now, we'll use a simpler approach: convert to WAV
            // HeyGen accepts both MP3 and WAV
            const wavBlob = await this.convertToWAV(webmBlob);

            console.log('✅ Conversion complete!');
            console.log('Output size:', wavBlob.size, 'bytes');

            return wavBlob;
        } catch (error) {
            console.error('Error converting audio:', error);
            throw new Error('Failed to convert audio format');
        }
    }

    /**
     * Convert audio blob to WAV format using Web Audio API
     * @param {Blob} audioBlob - The audio blob to convert
     * @returns {Promise<Blob>} - The converted WAV blob
     */
    async convertToWAV(audioBlob) {
        // Create an audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Read the blob as array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Convert to WAV
        const wavBlob = this.audioBufferToWav(audioBuffer);

        return wavBlob;
    }

    /**
     * Convert AudioBuffer to WAV blob
     * @param {AudioBuffer} buffer - The audio buffer to convert
     * @returns {Blob} - The WAV blob
     */
    audioBufferToWav(buffer) {
        const length = buffer.length * buffer.numberOfChannels * 2 + 44;
        const arrayBuffer = new ArrayBuffer(length);
        const view = new DataView(arrayBuffer);
        const channels = [];
        let offset = 0;
        let pos = 0;

        // Write WAV header
        const setUint16 = (data) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };

        const setUint32 = (data) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // "RIFF" chunk descriptor
        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"

        // "fmt " sub-chunk
        setUint32(0x20746d66); // "fmt "
        setUint32(16); // subchunk1size
        setUint16(1); // audio format (1 = PCM)
        setUint16(buffer.numberOfChannels);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // byte rate
        setUint16(buffer.numberOfChannels * 2); // block align
        setUint16(16); // bits per sample

        // "data" sub-chunk
        setUint32(0x61746164); // "data"
        setUint32(length - pos - 4); // subchunk2size

        // Write interleaved data
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        while (pos < length) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
}

// Export singleton instance
const audioConverter = new AudioConverter();
export default audioConverter;
