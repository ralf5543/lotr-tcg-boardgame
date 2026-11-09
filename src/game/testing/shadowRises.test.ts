import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { clearExpiredTempKeywords } from '../engine/abilities/applyAbilityEffect';
import { getCardById } from '../cardsData';
import type { Ability, CardState } from '../types';
import {
    createGameState,
    createPlayerState,
} from './createGameState';

const SHADOW_RISES_TEXT =
    '**Maneuver:** Remove <symbol>twilight5</symbol> to make this condition a fierce <symbol>wraith</symbol> minion until the start of the regroup phase that has 10 strength and 3 vitality, and cannot bear other cards. This card is still a condition. At the start of the regroup phase, remove all tokens from here.';

describe('A Shadow Rises (11R216)', () => {
    it('parse : Manœuvre −5 crépuscule → BECOME_MINION fierce 10/3', () => {
        expect(parseAbilities(SHADOW_RISES_TEXT, 'A Shadow Rises', '11R216')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['MANEUVER'],
                    cost: [{ removeTwilight: 5 }],
                    effects: [
                        expect.objectContaining({
                            type: 'BECOME_MINION',
                            strength: 10,
                            vitality: 3,
                            keywords: ['FIERCE'],
                            culture: 'WRAITH',
                            cannotBearCards: true,
                            expiresAtPhase: 'REGROUP',
                            stillCondition: true,
                        }),
                    ],
                }),
            ])
        );
        expect(
            getCardById('11R216')?.abilities?.some(
                (a) => a.effects?.[0]?.type === 'BECOME_MINION'
            )
        ).toBe(true);
    });

    it('runtime : soutien → champ de bataille ; regroupement → soutien', () => {
        const base = getCardById('11R216')!;
        const ability = base.abilities!.find((a) =>
            a.effects?.some((e) => e.type === 'BECOME_MINION')
        ) as Ability;
        const card: CardState = {
            ...base,
            instanceId: 'shadow-rises',
            cultureTokens: { WRAITH: 2 },
        };
        const G = createGameState({
            twilightPool: 8,
            battlefield: [],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    supportArea: [card],
                }),
            },
        });

        expect(applyAbilityEffect(G, card, ability)).toBe(true);
        expect(G.twilightPool).toBe(8); // coût payé hors applyAbilityEffect
        expect(G.players['1']?.supportArea).toHaveLength(0);
        expect(G.battlefield).toHaveLength(1);
        expect(G.battlefield[0]?.type).toBe('MINION');
        expect(G.battlefield[0]?.strength).toBe(10);
        expect(G.battlefield[0]?.vitality).toBe(3);
        expect(G.battlefield[0]?.keywords).toContain('FIERCE');
        expect(G.battlefield[0]?.animatedMinion?.stillCondition).toBe(true);

        // Blessures / jetons pris pendant l’animation.
        G.battlefield[0]!.wounds = 2;
        G.battlefield[0]!.cultureTokens = { WRAITH: 3 };

        clearExpiredTempKeywords(G, 'REGROUP');
        expect(G.battlefield).toHaveLength(0);
        expect(G.players['1']?.supportArea).toHaveLength(1);
        const back = G.players['1']!.supportArea![0]!;
        expect(back.type).toBe('CONDITION');
        expect(back.animatedMinion).toBeUndefined();
        expect(back.wounds).toBe(0);
        expect(back.cultureTokens).toEqual({});
    });
});
