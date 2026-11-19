import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import {
    recordAbilityUseThisPhase,
    clearAbilityPhaseUses,
} from '../logic/abilityPhaseUses';
import { createEngineClient } from './createEngineClient';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const TEXT =
    '**Fortification.** \n**Regroup:** Exert a <symbol>gondor</symbol> Man to play a <symbol>gondor</symbol> fortification from your discard pile (limit 1).';

describe('Sixième niveau (8U44)', () => {
    it('parse : Regroup affaiblir Homme Gondor → fortif depuis défausse (limit 1)', () => {
        expect(
            parseAbilities(TEXT, 'Sixth Level', '8U44')?.[0]
        ).toMatchObject({
            phases: ['REGROUP'],
            limitPerPhase: 1,
            cost: [
                {
                    exert: [
                        {
                            count: 1,
                            target: [['GONDOR', 'MAN']],
                        },
                    ],
                },
            ],
            effects: [
                {
                    type: 'PLAY_FROM_DECK_OR_DISCARD',
                    from: 'DISCARD',
                    target: [['GONDOR', 'FORTIFICATION']],
                },
            ],
        });
    });

    it('cartes.json : ability alignée', () => {
        const card = getCardById('8U44')!;
        expect(card.keywords).toContain('FORTIFICATION');
        expect(card.abilities?.[0]).toMatchObject({
            phases: ['REGROUP'],
            limitPerPhase: 1,
            effects: [
                {
                    type: 'PLAY_FROM_DECK_OR_DISCARD',
                    from: 'DISCARD',
                    target: [['GONDOR', 'FORTIFICATION']],
                },
            ],
        });
    });

    it('affaiblit un Homme Gondor et pose une fortification depuis la défausse', () => {
        const sixth = {
            ...getCardById('8U44')!,
            instanceId: 'sixth',
        };
        const ability = sixth.abilities![0]!;
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            wounds: 0,
        };
        const first = {
            ...getCardById('7C92')!,
            instanceId: 'first-discard',
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );

        const engine = createEngineClient({
            startPhase: 'regroup',
            G: {
                twilightPool: 0,
                currentSiteIndex: 3,
                path: [...sites, null, null, null, null, null],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, ranger],
                        supportArea: [sixth],
                        discard: [first],
                        currentSiteIndex: 3,
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 3 }),
                },
            },
        });

        engine.moves.activateAbility(
            'sixth',
            ability.id,
            'ranger',
            undefined,
            'first-discard'
        );

        const G = engine.getState().G;
        expect(G.players['0']!.discard.some((c) => c.instanceId === 'first-discard')).toBe(
            false
        );
        expect(
            G.players['0']!.supportArea.some((c) => c.instanceId === 'first-discard')
        ).toBe(true);
        expect(ranger.wounds || G.players['0']!.fellowshipArea.find((c) => c.instanceId === 'ranger')?.wounds).toBe(1);
        expect(G.twilightPool).toBe(1);
    });

    it('limit 1 : second usage refusé dans la même phase', () => {
        const sixth = {
            ...getCardById('8U44')!,
            instanceId: 'sixth',
        };
        const ability = sixth.abilities![0]!;
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { supportArea: [sixth] }),
                '1': createPlayerState('1'),
            },
        });
        expect(abilityMeetsPlayRestrictions(G, sixth, ability)).toBe(true);
        recordAbilityUseThisPhase(G, sixth, ability);
        expect(abilityMeetsPlayRestrictions(G, sixth, ability)).toBe(false);
        clearAbilityPhaseUses(G);
        expect(abilityMeetsPlayRestrictions(G, sixth, ability)).toBe(true);
    });
});
