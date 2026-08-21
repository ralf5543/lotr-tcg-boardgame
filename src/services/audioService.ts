import { SOUND_LIBRARY } from '../config/sounds';
import type { SoundEffect } from '../config/sounds';

export interface PlayOptions {
    volume?: number;         // Multiplicateur (ex: 0.5 pour réduire de moitié, 1.5 pour booster)
    delay?: number;          // Délai en secondes avant le démarrage (ex: 0.2)
    enablePitch?: boolean;   // Activer ou non la micro-variation aléatoire de pitch (défaut: true)
    pitch?: number;          // Vitesse/pitch fixe explicite (ex: 0.8 pour un grognement plus grave)
    loop?: boolean;          // Jouer en boucle (utile pour une ambiance ou un effet continu)
}

class AudioService {
    private ctx: AudioContext | null = null;
    private buffers: Map<SoundEffect, AudioBuffer[]> = new Map();
    private isMuted: boolean = false;
    private volume: number = 0.5;
    
    // Registre anti-doublon global (horodatage du dernier déclenchement par effet)
    private lastPlayedMap = new Map<string, number>();

    public init() {
        // Protection SSR : N'exécute rien si on est côté serveur (Node.js)
        if (typeof window === 'undefined') return;

        if (!this.ctx) {
            const AudioCtxClass =
                window.AudioContext || (window as any).webkitAudioContext;

            if (AudioCtxClass) {
                this.ctx = new AudioCtxClass();
            }
        }

        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.preloadSounds();
    }

    private async preloadSounds() {
        if (typeof window === 'undefined' || !this.ctx) return;

        for (const [key, paths] of Object.entries(SOUND_LIBRARY)) {
            const pathArray = Array.isArray(paths) ? paths : [paths];
            const loadedBuffers: AudioBuffer[] = [];

            for (const path of pathArray) {
                try {
                    const response = await fetch(path);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer =
                        await this.ctx.decodeAudioData(arrayBuffer);
                    loadedBuffers.push(audioBuffer);
                } catch (err) {
                    console.warn(
                        `[AudioService] Impossible de charger : ${path}`,
                        err
                    );
                }
            }

            this.buffers.set(key as SoundEffect, loadedBuffers);
        }
    }

    public async play(effect: SoundEffect, options: PlayOptions = {}) {
        if (typeof window === 'undefined' || this.isMuted) return;

        // --- VERROU ANTI-DOUBLON (DEBOUNCE 150MS) ---
        const now = Date.now();
        const lastTime = this.lastPlayedMap.get(effect);
        
        // Si le son a déjà été joué, on calcule le vrai diff. Sinon, diff = Infini.
        const diff = lastTime !== undefined ? now - lastTime : Infinity;

        // Si le son a été demandé il y a moins de 150ms, ON BLOQUE
        if (diff < 150) {
            return;
        }

        // On enregistre L'HORODATAGE IMMÉDIATEMENT avant tout code asynchrone
        this.lastPlayedMap.set(effect, now);
        // ----------------------------------------------

        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        if (!this.ctx) return;

        if (this.buffers.size === 0) {
            await this.preloadSounds();
        }

        const availableBuffers = this.buffers.get(effect);
        if (!availableBuffers || availableBuffers.length === 0) return;

        // Options par défaut
        const {
            volume = 1.0,
            delay = 0,
            enablePitch = false,
            pitch,
            loop = false,
        } = options;

        const randomIndex = Math.floor(Math.random() * availableBuffers.length);
        const buffer = availableBuffers[randomIndex];

        const source = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();

        source.buffer = buffer;
        source.loop = loop;

        // 🔊 Gestion du volume spécifique à ce déclenchement
        gainNode.gain.value = this.volume * volume;

        // 🎵 Gestion de la vitesse / hauteur (pitch)
        if (pitch !== undefined) {
            source.playbackRate.value = pitch;
        } else if (enablePitch) {
            // Micro-variation aléatoire par défaut
            source.playbackRate.value = 0.96 + Math.random() * 0.08;
        }

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // ⏱️ Démarrage avec délai éventuel (en secondes)
        const startTime = this.ctx.currentTime + delay;
        source.start(startTime);

        return source;
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    public setVolume(val: number) {
        this.volume = Math.max(0, Math.min(1, val));
    }
}

export const audioService = new AudioService();