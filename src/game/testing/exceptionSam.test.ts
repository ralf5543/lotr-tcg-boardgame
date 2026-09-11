import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createPlayerState,
} from './createGameState';
import { getCardById } from '../cardsData';
import { mergeExceptionAbilities } from '../engine/abilities/exceptions';
import { isRingBearerCard } from '../../utils/cardUtils';
import type { Ability } from '../types';

const SAM_DIES_ABILITY: Ability = {
    id: '2C114:exception:dies-frodo',
    phases: ['RESPONSE'],
    cost: [],
    effects: [{ type: 'MAKE_RING_BEARER', resistance: 5 }],
    source: 'SELF',
    text: 'RESPONSE: If Frodo dies, make Sam the Ring-bearer (resistance 5).',
    trigger: {
        type: 'CHARACTER_DIES',
        target: [['Frodo']],
    },
};

describe('exceptions / Sam 2C114', () => {
    it('injecte la réponse Sam via le registre (hors parser)', () => {
        const sam = getCardById('2C114');
        expect(sam?.abilities?.some((a) => a.id === SAM_DIES_ABILITY.id)).toBe(
            true
        );

        const bare = createCompanion({
            id: '2C114',
            title: 'Sam',
            abilities: [],
        });
        const merged = mergeExceptionAbilities(bare);
        expect(merged.abilities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: SAM_DIES_ABILITY.id }),
            ])
        );
    });

    it('à la mort de Frodon : fenêtre de réponse, Sam devient Porteur et prend l’Anneau', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            instanceId: 'frodo',
            keywords: ['RING-BEARER', 'RING-BOUND'],
            vitality: 1,
            resistance: 10,
            attachments: [
                createCard({
                    id: 'one-ring',
                    instanceId: 'one-ring',
                    type: 'RING',
                    title: 'The One Ring',
                    kind: 'FREE_PEOPLE',
                }),
            ],
        });
        const sam = createCompanion({
            id: '2C114',
            instanceId: 'sam',
            title: 'Sam',
            keywords: ['RING-BOUND'],
            vitality: 4,
            resistance: 5,
            actionPhases: ['RESPONSE'],
            abilities: [SAM_DIES_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, sam],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');

        expect(engine.getG().players['0']?.fellowshipArea[0]?.isDead).toBe(true);
        expect(engine.getG().pendingEvent?.type).toBe('CHARACTER_DIES');
        expect(engine.getG().responseWindow?.isOpen).toBe(true);

        engine.moves.activateAbility('sam', SAM_DIES_ABILITY.id);

        const G = engine.getG();
        expect(G.responseWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();

        const livingSam = G.players['0']?.fellowshipArea.find(
            (card) => card.instanceId === 'sam'
        );
        const deadFrodo = G.players['0']?.fellowshipArea.find(
            (card) => card.instanceId === 'frodo'
        );

        expect(isRingBearerCard(livingSam!)).toBe(true);
        expect(livingSam?.resistance).toBe(5);
        expect(livingSam?.attachments?.some((att) => att.type === 'RING')).toBe(
            true
        );
        expect(deadFrodo?.attachments?.some((att) => att.type === 'RING')).toBe(
            false
        );
        expect(isRingBearerCard(deadFrodo!)).toBe(false);
        expect(deadFrodo?.isDead).toBe(true);
    });

    it('remet les fardeaux FP à 0 quand Sam devient Porteur', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            instanceId: 'frodo',
            keywords: ['RING-BEARER', 'RING-BOUND'],
            vitality: 1,
            resistance: 10,
            attachments: [
                createCard({
                    id: 'one-ring',
                    instanceId: 'one-ring',
                    type: 'RING',
                    title: 'The One Ring',
                    kind: 'FREE_PEOPLE',
                }),
            ],
        });
        const sam = createCompanion({
            id: '2C114',
            instanceId: 'sam',
            title: 'Sam',
            keywords: ['RING-BOUND'],
            vitality: 4,
            resistance: 5,
            actionPhases: ['RESPONSE'],
            abilities: [SAM_DIES_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, sam],
                        burdens: 7,
                    }),
                },
            },
        });

        expect(engine.getG().players['0']?.burdens).toBe(7);
        engine.moves.applyWound('frodo');
        engine.moves.activateAbility('sam', SAM_DIES_ABILITY.id);
        expect(engine.getG().players['0']?.burdens).toBe(0);
        engine.moves.cleanupPendingDeaths();
        expect(engine.getG().players['0']?.burdens).toBe(0);
    });
});
