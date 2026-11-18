import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { parseAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Mûmak Chieftain (10R45)', () => {
    const text =
        '**Southron.** When you play this minion, you may play a mount on him from your discard pile. Its twilight cost is –2.';

    it('parse : when-played → monture depuis défausse sur soi (−2)', () => {
        const parsed = parseAbilities(text, 'Mûmak Chieftan', '10R45');
        expect(parsed?.[0]).toMatchObject({
            trigger: { type: 'WHEN_PLAYED' },
            optional: true,
            effects: [
                {
                    type: 'PLAY_FROM_DECK_OR_DISCARD',
                    from: 'DISCARD',
                    target: [['MOUNT']],
                    attachTo: 'SELF',
                    twilightReduce: 2,
                },
            ],
        });
    });

    it('cartes.json : ability alignée après convert', () => {
        const card = getCardById('10R45')!;
        expect(card.keywords).toEqual(expect.arrayContaining(['SOUTHRON']));
        expect(card.abilities?.[0]).toMatchObject({
            trigger: { type: 'WHEN_PLAYED' },
            optional: true,
            effects: [
                {
                    type: 'PLAY_FROM_DECK_OR_DISCARD',
                    from: 'DISCARD',
                    target: [['MOUNT']],
                    attachTo: 'SELF',
                    twilightReduce: 2,
                },
            ],
        });
    });

    it('applique : Mûmak attaché sur le Chef à 0 crépuscule (coût 2 − 2)', () => {
        const chieftain = {
            ...getCardById('10R45')!,
            instanceId: 'chieftain',
            minionSiteNumber: 4,
        };
        const ability = chieftain.abilities![0]!;
        const mount = {
            ...getCardById('5C73')!,
            instanceId: 'mumak-discard',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );

        // Pool à 0 : sans −2, le Mûmak (coût 2) ne pourrait pas se poser.
        const G = createGameState({
            twilightPool: 0,
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            battlefield: [chieftain],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [ranger],
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1', {
                    discard: [mount],
                    currentSiteIndex: 3,
                }),
            },
        });

        expect(applyAbilityEffect(G, chieftain, ability, 'mumak-discard')).toBe(
            true
        );
        expect(G.twilightPool).toBe(0);
        expect(
            chieftain.attachments?.some((a) => a.instanceId === 'mumak-discard')
        ).toBe(true);
        expect(G.players['1']!.discard).toHaveLength(0);
    });
});
