import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { attachesToSite } from '../engine/canPlayCard';
import {
    abilityEffectWantsTargetingArrow,
    getHandEventDesignationTargetIds,
    getToPlayExertTargetIds,
} from '../engine/abilities/designation';
import {
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Tempête conjurée (Wizard Storm) — pas de flèche', () => {
    it('2U48 : pose sur site + coût exert → pas une attaque', () => {
        const card = getCardById('2U48')!;
        expect(attachesToSite(card)).toBe(true);
        expect(card.toPlay?.[0]?.exert?.[0]).toBeTruthy();
        // Pas d’ability d’attaque jouable depuis la main (les triggers
        // MOVES_FROM auto n’entrent pas dans le drag).
        expect(
            (card.abilities || [])
                .filter((a) => !a.trigger)
                .every((a) => !abilityEffectWantsTargetingArrow(a))
        ).toBe(true);
    });

    it('coût toPlay : cibles d’exert, mais pas de flèche-main event', () => {
        const card = {
            ...getCardById('2U48')!,
            instanceId: 'storm-1',
        };
        const man = createMinion({
            id: 'man',
            instanceId: 'man-1',
            culture: 'ISENGARD',
            race: 'MAN',
            vitality: 3,
        });
        const G = createGameState({
            path: [
                createSite({ id: 's1', instanceId: 'site-1', siteNumber: 1 }),
            ],
            battlefield: [man],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', { hand: [card] }),
            },
        });
        expect(getToPlayExertTargetIds(G, card)).toContain('man-1');
        // getHandEventDesignationTargetIds = flèche drag : vide (pas un event d’attaque).
        expect(getHandEventDesignationTargetIds(G, card, 'shadow')).toEqual([]);
    });
});
