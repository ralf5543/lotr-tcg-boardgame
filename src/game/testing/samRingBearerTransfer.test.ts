import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import { createPlayerState } from './createGameState';
import { getCardById } from '../cardsData';
import { isRingBearerCard } from '../../utils/cardUtils';
import type { CardState } from '../types';

describe('Sam RB — Anneau Unique réel', () => {
    it('pass Anneau → Sam : mot-clé + Anneau + fardeaux 0 ; mort Sam → fin', () => {
        const frodoBase = getCardById('2C102')!;
        const ringBase = getCardById('11R1')!;
        const samBase = getCardById('10P122')!;
        const frodo: CardState = {
            ...frodoBase,
            instanceId: 'dev-sam-frodo',
            keywords: ['RING-BEARER', 'RING-BOUND'],
            wounds: 3,
            attachments: [
                {
                    ...ringBase,
                    instanceId: 'dev-sam-ring',
                },
            ],
        };
        const sam: CardState = {
            ...samBase,
            instanceId: 'dev-sam-sam',
            // Une blessure suffit après relève.
            wounds: (samBase.vitality || 4) - 1,
        };
        const ab = sam.abilities!.find(
            (a) => a.trigger?.type === 'CHARACTER_DIES'
        )!;

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, sam],
                        burdens: 2,
                    }),
                },
            },
        });

        engine.moves.applyWound('dev-sam-frodo');
        expect(engine.getG().pendingEvent?.type).toBe('ABOUT_TO_WOUND');
        engine.moves.passResponseWindow();

        // Relève obligatoire : plus de fenêtre CHARACTER_DIES à activer.
        expect(engine.getG().pendingEvent).toBeUndefined();
        expect(engine.getG().responseWindow).toBeUndefined();
        expect(ab.optional).toBe(false);

        const G = engine.getG();
        const livingSam = G.players['0']?.fellowshipArea.find(
            (c) => c.instanceId === 'dev-sam-sam'
        )!;
        const deadFrodo = G.players['0']?.fellowshipArea.find(
            (c) => c.instanceId === 'dev-sam-frodo'
        )!;

        expect(livingSam.keywords?.includes('RING-BEARER')).toBe(true);
        expect(isRingBearerCard(livingSam)).toBe(true);
        expect(
            livingSam.attachments?.some(
                (a) => a.type === 'RING' && a.instanceId === 'dev-sam-ring'
            )
        ).toBe(true);
        expect(deadFrodo.keywords?.includes('RING-BEARER')).toBe(false);
        expect(deadFrodo.attachments?.some((a) => a.type === 'RING')).toBe(
            false
        );
        expect(G.players['0']?.burdens).toBe(0);

        engine.moves.cleanupPendingDeaths();

        // Tuer Sam (passer la réponse Anneau) → fin dès qu’il n’y a plus de Porteur vivant
        // (sans attendre l’enterrement UI).
        engine.moves.applyWound('dev-sam-sam');
        let guard = 0;
        while (engine.getG().responseWindow?.isOpen && guard++ < 8) {
            engine.moves.passResponseWindow();
        }
        expect(engine.getG().gameResult?.reason).toBe('RING_BEARER_KILLED');
    });
});
