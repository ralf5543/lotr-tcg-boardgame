import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { tryOpenWinsSkirmish } from '../engine/responseWindow';
import { resolveSkirmish } from '../logic/skirmish';
import {
    createGameState,
    createPlayerState,
} from './createGameState';
import { parseAbilities } from '../../../scripts/convert/parsers';

describe('Mûmak de Guerre (5R78)', () => {
    const warMumak = getCardById('5R78')!;
    const ability = warMumak.abilities![0]!;

    it('parse : fierce déjà en grants ; réponse optionnelle submersion → +5 crépuscule', () => {
        expect(warMumak.grantsKeywords).toEqual(['FIERCE']);
        const parsed = parseAbilities(
            'Bearer must be a Southron. Bearer is <keyword>fierce.</keyword> Each time bearer overwhelms a character, you may add <symbol>twilight5</symbol>.',
            'War Mûmak',
            '5R78'
        );
        expect(parsed?.[0]).toMatchObject({
            phases: ['RESPONSE'],
            optional: true,
            trigger: {
                type: 'WINS_SKIRMISH',
                winner: 'BEARER',
                byOverwhelm: true,
            },
            effects: [{ type: 'ADD_TWILIGHT', count: 5 }],
            source: 'ATTACHMENT',
        });
        expect(ability.effects).toEqual(parsed![0]!.effects);
        expect(ability.trigger).toMatchObject({ byOverwhelm: true });
    });

    it('victoire sans submersion : flag byOverwhelm absent', () => {
        const mount = { ...warMumak, instanceId: 'war-mumak' };
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'raider',
            minionSiteNumber: 4,
            attachments: [mount],
        };
        // Force 10+4=14 vs 8 → gagne, mais pas submersion (il faudrait ≥16).
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            strength: 8,
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
                    fellowshipArea: [ranger],
                }),
                '1': createPlayerState('1'),
            },
        });

        resolveSkirmish(G);
        expect(G.pendingWinsSkirmish?.byOverwhelm).not.toBe(true);
        expect(ranger.isOverwhelmed).not.toBe(true);
    });

    it('après submersion par le porteur : fenêtre puis +5 crépuscule', () => {
        const mount = { ...warMumak, instanceId: 'war-mumak' };
        // Capacités fraîches (après convert).
        mount.abilities = [ability];
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'raider',
            minionSiteNumber: 4,
            attachments: [mount],
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
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
                    companionId: 'ranger',
                    minionIds: ['raider'],
                },
            ],
            activeSkirmishId: 'sk',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger],
                }),
                '1': createPlayerState('1'),
            },
        });

        resolveSkirmish(G);
        expect(ranger.isOverwhelmed).toBe(true);
        // resolveSkirmish ouvre déjà la fenêtre ; sinon on la rouvre.
        if (!G.responseWindow?.isOpen) {
            expect(tryOpenWinsSkirmish(G)).toBe('WAITING');
        }
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.pendingEvent).toMatchObject({
            type: 'WINS_SKIRMISH',
            byOverwhelm: true,
        });
        expect(applyAbilityEffect(G, mount, ability)).toBe(true);
        expect(G.twilightPool).toBe(6);
    });
});
