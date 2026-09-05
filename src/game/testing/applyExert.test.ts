import { describe, expect, it } from 'vitest';
import { applyExert } from '../../utils/applyExert';
import {
    createCard,
    createCompanion,
    createGameState,
} from './createGameState';

describe('applyExert', () => {
    it('inflige une blessure sans tuer un personnage à 3 de vitalité', () => {
        const companion = createCompanion({
            id: 'comp-1',
            vitality: 3,
        });
        const G = createGameState({
            players: {
                '0': {
                    ...createGameState().players['0'],
                    fellowshipArea: [companion],
                },
            },
        });
        const card = G.players['0'].fellowshipArea[0];

        expect(applyExert(G, card)).toBe(true);
        expect(card.wounds).toBe(1);
        expect(card.isDead).not.toBe(true);
        expect(G.pendingDeadCardIds || []).not.toContain('comp-1');
    });

    it('refuse d’exert un personnage à 1 de vitalité restante', () => {
        const companion = createCompanion({
            id: 'comp-1',
            vitality: 1,
        });
        const G = createGameState({
            players: {
                '0': {
                    ...createGameState().players['0'],
                    fellowshipArea: [companion],
                },
            },
        });
        const card = G.players['0'].fellowshipArea[0];

        expect(applyExert(G, card)).toBe(false);
        expect(card.wounds || 0).toBe(0);
        expect(card.isDead).not.toBe(true);
    });

    it('refuse d’exert un personnage déjà à 1 PV (vitalité 2, 1 blessure)', () => {
        const companion = createCompanion({
            id: 'comp-1',
            vitality: 2,
            wounds: 1,
        });
        const G = createGameState();
        expect(applyExert(G, companion)).toBe(false);
        expect(companion.wounds).toBe(1);
    });

    it('accepte l’exert si un attachement porte la vitalité au-dessus de 1', () => {
        const armor = createCard({
            id: 'armor',
            type: 'POSSESSION',
            vitality: 1,
        });
        const companion = createCompanion({
            id: 'comp-1',
            vitality: 1,
            attachments: [armor],
        });
        const G = createGameState();

        expect(applyExert(G, companion)).toBe(true);
        expect(companion.wounds).toBe(1);
        expect(companion.isDead).not.toBe(true);
    });
});
