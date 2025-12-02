// Voice Selector Component
import heyGen from '../services/heygen.js';

class VoiceSelector {
    constructor() {
        this.voices = [];
        this.selectedVoice = null;
        this.useCustomVoice = false;
    }

    async init() {
        await this.loadPresetVoices();
        this.render();
        // Event listeners will be attached from app.js after all components are initialized
    }

    async loadPresetVoices() {
        try {
            this.voices = await heyGen.getVoices();
        } catch (error) {
            console.error('Error loading preset voices:', error);
            this.voices = [];
        }
    }

    toggleCustomVoice(useCustom) {
        console.log('toggleCustomVoice called with:', useCustom);
        this.useCustomVoice = useCustom;

        // If switching to preset, clear the custom selection
        if (!useCustom) {
            this.render();
            // Don't enable button or auto-advance when switching back to preset
            // User needs to select a voice from the dropdown
            const nextBtn = document.getElementById('next-to-generate');
            if (nextBtn && !this.selectedVoice) {
                nextBtn.disabled = true;
            }
        } else {
            // Using custom voice - enable and auto-advance
            this.render();

            const nextBtn = document.getElementById('next-to-generate');
            if (nextBtn) {
                nextBtn.disabled = false;
                console.log('Next button enabled, useCustomVoice:', this.useCustomVoice);
            }

            if (window.toast) {
                window.toast.success('Using your recorded voice!');
            }

            // Auto-advance to next step - use a longer delay to ensure state is updated
            setTimeout(() => {
                console.log('Auto-advancing, getSelectedVoice:', this.getSelectedVoice());
                if (window.app) window.app.goToStep(4);
            }, 800);
        }
    }

    selectVoice(voice) {
        console.log('selectVoice called with:', voice);
        this.selectedVoice = voice;
        this.useCustomVoice = false;
        this.render();

        const nextBtn = document.getElementById('next-to-generate');
        if (nextBtn) {
            nextBtn.disabled = false;
            console.log('Next button enabled for preset voice');
        }

        if (window.toast) {
            window.toast.success(`Voice "${voice.display_name || voice.name}" selected!`);
        }

        setTimeout(() => {
            console.log('Auto-advancing with preset voice');
            if (window.app) window.app.goToStep(4);
        }, 800);
    }

    getSelectedVoice() {
        if (this.useCustomVoice) {
            return { type: 'custom' };
        }
        return this.selectedVoice ? { type: 'preset', voice: this.selectedVoice } : null;
    }

    render() {
        const presetSection = document.getElementById('preset-voice-section');
        const customSection = document.getElementById('custom-voice-section');
        const voiceSelect = document.getElementById('voice-select');

        if (!voiceSelect) return;

        const presetRadio = document.getElementById('preset-voice-radio');
        const customRadio = document.getElementById('custom-voice-radio');

        if (presetRadio) presetRadio.checked = !this.useCustomVoice;
        if (customRadio) customRadio.checked = this.useCustomVoice;

        if (presetSection) presetSection.style.display = this.useCustomVoice ? 'none' : 'block';
        if (customSection) customSection.style.display = this.useCustomVoice ? 'block' : 'none';

        if (this.voices.length === 0) {
            voiceSelect.innerHTML = '<option value="">No voices available</option>';
            return;
        }

        const groupedVoices = this.voices.reduce((acc, voice) => {
            const lang = voice.language || 'Other';
            if (!acc[lang]) acc[lang] = [];
            acc[lang].push(voice);
            return acc;
        }, {});

        voiceSelect.innerHTML = '<option value="">Select a voice...</option>' +
            Object.entries(groupedVoices).map(([lang, voices]) => `
        <optgroup label="${lang}">
          ${voices.map(voice => `
            <option value="${voice.voice_id}" 
                    ${this.selectedVoice?.voice_id === voice.voice_id ? 'selected' : ''}>
              ${voice.display_name || voice.name} ${voice.gender ? `(${voice.gender})` : ''}
            </option>
          `).join('')}
        </optgroup>
      `).join('');
    }

    attachEventListeners() {
        const voiceSelect = document.getElementById('voice-select');
        const presetRadio = document.getElementById('preset-voice-radio');
        const customRadio = document.getElementById('custom-voice-radio');

        console.log('Attaching voice selector event listeners...');
        console.log('voiceSelect:', voiceSelect);
        console.log('presetRadio:', presetRadio);
        console.log('customRadio:', customRadio);

        // Clone and replace voice select to remove old listeners
        if (voiceSelect) {
            const newVoiceSelect = voiceSelect.cloneNode(true);
            voiceSelect.parentNode.replaceChild(newVoiceSelect, voiceSelect);

            newVoiceSelect.addEventListener('change', (e) => {
                console.log('Voice dropdown changed, value:', e.target.value);
                const voiceId = e.target.value;

                if (!voiceId) {
                    console.log('No voice selected (empty value)');
                    return;
                }

                const voice = this.voices.find(v => v.voice_id === voiceId);
                console.log('Found voice:', voice);

                if (voice) {
                    this.selectVoice(voice);
                } else {
                    console.error('Voice not found in voices array!');
                }
            });
            console.log('Voice select listener attached');
        } else {
            console.error('voice-select element not found!');
        }

        // For radio buttons, we can't clone them as it breaks the radio group
        // Instead, remove the old listener by checking if one exists
        if (presetRadio) {
            // Remove old listener if exists
            if (presetRadio._voiceChangeHandler) {
                presetRadio.removeEventListener('change', presetRadio._voiceChangeHandler);
            }

            // Create new handler and store reference
            presetRadio._voiceChangeHandler = () => {
                console.log('Preset radio changed, checked:', presetRadio.checked);
                if (presetRadio.checked) {
                    this.toggleCustomVoice(false);
                }
            };

            presetRadio.addEventListener('change', presetRadio._voiceChangeHandler);
            console.log('Preset radio listener attached');
        } else {
            console.error('preset-voice-radio element not found!');
        }

        if (customRadio) {
            // Remove old listener if exists
            if (customRadio._voiceChangeHandler) {
                customRadio.removeEventListener('change', customRadio._voiceChangeHandler);
            }

            // Create new handler and store reference
            customRadio._voiceChangeHandler = () => {
                console.log('Custom radio changed, checked:', customRadio.checked);
                if (customRadio.checked) {
                    // Set state IMMEDIATELY and synchronously BEFORE calling toggleCustomVoice
                    this.useCustomVoice = true;
                    console.log('useCustomVoice set to true BEFORE toggleCustomVoice');
                    console.log('getSelectedVoice returns:', this.getSelectedVoice());

                    // Then call toggleCustomVoice for UI updates and auto-advance
                    this.toggleCustomVoice(true);
                }
            };

            customRadio.addEventListener('change', customRadio._voiceChangeHandler);
            console.log('Custom radio listener attached');
        } else {
            console.error('custom-voice-radio element not found!');
        }
    }
}

export default VoiceSelector;
