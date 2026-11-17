import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canUseAbility } from '../engine/canUseAbility';
import { createEngineClient } from './createEngineClient';
import {
    createGameState,
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';
import { parseAbilities } from '../../../scripts/convert/parsers';

describe('Pertuisane de Pillard (7C156)', () => {
    const spear = getCardById('7C156')!;
    const ability = spear.abilities![0]!;

    it('parse : affaiblir le détenteur → ajouter 2 crépuscule', () => {
        const parsed = parseAbilities(
            'Bearer must be a <symbol>raider</symbol> Man. <keyword>Skirmish:</keyword> Exert bearer to add <symbol>twilight2</symbol>.',
            'Raider Spear',
            '7C156'
        );
        expect(parsed?.[0]).toMatchObject({
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'BEARER' }] }],
            effects: [{ type: 'ADD_TWILIGHT', count: 2 }],
            source: 'ATTACHMENT',
        });
        expect(ability.effects).toEqual(parsed![0]!.effects);
        expect(ability.cost).toEqual(parsed![0]!.cost);
    });

    it('jouable en escarmouche sur le séide porteur', () => {
        const spearCard = { ...spear, instanceId: 'spear' };
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'raider',
            minionSiteNumber: 4,
            wounds: 0,
            attachments: [spearCard],
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const G = createGameState({
            twilightPool: 1,
            battlefield: [raider],
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'ranger',
                    minionIds: ['raider'],
                },
            ],
            activeSkirmishId: 'sk',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        { ...getCardById('11S164')!, instanceId: 'frodo' },
                        ranger,
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(
            canUseAbility(spearCard, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '1',
            }).valid
        ).toBe(true);
    });

    it('activateAbility : +2 crépuscule et 1 blessure sur le porteur', () => {
        const spearCard = { ...spear, instanceId: 'dev-rs-spear' };
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'dev-rs-raider',
            minionSiteNumber: 4,
            wounds: 0,
            attachments: [spearCard],
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'dev-rs-ranger',
        };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '1',
            G: {
                ...createSkirmishActionWindow('dev-rs-sk', '1'),
                twilightPool: 1,
                fpPlayerId: '0',
                battlefield: [raider],
                skirmishes: [
                    {
                        id: 'dev-rs-sk',
                        companionId: 'dev-rs-ranger',
                        minionIds: ['dev-rs-raider'],
                    },
                ],
                activeSkirmishId: 'dev-rs-sk',
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            {
                                ...getCardById('11S164')!,
                                instanceId: 'dev-rs-frodo',
                            },
                            ranger,
                        ],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });

        engine.moves.activateAbility('dev-rs-spear', '7C156:0');
        const G = engine.getG();
        expect(G.twilightPool).toBe(3);
        expect(G.battlefield[0]?.wounds).toBe(1);
    });
});
