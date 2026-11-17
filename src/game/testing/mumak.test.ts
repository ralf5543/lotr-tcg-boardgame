import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { tryOpenWinsSkirmish } from '../engine/responseWindow';
import {
    createGameState,
    createPlayerState,
} from './createGameState';
import { parseAbilities } from '../../../scripts/convert/parsers';

describe('Mûmak (5C73)', () => {
    const mumak = getCardById('5C73')!;
    const ability = mumak.abilities![0]!;

    it('parse : fierce déjà en grants ; réponse optionnelle +2 crépuscule', () => {
        expect(mumak.grantsKeywords).toEqual(['FIERCE']);
        const parsed = parseAbilities(
            'Bearer must be a Southron. Bearer is <keyword>fierce.</keyword> Each time bearer wins a skirmish, you may add <symbol>twilight2</symbol>.',
            'Mûmak',
            '5C73'
        );
        expect(parsed?.[0]).toMatchObject({
            phases: ['RESPONSE'],
            optional: true,
            trigger: { type: 'WINS_SKIRMISH', winner: 'BEARER' },
            effects: [{ type: 'ADD_TWILIGHT', count: 2 }],
            source: 'ATTACHMENT',
        });
        expect(ability.effects).toEqual(parsed![0]!.effects);
    });

    it('après victoire du porteur : fenêtre de réponse puis +2 crépuscule', () => {
        const mount = { ...mumak, instanceId: 'mumak' };
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'raider',
            minionSiteNumber: 4,
            attachments: [mount],
        };
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };

        const G = createGameState({
            twilightPool: 1,
            battlefield: [raider],
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'frodo',
                    minionIds: ['raider'],
                },
            ],
            activeSkirmishId: 'sk',
            pendingWinsSkirmish: {
                winnerIds: ['raider'],
                skirmishId: 'sk',
            },
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(tryOpenWinsSkirmish(G)).toBe('WAITING');
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(applyAbilityEffect(G, mount, ability)).toBe(true);
        expect(G.twilightPool).toBe(3);
    });
});
