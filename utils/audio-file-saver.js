// Audio File Saver Utility
// Saves audio blob to local file for FFmpeg conversion

class AudioFileSaver {
    /**
     * Save audio blob as a file and trigger download
     * @param {Blob} audioBlob - The audio blob to save
     * @param {string} filename - The filename to save as
     */
    saveAudioFile(audioBlob, filename = 'recorded-audio.webm') {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`✅ Audio file saved as: ${filename}`);
        console.log(`📝 Convert to MP3 using: ffmpeg -i ${filename} -codec:a libmp3lame -b:a 192k output.mp3`);
    }

    /**
     * Create a File object from blob for upload
     * @param {Blob} blob - The blob to convert
     * @param {string} filename - The filename
     * @returns {File} - File object
     */
    blobToFile(blob, filename) {
        return new File([blob], filename, { type: blob.type });
    }
}

// Export singleton instance
const audioFileSaver = new AudioFileSaver();
export default audioFileSaver;
