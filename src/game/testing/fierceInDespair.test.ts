import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { getEffectDesignationCandidates } from '../engine/abilities/designation';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { parseAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
} from './createGameState';

describe('Acharné Face au Désespoir (7R148)', () => {
    const event = getCardById('7R148')!;
    const ability = event.abilities![0]!;

    it('parse : spot 2 Hommes Pillard → défausse compagnon sauf Porteur', () => {
        const parsed = parseAbilities(
            'Spot 2 <symbol>raider</symbol> Men to discard a companion (except the Ring-bearer).',
            'Fierce in Despair',
            '7R148'
        );
        expect(parsed?.[0]).toMatchObject({
            cost: [
                {
                    spot: [
                        {
                            count: 2,
                            target: [['RAIDER', 'MAN']],
                        },
                    ],
                },
            ],
            effects: [
                {
                    type: 'DISCARD',
                    count: 1,
                    target: [['COMPANION']],
                    excludeRingBearer: true,
                },
            ],
        });
        expect(ability.effects).toEqual(parsed![0]!.effects);
        expect(event.phases).toEqual(['REGROUP']);
    });

    it('candidats : rôdeur oui, Frodon Porteur non ; défausse le rôdeur', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
            attachments: [{ ...getCardById('4R1')!, instanceId: 'ring' }],
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const source = { ...event, instanceId: 'event' };
        const G = createGameState({
            twilightPool: 7,
            battlefield: [
                {
                    ...getCardById('4C252')!,
                    instanceId: 'r1',
                    minionSiteNumber: 4,
                },
                {
                    ...getCardById('4U249')!,
                    instanceId: 'r2',
                    minionSiteNumber: 4,
                },
            ],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger],
                }),
                '1': createPlayerState('1', {
                    hand: [source],
                }),
            },
        });

        const candidates = getEffectDesignationCandidates(G, source, ability);
        expect(candidates.map((c) => c.instanceId)).toEqual(['ranger']);

        expect(
            applyAbilityEffect(G, source, ability, 'ranger')
        ).toBe(true);
        expect(G.players['0']!.fellowshipArea.map((c) => c.instanceId)).toEqual(
            ['frodo']
        );
        expect(
            G.players['0']!.discard?.some((c) => c.instanceId === 'ranger')
        ).toBe(true);
    });
});
