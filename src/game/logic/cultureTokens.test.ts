import { describe, expect, it } from 'vitest';
import {
    applyReinforce,
    canReinforce,
    countCultureTokensForPlayer,
    getReinforceCandidates,
    placeCultureTokens,
    removeCultureTokensFromCard,
    resolveReinforceCulture,
    tokenCountOnCard,
} from './cultureTokens';
import {
    createCard,
    createGameState,
    createPlayerState,
} from '../testing/createGameState';

describe('placeCultureTokens / remove', () => {
    it('place et retire une culture', () => {
        const card = createCard({ id: 'cond', culture: 'DWARVEN' });
        expect(placeCultureTokens(card, 'DWARVEN', 2)).toBe(2);
        expect(tokenCountOnCard(card, 'DWARVEN')).toBe(2);
        expect(removeCultureTokensFromCard(card, 'DWARVEN', 1)).toBe(1);
        expect(tokenCountOnCard(card, 'DWARVEN')).toBe(1);
        expect(removeCultureTokensFromCard(card, 'DWARVEN', 5)).toBe(1);
        expect(card.cultureTokens).toBeUndefined();
    });

    it('FREE_PEOPLES compte les cultures FP uniquement', () => {
        const card = createCard({
            id: 'cond',
            cultureTokens: { DWARVEN: 2, MEN: 3 },
        });
        expect(tokenCountOnCard(card, 'FREE_PEOPLES')).toBe(2);
        expect(tokenCountOnCard(card, 'ANY')).toBe(5);
    });
});

describe('reinforce', () => {
    it('exige déjà ≥ 1 jeton de la culture', () => {
        const seed = createCard({
            id: 'seed',
            kind: 'FREE_PEOPLE',
            culture: 'DWARVEN',
            type: 'CONDITION',
            cultureTokens: { DWARVEN: 1 },
        });
        const empty = createCard({
            id: 'empty',
            kind: 'FREE_PEOPLE',
            culture: 'DWARVEN',
            type: 'CONDITION',
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    supportArea: [seed, empty],
                }),
            },
        });
        expect(getReinforceCandidates(G, '0', 'DWARVEN')).toHaveLength(1);
        expect(canReinforce(G, '0', 'DWARVEN', 1)).toBe(true);
        expect(applyReinforce(G, '0', 'DWARVEN', 2, [seed.instanceId])).toBe(
            2
        );
        expect(tokenCountOnCard(seed, 'DWARVEN')).toBe(3);
        expect(tokenCountOnCard(empty, 'DWARVEN')).toBe(0);
    });

    it('FREE_PEOPLES reinforce sur une carte dwarven', () => {
        const seed = createCard({
            id: 'seed',
            kind: 'FREE_PEOPLE',
            culture: 'DWARVEN',
            type: 'CONDITION',
            cultureTokens: { DWARVEN: 1 },
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { supportArea: [seed] }),
            },
        });
        expect(resolveReinforceCulture(seed, 'FREE_PEOPLES')).toBe('DWARVEN');
        expect(applyReinforce(G, '0', 'FREE_PEOPLES', 1)).toBe(1);
        expect(tokenCountOnCard(seed, 'DWARVEN')).toBe(2);
    });

    it('compte les jetons du joueur', () => {
        const a = createCard({
            id: 'a',
            kind: 'SHADOW',
            culture: 'MEN',
            cultureTokens: { MEN: 2 },
        });
        const b = createCard({
            id: 'b',
            kind: 'SHADOW',
            culture: 'MEN',
            cultureTokens: { MEN: 1 },
        });
        const G = createGameState({
            players: {
                '1': createPlayerState('1', {
                    profile: {
                        name: 'Shadow',
                        avatar: '',
                        faction: 'shadow',
                    },
                    supportArea: [a, b],
                }),
            },
        });
        expect(countCultureTokensForPlayer(G, '1', 'MEN')).toBe(3);
    });
});
