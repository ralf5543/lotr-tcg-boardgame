import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canPlayCard } from '../engine/canPlayCard';
import { getEffectDesignationCandidates } from '../engine/abilities/designation';
import { createGameState, createPlayerState } from './createGameState';

describe('Que Sont-Ils ? (1C119)', () => {
    const event = getCardById('1C119')!;
    const ability = event.abilities![0]!;

    it('parse : spot RANGER → DISCARD ROAMING MINION', () => {
        expect(ability.phases).toEqual(['MANEUVER']);
        expect(ability.cost).toEqual([
            {
                spot: [{ count: 1, target: [['RANGER']] }],
            },
        ]);
        expect(ability.effects).toEqual([
            {
                type: 'DISCARD',
                count: 1,
                target: [['ROAMING', 'MINION']],
            },
        ]);
    });

    it('halo : seulement les séides errants', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const roaming = {
            ...getCardById('4C252')!,
            instanceId: 'roaming',
            minionSiteNumber: 4,
        };
        const home = {
            ...getCardById('5C74')!,
            instanceId: 'home',
            minionSiteNumber: 1,
        };
        const pending = {
            ...event,
            instanceId: 'event',
        };
        const G = createGameState({
            currentSiteIndex: 0,
            battlefield: [roaming, home],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [frodo, ranger],
                    hand: [pending],
                }),
                '1': createPlayerState('1', { currentSiteIndex: 0 }),
            },
        });

        expect(
            canPlayCard(pending, {
                G,
                ctx: { phase: 'maneuver' },
                playerID: '0',
            }).valid
        ).toBe(true);

        const targets = getEffectDesignationCandidates(G, pending, ability);
        expect(targets.map((c) => c.instanceId)).toEqual(['roaming']);
    });
});
