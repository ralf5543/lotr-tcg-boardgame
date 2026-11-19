import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import { canPayAbilityCost } from '../engine/abilities/payAbilityCost';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import {
    preventPendingEffect,
    passResponseWindow,
} from '../engine/responseWindow';

const TEXT =
    '<keyword>Maneuver:</keyword> Spot a mounted <symbol>raider</symbol> Man to discard a companion (except the Ring-bearer). The Free Peoples player may add <symbol>twilight4</symbol> to prevent this.';

describe('Trample (6R82)', () => {
    it('parse : Manœuvre spot pillard monté → défausse compagnon + FP +4 crépuscule', () => {
        const abs = parseAbilities(TEXT, 'Trample', '6R82') || [];
        expect(abs).toHaveLength(1);
        expect(abs[0]).toMatchObject({
            phases: ['MANEUVER'],
            cost: [
                {
                    spot: [
                        {
                            count: 1,
                            target: [['RAIDER', 'MAN']],
                            bearing: [['MOUNT']],
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
                    fpMayPrevent: { addTwilight: 4 },
                },
            ],
        });
    });

    it('cartes.json aligné', () => {
        const card = getCardById('6R82')!;
        expect(card.abilities?.[0]).toMatchObject({
            effects: [
                {
                    type: 'DISCARD',
                    excludeRingBearer: true,
                    fpMayPrevent: { addTwilight: 4 },
                },
            ],
        });
    });

    it('sans monture : coût spot illégal', () => {
        const trample = {
            ...getCardById('6R82')!,
            instanceId: 'trample',
        };
        const scout = createMinion({
            id: '4C252',
            instanceId: 'scout',
            culture: 'RAIDER',
            race: 'MAN',
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    hand: [trample],
                }),
            },
            battlefield: [scout],
        });
        expect(canPayAbilityCost(G, trample, trample.abilities![0]!.cost)).toBe(
            false
        );
    });

    it('Empêcher → +4 crépuscule, compagnon reste ; Passer → défausse', () => {
        const ability = getCardById('6R82')!.abilities![0]!;
        const trample = {
            ...getCardById('6R82')!,
            instanceId: 'trample',
            kind: 'SHADOW' as const,
            abilities: [ability],
        };
        const mount = {
            ...getCardById('5C73')!,
            instanceId: 'mumak',
        };
        const mounted = createMinion({
            id: '5C76',
            instanceId: 'traveler',
            culture: 'RAIDER',
            race: 'MAN',
            attachments: [mount],
        });
        const frodo = createCompanion({
            id: '11S164',
            instanceId: 'frodo',
            keywords: ['RING-BEARER'],
        });
        const ranger = createCompanion({
            id: '7C116',
            instanceId: 'ranger',
        });

        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 0,
            battlefield: [mounted],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(canPayAbilityCost(G, trample, ability.cost)).toBe(true);
        expect(applyAbilityEffect(G, trample, ability, 'ranger')).toBe(true);
        expect(G.pendingEvent).toEqual({
            type: 'ABOUT_TO_DISCARD',
            targetId: 'ranger',
            byShadowCard: true,
            addTwilight: 4,
        });
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.responseWindow?.activePlayerId).toBe('0');

        expect(preventPendingEffect(G, '0')).toBe('APPLIED');
        expect(G.twilightPool).toBe(4);
        expect(G.pendingEvent).toBeUndefined();
        expect(
            G.players['0']?.fellowshipArea.map((c) => c.instanceId)
        ).toEqual(expect.arrayContaining(['frodo', 'ranger']));

        // Second coup : Passer → défausse.
        G.twilightPool = 0;
        const ranger2 = createCompanion({
            id: '7C116',
            instanceId: 'ranger2',
        });
        G.players['0']!.fellowshipArea = [frodo, ranger2];
        expect(applyAbilityEffect(G, trample, ability, 'ranger2')).toBe(true);
        expect(passResponseWindow(G, '0')).toBe('APPLIED');
        expect(
            G.players['0']?.fellowshipArea.map((c) => c.instanceId)
        ).toEqual(['frodo']);
        expect(G.players['0']?.discard.some((c) => c.instanceId === 'ranger2')).toBe(
            true
        );
    });

    it('effet illégal si seul le Porteur est en jeu', () => {
        const trample = {
            ...getCardById('6R82')!,
            instanceId: 'trample',
        };
        const mount = {
            ...getCardById('5C73')!,
            instanceId: 'mumak',
        };
        const mounted = createMinion({
            id: '5C76',
            instanceId: 'traveler',
            culture: 'RAIDER',
            race: 'MAN',
            attachments: [mount],
        });
        const frodo = createCompanion({
            id: '11S164',
            instanceId: 'frodo',
            keywords: ['RING-BEARER'],
        });
        const G = createGameState({
            battlefield: [mounted],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(
            abilityHasLegalEffectTarget(G, trample, trample.abilities![0]!)
        ).toBe(false);
    });
});
