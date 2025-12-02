// IndexedDB wrapper for character management
import CONFIG from '../config.js';

class CharacterStorage {
    constructor() {
        this.db = null;
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.CHARACTER.DB_NAME, CONFIG.CHARACTER.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(CONFIG.CHARACTER.STORE_NAME)) {
                    const objectStore = db.createObjectStore(CONFIG.CHARACTER.STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    objectStore.createIndex('name', 'name', { unique: false });
                    objectStore.createIndex('isDefault', 'isDefault', { unique: false });
                    objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async saveCharacter(characterData) {
        if (!this.db) await this.initDB();

        // If setting as default, unset all other defaults first
        if (characterData.isDefault) {
            await this.clearAllDefaults();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.CHARACTER.STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(CONFIG.CHARACTER.STORE_NAME);

            // Ensure createdAt is set if not provided
            if (!characterData.createdAt) {
                characterData.createdAt = new Date().toISOString();
            }

            const request = objectStore.add(characterData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getCharacters() {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.CHARACTER.STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(CONFIG.CHARACTER.STORE_NAME);
            const request = objectStore.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteCharacter(id) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.CHARACTER.STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(CONFIG.CHARACTER.STORE_NAME);
            const request = objectStore.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async setDefaultCharacter(id) {
        if (!this.db) await this.initDB();

        // First, clear all defaults
        await this.clearAllDefaults();

        // Then set the new default
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.CHARACTER.STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(CONFIG.CHARACTER.STORE_NAME);
            const getRequest = objectStore.get(id);

            getRequest.onsuccess = () => {
                const character = getRequest.result;
                if (character) {
                    character.isDefault = true;
                    const updateRequest = objectStore.put(character);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Character not found'));
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async clearAllDefaults() {
        if (!this.db) await this.initDB();

        const characters = await this.getCharacters();
        const promises = characters
            .filter(char => char.isDefault)
            .map(char => {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([CONFIG.CHARACTER.STORE_NAME], 'readwrite');
                    const objectStore = transaction.objectStore(CONFIG.CHARACTER.STORE_NAME);
                    char.isDefault = false;
                    const request = objectStore.put(char);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });

        return Promise.all(promises);
    }

    async getDefaultCharacter() {
        if (!this.db) await this.initDB();

        const characters = await this.getCharacters();
        return characters.find(char => char.isDefault) || null;
    }
}

// Export singleton instance
const storage = new CharacterStorage();
export default storage;
