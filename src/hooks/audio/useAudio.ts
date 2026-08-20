import { useEffect } from 'react';
import { audioService } from '../../services/audioService';
import type { SoundEffect } from '../../config/sounds';

export const useAudio = () => {
    useEffect(() => {
        // Débloque l'AudioContext lors du premier clic utilisateur sur l'application
        const handleFirstInteraction = () => {
            audioService.init();
            window.removeEventListener('click', handleFirstInteraction);
        };
        window.addEventListener('click', handleFirstInteraction);

        return () => window.removeEventListener('click', handleFirstInteraction);
    }, []);

    const playSound = (
        effect: SoundEffect,
        options?: Parameters<typeof audioService.play>[1]
    ) => {
        audioService.play(effect, options);
    };

    return { playSound, audioService };
};