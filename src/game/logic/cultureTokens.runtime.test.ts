import { describe, expect, it } from 'vitest';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { canPayAbilityCost, payAbilityCost } from '../engine/abilities/payAbilityCost';
import {
    abilityHasLegalEffectTarget,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { tokenCountOnCard } from './cultureTokens';
import {
    createCard,
    createGameState,
    createPlayerState,
} from '../testing/createGameState';
import type { Ability } from '../types';

describe('culture tokens runtime', () => {
    it('PLACE_CULTURE_TOKEN sur SELF', () => {
        const source = createCard({
            id: 'seed',
            kind: 'FREE_PEOPLE',
            culture: 'DWARVEN',
            type: 'CONDITION',
            abilities: [],
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { supportArea: [source] }),
            },
        });
        const ability: Ability = {
            id: 'place',
            text: 'Place a dwarven token here.',
            cost: [],
            effects: [
                {
                    type: 'PLACE_CULTURE_TOKEN',
                    culture: 'DWARVEN',
                    count: 1,
                    target: 'SELF',
                },
            ],
        };
        expect(applyAbilityEffect(G, source, ability)).toBe(true);
        expect(tokenCountOnCard(source, 'DWARVEN')).toBe(1);
    });

    it('REINFORCE_CULTURE_TOKEN sur unique candidat', () => {
        const seed = createCard({
            id: 'seed',
            kind: 'FREE_PEOPLE',
            culture: 'DWARVEN',
            type: 'CONDITION',
            cultureTokens: { DWARVEN: 1 },
        });
        const mount = createCard({
            id: 'arod',
            kind: 'FREE_PEOPLE',
            culture: 'DWARVEN',
            type: 'POSSESSION',
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    supportArea: [seed],
                    fellowshipArea: [],
                }),
            },
        });
        const ability: Ability = {
            id: 'reinforce',
            text: 'Reinforce a dwarven token.',
            cost: [],
            effects: [
                {
                    type: 'REINFORCE_CULTURE_TOKEN',
                    culture: 'DWARVEN',
                    count: 2,
                },
            ],
        };
        expect(abilityHasLegalEffectTarget(G, mount, ability)).toBe(true);
        expect(getEffectDesignationCandidates(G, mount, ability)).toHaveLength(
            1
        );
        expect(applyAbilityEffect(G, mount, ability)).toBe(false);
        expect(
            applyAbilityEffect(G, mount, ability, seed.instanceId)
        ).toBe(true);
        expect(tokenCountOnCard(seed, 'DWARVEN')).toBe(3);
    });

    it('REINFORCE exige une désignation si plusieurs cibles', () => {
        const a = createCard({
            id: 'a',
            kind: 'SHADOW',
            culture: 'MEN',
            cultureTokens: { MEN: 1 },
        });
        const b = createCard({
            id: 'b',
            kind: 'SHADOW',
            culture: 'MEN',
            cultureTokens: { MEN: 1 },
        });
        const source = createCard({
            id: '13C83',
            kind: 'SHADOW',
            culture: 'MEN',
            type: 'CONDITION',
        });
        const G = createGameState({
            players: {
                '1': createPlayerState('1', {
                    profile: {
                        name: 'Shadow',
                        avatar: '',
                        faction: 'shadow',
                    },
                    supportArea: [a, b, source],
                }),
            },
        });
        const ability: Ability = {
            id: 'reinforce-3',
            text: 'Reinforce 3 men tokens.',
            cost: [],
            effects: [
                {
                    type: 'REINFORCE_CULTURE_TOKEN',
                    culture: 'MEN',
                    count: 3,
                },
            ],
        };
        expect(getEffectDesignationCandidates(G, source, ability)).toHaveLength(
            2
        );
        expect(applyAbilityEffect(G, source, ability)).toBe(false);
        expect(
            applyAbilityEffect(G, source, ability, a.instanceId)
        ).toBe(true);
        expect(tokenCountOnCard(a, 'MEN')).toBe(4);
        expect(tokenCountOnCard(b, 'MEN')).toBe(1);
    });

    it('removeCultureTokens from SELF en coût', () => {
        const source = createCard({
            id: 'cond',
            kind: 'FREE_PEOPLE',
            culture: 'ELVEN',
            type: 'CONDITION',
            cultureTokens: { ELVEN: 2 },
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { supportArea: [source] }),
            },
        });
        const cost = [
            {
                removeCultureTokens: {
                    culture: 'ELVEN' as const,
                    count: 2,
                    from: 'SELF' as const,
                },
            },
        ];
        expect(canPayAbilityCost(G, source, cost)).toBe(true);
        expect(payAbilityCost(G, source, cost)).toBe(true);
        expect(tokenCountOnCard(source, 'ELVEN')).toBe(0);
    });
});
