/**
 * Sound Manager
 * Complete audio system for cricket game
 */

export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.musicNodes = new Map();
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.5;
        this.isMuted = false;
        this.isInitialized = false;
        
        // Audio buffers
        this.buffers = new Map();
        
        // Active sound instances
        this.activeSounds = [];
        
        // Background music
        this.currentMusic = null;
        this.musicFadeTime = 1.0;
    }
    
    /**
     * Initialize audio system
     */
    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            // Create SFX channel
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            
            // Create music channel
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            // Load sounds
            await this.loadSounds();
            
            this.isInitialized = true;
            console.log('🔊 Sound manager initialized');
            
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
        }
    }
    
    /**
     * Load all sound files
     */
    async loadSounds() {
        const soundFiles = {
            crowd: '/static/assets/audio/crowd_ambient.mp3',
            stadium: '/static/assets/audio/stadium_ambient.mp3',
            ballHit: '/static/assets/audio/ball_hit.mp3',
            wicket: '/static/assets/audio/wicket.mp3',
            four: '/static/assets/audio/four.mp3',
            six: '/static/assets/audio/six.mp3'
        };
        
        for (const [name, url] of Object.entries(soundFiles)) {
            try {
                const buffer = await this.loadAudioFile(url);
                this.buffers.set(name, buffer);
            } catch (error) {
                console.warn(`Failed to load sound: ${name}`, error);
            }
        }
    }
    
    /**
     * Load audio file
     */
    async loadAudioFile(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }
    
    /**
     * Play a sound
     */
    play(name, options = {}) {
        if (!this.isInitialized || this.isMuted) return null;
        
        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`Sound not found: ${name}`);
            return null;
        }
        
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // Apply options
            source.playbackRate.value = options.speed || 1.0;
            source.detune.value = options.detune || 0;
            
            // Create gain node for this sound
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = options.volume || 1.0;
            
            // Connect
            source.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            // Handle 3D positioning if provided
            if (options.position) {
                const panner = this.audioContext.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'inverse';
                panner.refDistance = 1;
                panner.maxDistance = 100;
                panner.rolloffFactor = 1;
                panner.positionX.value = options.position.x || 0;
                panner.positionY.value = options.position.y || 0;
                panner.positionZ.value = options.position.z || 0;
                
                gainNode.disconnect();
                gainNode.connect(panner);
                panner.connect(this.sfxGain);
            }
            
            // Play
            source.start(0);
            
            // Track active sound
            const soundInstance = { source, gainNode, name };
            this.activeSounds.push(soundInstance);
            
            // Remove when done
            source.onended = () => {
                const index = this.activeSounds.indexOf(soundInstance);
                if (index > -1) {
                    this.activeSounds.splice(index, 1);
                }
            };
            
            // Handle looping
            if (options.loop) {
                source.loop = true;
                this.sounds.set(name, soundInstance);
            }
            
            return soundInstance;
            
        } catch (error) {
            console.error(`Error playing sound ${name}:`, error);
            return null;
        }
    }
    
    /**
     * Play ball hit sound
     */
    playShot(shotType) {
        switch(shotType) {
            case 'slog':
            case 'loft':
                this.play('ballHit', { volume: 1.2, detune: 100 });
                break;
            case 'defend':
                this.play('ballHit', { volume: 0.5, detune: -100 });
                break;
            default:
                this.play('ballHit', { volume: 0.8 });
        }
    }
    
    /**
     * Play wicket sound
     */
    playWicket() {
        this.play('wicket', { volume: 1.5 });
        
        // Crowd reaction
        setTimeout(() => {
            this.play('crowd', { volume: 1.0, detune: 200 });
        }, 500);
    }
    
    /**
     * Play boundary sound
     */
    playBoundary(type) {
        if (type === 'four') {
            this.play('four', { volume: 1.0 });
        } else {
            this.play('six', { volume: 1.3 });
            
            // Extra celebration for six
            setTimeout(() => {
                this.play('crowd', { volume: 1.2, detune: 300 });
            }, 300);
        }
    }
    
    /**
     * Start ambient sounds
     */
    startAmbient() {
        this.play('crowd', { loop: true, volume: 0.3 });
        this.play('stadium', { loop: true, volume: 0.2 });
    }
    
    /**
     * Stop ambient sounds
     */
    stopAmbient() {
        const crowd = this.sounds.get('crowd');
        if (crowd) {
            crowd.source.stop();
            this.sounds.delete('crowd');
        }
        
        const stadium = this.sounds.get('stadium');
        if (stadium) {
            stadium.source.stop();
            this.sounds.delete('stadium');
        }
    }
    
    /**
     * Set master volume
     */
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                this.masterVolume,
                this.audioContext.currentTime,
                0.1
            );
        }
    }
    
    /**
     * Toggle mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                this.isMuted ? 0 : this.masterVolume,
                this.audioContext.currentTime,
                0.1
            );
        }
    }
    
    /**
     * Resume audio context (required after user interaction)
     */
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    /**
     * Cleanup
     */
    dispose() {
        // Stop all sounds
        for (const sound of this.activeSounds) {
            try {
                sound.source.stop();
            } catch (e) {
                // Already stopped
            }
        }
        
        this.activeSounds = [];
        this.sounds.clear();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}