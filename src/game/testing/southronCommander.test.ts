import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { canPayAbilityCost } from '../engine/abilities/payAbilityCost';
import {
    abilityNeedsEffectDesignation,
    abilityHasLegalEffectTarget,
} from '../engine/abilities/designation';
import {
    preventPendingEffect,
    passResponseWindow,
    resolveForceAssignPreventDiscard,
} from '../engine/responseWindow';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const TEXT =
    '**Southron.** **Ambush** <symbol>twilight1</symbol>. **Assignment:** Spot 6 companions to assign this minion to the Ring-bearer. The Free Peoples player may discard an unbound companion to prevent this.';

describe('Southron Commander (4U249)', () => {
    it('parse : Affectation spot 6 compagnons → FORCE_ASSIGN Porteur + défausse dissocié', () => {
        const abs = parseAbilities(TEXT, 'Southron Commander', '4U249') || [];
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['ASSIGNMENT'],
                    cost: [
                        {
                            spot: [
                                {
                                    count: 6,
                                    target: [['COMPANION']],
                                },
                            ],
                        },
                    ],
                    effects: [
                        {
                            type: 'FORCE_ASSIGN',
                            minion: 'SELF',
                            companion: [['RING-BEARER']],
                            fpMayPrevent: { discardUnboundCompanion: true },
                        },
                    ],
                }),
            ])
        );
    });

    it('cartes.json aligné + Ambush', () => {
        const card = getCardById('4U249')!;
        expect(card.keywords).toEqual(
            expect.arrayContaining(['SOUTHRON', 'AMBUSH 1'])
        );
        expect(card.abilities?.[0]).toMatchObject({
            effects: [
                {
                    type: 'FORCE_ASSIGN',
                    companion: [['RING-BEARER']],
                    fpMayPrevent: { discardUnboundCompanion: true },
                },
            ],
        });
    });

    it('Empêcher avec 1 dissocié → défausse ; Passer → affectation au Porteur', () => {
        const ability = getCardById('4U249')!.abilities![0]!;
        const commander = {
            ...getCardById('4U249')!,
            instanceId: 'commander',
            abilities: [ability],
        };
        const frodo = createCompanion({
            id: '11S164',
            instanceId: 'frodo',
            keywords: ['RING-BEARER', 'RING-BOUND'],
        });
        const ranger = createCompanion({
            id: '7C116',
            instanceId: 'ranger',
        });
        const companions = [
            frodo,
            ranger,
            ...[1, 2, 3, 4].map((n) =>
                createCompanion({
                    id: `c${n}`,
                    instanceId: `c${n}`,
                })
            ),
        ];
        expect(companions).toHaveLength(6);

        const G = createGameState({
            fpPlayerId: '0',
            assignmentStep: 'ACTIONS',
            battlefield: [commander],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: companions,
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(canPayAbilityCost(G, commander, ability.cost)).toBe(true);
        expect(abilityNeedsEffectDesignation(G, commander, ability)).toBe(
            false
        );
        expect(abilityHasLegalEffectTarget(G, commander, ability)).toBe(true);
        expect(applyAbilityEffect(G, commander, ability)).toBe(true);
        expect(G.pendingEvent).toMatchObject({
            type: 'ABOUT_TO_FORCE_ASSIGN',
            minionId: 'commander',
            companionId: 'frodo',
            preventDiscardUnbound: true,
        });

        // Plusieurs dissociés → désignation, puis défausse.
        expect(preventPendingEffect(G, '0')).toBe('APPLIED');
        expect(G.pendingForceAssignPreventDiscard?.playerId).toBe('0');
        expect(
            resolveForceAssignPreventDiscard(G, '0', 'ranger')
        ).toBe(true);
        expect(G.skirmishes).toHaveLength(0);
        expect(
            G.players['0']?.fellowshipArea.map((c) => c.instanceId)
        ).not.toContain('ranger');
        expect(
            G.players['0']?.discard.some((c) => c.instanceId === 'ranger')
        ).toBe(true);

        // Remettre le rôdeur ; Passer → affectation.
        G.players['0']!.fellowshipArea = [
            frodo,
            ranger,
            ...companions.slice(2),
        ];
        G.players['0']!.discard = [];
        G.skirmishes = [];
        G.pendingForceAssignPreventDiscard = undefined;
        expect(applyAbilityEffect(G, commander, ability)).toBe(true);
        expect(passResponseWindow(G, '0')).toBe('APPLIED');
        expect(G.skirmishes).toEqual([
            expect.objectContaining({
                companionId: 'frodo',
                minionIds: ['commander'],
            }),
        ]);
    });

    it('sans 6 compagnons : coût illégal', () => {
        const ability = getCardById('4U249')!.abilities![0]!;
        const commander = createMinion({
            id: '4U249',
            instanceId: 'commander',
            abilities: [ability],
        });
        const G = createGameState({
            battlefield: [commander],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            instanceId: 'frodo',
                            keywords: ['RING-BEARER'],
                        }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(canPayAbilityCost(G, commander, ability.cost)).toBe(false);
    });
});
