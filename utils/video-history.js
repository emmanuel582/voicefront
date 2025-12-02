// Video History Manager
// Stores and retrieves video generation history using IndexedDB

class VideoHistoryManager {
    constructor() {
        this.dbName = 'VoiceVideoHistory';
        this.dbVersion = 1;
        this.storeName = 'videos';
        this.db = null;
    }

    /**
     * Initialize the IndexedDB database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Video history database initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Create indexes
                    objectStore.createIndex('videoId', 'videoId', { unique: true });
                    objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                    objectStore.createIndex('status', 'status', { unique: false });

                    console.log('📦 Video history store created');
                }
            };
        });
    }

    /**
     * Add a video to history
     * @param {Object} videoData - The video data to store
     */
    async addVideo(videoData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            const video = {
                videoId: videoData.videoId,
                videoUrl: videoData.videoUrl || null,
                status: videoData.status || 'processing',
                createdAt: new Date().toISOString(),
                avatarId: videoData.avatarId || null,
                avatarName: videoData.avatarName || null,
                voiceType: videoData.voiceType || null,
                voiceName: videoData.voiceName || null,
                transcript: videoData.transcript || null,
                duration: videoData.duration || null,
                thumbnailUrl: videoData.thumbnailUrl || null
            };

            const request = objectStore.add(video);

            request.onsuccess = () => {
                console.log('✅ Video added to history:', video.videoId);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to add video:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Update a video in history
     * @param {string} videoId - The HeyGen video ID
     * @param {Object} updates - The fields to update
     */
    async updateVideo(videoId, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('videoId');

            const getRequest = index.get(videoId);

            getRequest.onsuccess = () => {
                const video = getRequest.result;

                if (!video) {
                    reject(new Error('Video not found'));
                    return;
                }

                // Update fields
                Object.assign(video, updates);

                const updateRequest = objectStore.put(video);

                updateRequest.onsuccess = () => {
                    console.log('✅ Video updated:', videoId);
                    resolve();
                };

                updateRequest.onerror = () => {
                    console.error('Failed to update video:', updateRequest.error);
                    reject(updateRequest.error);
                };
            };

            getRequest.onerror = () => {
                reject(getRequest.error);
            };
        });
    }

    /**
     * Get all videos from history
     * @returns {Promise<Array>} - Array of video objects
     */
    async getAllVideos() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                // Sort by creation date (newest first)
                const videos = request.result.sort((a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
                resolve(videos);
            };

            request.onerror = () => {
                console.error('Failed to get videos:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get a single video by HeyGen video ID
     * @param {string} videoId - The HeyGen video ID
     * @returns {Promise<Object>} - The video object
     */
    async getVideo(videoId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('videoId');
            const request = index.get(videoId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Delete a video from history
     * @param {number} id - The internal database ID
     */
    async deleteVideo(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log('✅ Video deleted from history');
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to delete video:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Clear all videos from history
     */
    async clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.clear();

            request.onsuccess = () => {
                console.log('✅ Video history cleared');
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to clear history:', request.error);
                reject(request.error);
            };
        });
    }
}

// Export singleton instance
const videoHistoryManager = new VideoHistoryManager();
export default videoHistoryManager;
