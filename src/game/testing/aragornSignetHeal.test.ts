import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { createEngineClient } from './createEngineClient';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const TEXT =
    '**Ranger.** At the start of each of your turns, you may heal another companion who has the Aragorn signet.';

describe('Aragorn (1P365) — sceau → soin début de tour', () => {
    it('parse : START_OF_FELLOWSHIP heal autre compagnon SIGNET_ARAGORN', () => {
        expect(
            parseAbilities(TEXT, 'Aragorn', '1P365')?.[0]
        ).toMatchObject({
            phases: ['START_OF_FELLOWSHIP'],
            optional: true,
            cost: [],
            effects: [
                {
                    type: 'HEAL',
                    count: 1,
                    target: [['COMPANION', 'SIGNET_ARAGORN']],
                    excludeSource: true,
                },
            ],
        });
    });

    it('cartes.json : ability alignée', () => {
        const card = getCardById('1P365')!;
        expect(card.keywords).toContain('RANGER');
        expect(card.abilities?.[0]).toMatchObject({
            phases: ['START_OF_FELLOWSHIP'],
            optional: true,
            effects: [
                {
                    type: 'HEAL',
                    target: [['COMPANION', 'SIGNET_ARAGORN']],
                    excludeSource: true,
                },
            ],
        });
    });

    it('début de compagnie : soigne Boromir (sceau), pas Aragorn', () => {
        const aragorn = {
            ...getCardById('1P365')!,
            instanceId: 'aragorn',
            wounds: 1,
        };
        const ability = aragorn.abilities![0]!;
        const boromir = {
            ...getCardById('1R96')!,
            instanceId: 'boromir',
            wounds: 1,
        };
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );

        const engine = createEngineClient({
            startPhase: 'startOfFellowship',
            G: {
                currentSiteIndex: 3,
                path: [...sites, null, null, null, null, null],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, aragorn, boromir],
                        currentSiteIndex: 3,
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 3 }),
                },
            },
        });

        expect(engine.getCtx().phase).toBe('startOfFellowship');

        engine.moves.activateAbility('aragorn', ability.id, 'boromir');

        const G = engine.getState().G;
        const afterBoromir = G.players['0']!.fellowshipArea.find(
            (c) => c.instanceId === 'boromir'
        )!;
        const afterAragorn = G.players['0']!.fellowshipArea.find(
            (c) => c.instanceId === 'aragorn'
        )!;
        expect(afterBoromir.wounds).toBe(0);
        expect(afterAragorn.wounds).toBe(1);
    });

    it('sans cible blessée au sceau : pas actionable', () => {
        const aragorn = {
            ...getCardById('1P365')!,
            instanceId: 'aragorn',
        };
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        aragorn,
                        {
                            ...getCardById('1R96')!,
                            instanceId: 'boromir',
                            wounds: 0,
                        },
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        // canUseAbility via moteur : sans blessure, pas de début ouvert.
        const engine = createEngineClient({
            startPhase: 'startOfFellowship',
            G,
        });
        expect(engine.getCtx().phase).toBe('fellowship');
    });
});
