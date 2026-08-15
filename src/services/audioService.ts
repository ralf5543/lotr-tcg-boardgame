import { SOUND_LIBRARY } from '../config/sounds';
import type { SoundEffect } from '../config/sounds';

class AudioService {
    private ctx: AudioContext | null = null;
    private buffers: Map<SoundEffect, AudioBuffer> = new Map();
    private isMuted: boolean = false;
    private volume: number = 0.5;

    // Initialise l'AudioContext sur la première action utilisateur (ex: clic "Commencer")
    public init() {
        if (!this.ctx) {
            const AudioCtxClass =
                window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioCtxClass();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.preloadSounds();
    }

    // Chargement de tous les fichiers .webm dans la RAM
    private async preloadSounds() {
        if (!this.ctx) return;

        for (const [key, path] of Object.entries(SOUND_LIBRARY)) {
            try {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.buffers.set(key as SoundEffect, audioBuffer);
            } catch (err) {
                console.warn(
                    `[AudioService] Impossible de charger le son: ${path}`,
                    err
                );
            }
        }
    }

    // Jouer un son instantanément
    public async play(effect: SoundEffect) {
        if (this.isMuted) return;

        // 1. Si le moteur Web Audio n'est pas créé, on le crée
        if (!this.ctx) {
            this.init();
        }

        // 2. Si le navigateur l'a mis en pause/suspendu, on le réveille
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        if (!this.ctx) return;

        // 3. Si les sons n'ont pas encore été chargés en mémoire, on les charge
        if (this.buffers.size === 0) {
            await this.preloadSounds();
        }

        const buffer = this.buffers.get(effect);
        if (!buffer) {
            console.warn(
                `⚠️ [AudioService] Son non trouvé ou pas encore chargé : ${effect}`
            );
            return;
        }

        // 4. On joue le son
        const source = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();

        source.buffer = buffer;
        gainNode.gain.value = this.volume;

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(0);
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
