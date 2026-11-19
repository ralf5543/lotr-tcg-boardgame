import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { createEngineClient } from './createEngineClient';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const TEXT =
    '**Fortification.** \n<keyword>Maneuver:</keyword> Exert a <symbol>gondor</symbol> Man or spot a ranger to transfer this condition from your support area to a minion.';

describe('Second Level (7C118)', () => {
    it('parse : deux bulles (exert Homme Gondor OU spot rôdeur) → transfert sur séide', () => {
        const abs = parseAbilities(TEXT, 'Second Level', '7C118') || [];
        expect(abs).toHaveLength(2);
        expect(abs[0]).toMatchObject({
            phases: ['MANEUVER'],
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
                    type: 'TRANSFER_SELF',
                    from: ['SUPPORT'],
                    attachTo: 'TARGET',
                    attachTarget: [['MINION']],
                },
            ],
        });
        expect(abs[1]).toMatchObject({
            phases: ['MANEUVER'],
            cost: [
                {
                    spot: [
                        {
                            count: 1,
                            target: [['RANGER']],
                        },
                    ],
                },
            ],
            effects: [
                {
                    type: 'TRANSFER_SELF',
                    attachTo: 'TARGET',
                    attachTarget: [['MINION']],
                },
            ],
        });
    });

    it('cartes.json : First + Second Level alignés', () => {
        for (const id of ['7C118', '7C92'] as const) {
            const card = getCardById(id)!;
            expect(card.keywords).toContain('FORTIFICATION');
            expect(card.abilities).toHaveLength(2);
            expect(card.abilities?.[0]).toMatchObject({
                effects: [
                    {
                        type: 'TRANSFER_SELF',
                        attachTo: 'TARGET',
                        attachTarget: [['MINION']],
                    },
                ],
            });
        }
    });

    it('bulles FR : coûts séparés (exert vs spot), même effet', () => {
        const second = {
            ...getCardById('7C118')!,
            instanceId: 'second',
        };
        const [exert, spot] = second.abilities || [];
        expect(formatAbilityLabelParts(exert!, second)).toEqual({
            cost: 'Affaiblir un homme <symbol>gondor</symbol>',
            effect:
                'transférer cette situation de votre aire de soutien à un séide',
        });
        expect(formatAbilityLabelParts(spot!, second)).toEqual({
            cost: 'Désigner un rôdeur',
            effect:
                'transférer cette situation de votre aire de soutien à un séide',
        });

        const first = {
            ...getCardById('7C92')!,
            instanceId: 'first',
        };
        const [, knight] = first.abilities || [];
        expect(formatAbilityLabelParts(knight!, first).cost).toBe(
            'Désigner un chevalier'
        );
    });

    it('spot rôdeur → transfert sur séide (sans affaiblir)', () => {
        const second = {
            ...getCardById('7C118')!,
            instanceId: 'second',
        };
        const spotAbility = second.abilities!.find((a) =>
            (a.cost || []).some((c) => c.spot)
        )!;
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            wounds: 0,
        };
        const minion = {
            ...getCardById('5C76')!,
            instanceId: 'southron',
            minionSiteNumber: 4,
            attachments: [] as never[],
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );

        const engine = createEngineClient({
            startPhase: 'maneuver',
            G: {
                twilightPool: 0,
                currentSiteIndex: 3,
                path: [...sites, null, null, null, null, null],
                battlefield: [minion],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, ranger],
                        supportArea: [second],
                        currentSiteIndex: 3,
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 3 }),
                },
            },
        });

        // Pas de coût à désigner (spot) → la cible d’effet est le 3ᵉ argument.
        engine.moves.activateAbility('second', spotAbility.id, 'southron');

        const G = engine.getState().G;
        expect(
            G.players['0']!.supportArea.some((c) => c.instanceId === 'second')
        ).toBe(false);
        const host = G.battlefield.find((c) => c.instanceId === 'southron')!;
        expect(
            (host.attachments || []).some((a) => a.instanceId === 'second')
        ).toBe(true);
        expect(
            G.players['0']!.fellowshipArea.find((c) => c.instanceId === 'ranger')
                ?.wounds || 0
        ).toBe(0);
    });
});
