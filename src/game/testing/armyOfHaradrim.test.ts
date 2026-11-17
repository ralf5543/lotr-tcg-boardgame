import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import { parseAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Armée des Haradrim (5R70)', () => {
    const army = getCardById('5R70')!;
    const ability = army.abilities![0]!;

    it('parse : Skirmish −3 crépuscule → monture Pillard depuis défausse', () => {
        const parsed = parseAbilities(
            '**Southron.** **Skirmish:** Remove <symbol>twilight3</symbol> to play a <symbol>raider</symbol> mount from your discard pile.',
            'Army of Haradrim',
            '5R70'
        );
        expect(parsed?.[0]).toMatchObject({
            phases: ['SKIRMISH'],
            cost: [{ removeTwilight: 3 }],
            effects: [
                {
                    type: 'PLAY_FROM_DECK_OR_DISCARD',
                    from: 'DISCARD',
                    target: [['RAIDER', 'MOUNT']],
                },
            ],
        });
        expect(ability.effects).toEqual(parsed![0]!.effects);
        expect(army.keywords).toEqual(expect.arrayContaining(['SOUTHRON']));
    });

    it('paie 3 crépuscule puis pose le Mûmak sur le Suderon désigné (pas forcément la source)', () => {
        const source = {
            ...army,
            instanceId: 'army',
            minionSiteNumber: 4,
            abilities: [ability],
        };
        const commander = {
            ...getCardById('4U249')!,
            instanceId: 'commander',
            minionSiteNumber: 4,
        };
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

        const G = createGameState({
            twilightPool: 5,
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            battlefield: [source, commander],
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'ranger',
                    minionIds: ['army'],
                },
            ],
            activeSkirmishId: 'sk',
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

        expect(payAbilityCost(G, source, ability.cost)).toBe(true);
        expect(G.twilightPool).toBe(2);
        // Monture + porteur explicite (Commandant, pas l’Armée).
        expect(
            applyAbilityEffect(G, source, ability, [
                'mumak-discard',
                'commander',
            ])
        ).toBe(true);
        expect(G.twilightPool).toBe(0);
        expect(
            commander.attachments?.some((a) => a.instanceId === 'mumak-discard')
        ).toBe(true);
        expect(source.attachments || []).toHaveLength(0);
        expect(G.players['1']!.discard).toHaveLength(0);
    });
});
