import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { canUseAbility } from '../engine/canUseAbility';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import { tryOpenLosesSkirmish } from '../engine/responseWindow';
import type { Ability } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    'Each time a companion loses a skirmish, you may exert Gollum to take a <symbol>gollum</symbol> card into hand from your discard pile.';

const INCITED: Ability = {
    id: '11R44:0',
    phases: ['RESPONSE'],
    optional: true,
    trigger: {
        type: 'LOSES_SKIRMISH',
        loser: [['COMPANION']],
    },
    cost: [{ exert: [{ count: 1, target: [['Gollum']] }] }],
    effects: [{ type: 'TAKE_FROM_DISCARD', target: [['GOLLUM']] }],
    source: 'SELF',
    text: CSV_TEXT.replace(/<[^>]+>/g, ''),
};

describe('Incited 11R44 — perdante → affaiblir Gollum → reprendre Gollum', () => {
    it('analyse : LOSES_SKIRMISH + exert Gollum + TAKE_FROM_DISCARD', () => {
        expect(parseAbilities(CSV_TEXT, 'Incited', '11R44')).toEqual([
            expect.objectContaining({
                phases: ['RESPONSE'],
                optional: true,
                trigger: {
                    type: 'LOSES_SKIRMISH',
                    loser: [['COMPANION']],
                },
                cost: [
                    {
                        exert: [{ count: 1, target: [['Gollum']] }],
                    },
                ],
                effects: [
                    {
                        type: 'TAKE_FROM_DISCARD',
                        target: [['GOLLUM']],
                    },
                ],
            }),
        ]);
        expect(
            getCardById('11R44')?.abilities?.some(
                (ab) =>
                    ab.trigger?.type === 'LOSES_SKIRMISH' &&
                    (ab.effects || []).some((e) => e.type === 'TAKE_FROM_DISCARD')
            )
        ).toBe(true);
    });

    it('compagnon perd : fenêtre Ombre, affaiblir Gollum, reprendre carte Gollum', () => {
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            strength: 3,
            vitality: 4,
        });
        const gollum = createMinion({
            id: '7C59',
            instanceId: 'gollum',
            title: 'Gollum',
            culture: 'GOLLUM',
            strength: 5,
            vitality: 4,
        });
        const webInDiscard = createCard({
            id: '8C30',
            instanceId: 'web-disc',
            title: 'Web',
            kind: 'SHADOW',
            type: 'POSSESSION',
            culture: 'GOLLUM',
        });
        const otherDiscard = createCard({
            id: '1C133',
            instanceId: 'other-disc',
            title: 'Ambition',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'ISENGARD',
        });
        const incited = createCard({
            id: '11R44',
            instanceId: 'incited',
            title: 'Incited',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'GOLLUM',
            actionPhases: ['RESPONSE'],
            abilities: [INCITED],
        });

        const G = createGameState({
            fpPlayerId: '0',
            skirmishes: [
                {
                    id: 'sk-frodo',
                    companionId: 'frodo',
                    minionIds: ['gollum'],
                    resolved: true,
                },
            ],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [frodo] }),
                '1': createPlayerState('1', {
                    supportArea: [incited],
                    discard: [webInDiscard, otherDiscard],
                }),
            },
            battlefield: [gollum],
            pendingLosesSkirmish: {
                loserIds: ['frodo'],
                skirmishId: 'sk-frodo',
            },
        });

        expect(tryOpenLosesSkirmish(G)).toBe('WAITING');
        expect(G.pendingEvent?.type).toBe('LOSES_SKIRMISH');
        expect(G.responseWindow?.activePlayerId).toBe('1');
        expect(
            canUseAbility(incited, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '1',
            }).valid
        ).toBe(true);

        expect(
            payAbilityCost(
                G,
                incited,
                INCITED.cost,
                'gollum',
                undefined,
                undefined,
                '1'
            )
        ).toBe(true);
        expect(gollum.wounds || 0).toBe(1);

        expect(
            applyAbilityEffect(
                G,
                incited,
                INCITED,
                'web-disc',
                undefined,
                'gollum',
                '1'
            )
        ).toBe(true);

        const shadow = G.players['1']!;
        expect(shadow.hand?.some((c) => c.instanceId === 'web-disc')).toBe(
            true
        );
        expect(
            shadow.discard?.some((c) => c.instanceId === 'web-disc')
        ).toBe(false);
        expect(
            shadow.discard?.some((c) => c.instanceId === 'other-disc')
        ).toBe(true);
    });

    it('preset DEV : Incited + Gollum + défausse Gollum', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_INCITED');
        expect(G.battlefield[0]?.id).toBe('7C59');
        expect(G.players['1']!.supportArea?.[0]?.id).toBe('11R44');
        expect(G.players['1']!.discard?.map((c) => c.id).sort()).toEqual([
            '7R61',
            '8C30',
        ]);
    });
});
