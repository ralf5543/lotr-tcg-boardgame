import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

function controlFingerprint(G: GameState): string {
    return (G.path || [])
        .map((site, index) => {
            if (!site?.controlledBy) return '';
            return `${index}:${site.id}:${site.controlledBy}`;
        })
        .filter(Boolean)
        .join('|');
}

/**
 * Son CONTROLE_SITE à la fin de l’anim du drapeau (0,3 s)
 * quand un site gagne un `controlledBy`.
 */
export function useSiteControlAudio(G: GameState) {
    const knownRef = useRef<string | null>(null);
    const fingerprint = controlFingerprint(G);

    useEffect(() => {
        if (knownRef.current === null) {
            knownRef.current = fingerprint;
            return;
        }

        if (fingerprint === knownRef.current) return;

        const prev = new Set(
            knownRef.current ? knownRef.current.split('|').filter(Boolean) : []
        );
        const next = fingerprint.split('|').filter(Boolean);
        const gained = next.some((key) => !prev.has(key));
        knownRef.current = fingerprint;

        if (gained) {
            audioService.play('CONTROLE_SITE', { delay: 0.3 });
        }
    }, [fingerprint]);
}
