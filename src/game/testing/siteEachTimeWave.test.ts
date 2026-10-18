import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    collectVisibleAbilities,
    abilityProjectsOnto,
} from '../engine/abilities/collectAbilities';
import { tryOpenWinsSkirmish } from '../engine/responseWindow';
import type { Ability, CardState } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const SLAG_ABILITY: Ability = {
    id: '11S258:0:site-each-time',
    phases: ['RESPONSE'],
    optional: false,
    trigger: { type: 'CHARACTER_DIES', target: [['COMPANION']] },
    cost: [],
    effects: [{ type: 'ADD_BURDENS', count: 1 }],
    source: 'SELF',
    text: 'Each time a companion is killed, add a burden.',
};

const HEIGHTS_ABILITY: Ability = {
    id: '11U244:0:site-each-time',
    phases: ['RESPONSE'],
    optional: true,
    responsePlayer: 'FREE_PEOPLE',
    trigger: {
        type: 'WINS_SKIRMISH',
        winner: [['GANDALF', 'COMPANION']],
    },
    cost: [],
    effects: [{ type: 'DISCARD', count: 1, target: [['CONDITION']] }],
    source: 'SELF',
    text: 'Each time a Gandalf companion wins a skirmish, the Free Peoples player may discard a condition from play.',
};

describe('parseSiteAbilities — vague each-time', () => {
    it('Slag Mounds : companion killed → fardeau', () => {
        expect(
            parseSiteAbilities(
                '**Battleground.** Each time a companion is killed, add a burden.',
                '11S258'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['RESPONSE'],
                optional: false,
                trigger: {
                    type: 'CHARACTER_DIES',
                    target: [['COMPANION']],
                },
                effects: [{ type: 'ADD_BURDENS', count: 1 }],
            }),
        ]);
    });

    it('Heights : Gandalf wins → FP may discard condition', () => {
        expect(
            parseSiteAbilities(
                '**Battleground.** Each time a <symbol>gandalf</symbol> companion wins a skirmish, the Free Peoples player may discard a condition from play.',
                '11U244'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['RESPONSE'],
                optional: true,
                responsePlayer: 'FREE_PEOPLE',
                trigger: {
                    type: 'WINS_SKIRMISH',
                    winner: [['GANDALF', 'COMPANION']],
                },
                effects: [
                    {
                        type: 'DISCARD',
                        count: 1,
                        target: [['CONDITION']],
                    },
                ],
            }),
        ]);
    });

    it('laisse Trollshaw inerte (may draw on attach)', () => {
        expect(
            parseSiteAbilities(
                '**Forest.** Each time you play an artifact or possession on your companion, you may draw a card.',
                '11S260'
            )
        ).toBeUndefined();
    });
});

describe('runtime — Slag Mounds / Heights', () => {
    it('Slag Mounds : mort d’un compagnon → +1 fardeau auto', () => {
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry-1',
            title: 'Merry',
            vitality: 1,
            wounds: 0,
        });
        const site = {
            ...createSite({
                id: '11S258',
                instanceId: 'slag-1',
                siteNumber: 3,
            }),
            kind: 'SITE' as const,
            type: 'SITE' as const,
            abilities: [SLAG_ABILITY],
        };
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({ id: `p-${i}`, siteNumber: i + 1 })
        );
        path[2] = site;

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                currentSiteIndex: 2,
                path,
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 2,
                        fellowshipArea: [merry],
                        burdens: 0,
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 2 }),
                },
            },
        });

        engine.moves.applyWound('merry-1');
        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.isDead).toBe(true);
        expect(G.players['0']?.burdens).toBe(1);
    });

    it('Heights : ouvre la réponse FP sans bulle sur Gandalf', () => {
        const gandalf = createCompanion({
            id: 'gandalf',
            instanceId: 'gandalf-1',
            title: 'Gandalf',
            culture: 'GANDALF',
            strength: 10,
            vitality: 4,
        });
        const condition = createCard({
            id: 'cond-1',
            instanceId: 'cond-1',
            title: 'Nine Walkers',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            culture: 'GANDALF',
        });
        const site = {
            ...createSite({
                id: '11U244',
                instanceId: 'heights-1',
                siteNumber: 2,
            }),
            kind: 'SITE' as const,
            type: 'SITE' as const,
            abilities: [HEIGHTS_ABILITY],
        } as unknown as CardState;
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({ id: `p-${i}`, siteNumber: i + 1 })
        );
        path[1] = site as unknown as ReturnType<typeof createSite>;

        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 1,
            path,
            pendingWinsSkirmish: {
                winnerIds: ['gandalf-1'],
                skirmishId: 'sk-1',
            },
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 1,
                    fellowshipArea: [gandalf],
                    supportArea: [condition],
                }),
                '1': createPlayerState('1', { currentSiteIndex: 1 }),
            },
        });

        expect(tryOpenWinsSkirmish(G)).toBe('WAITING');
        expect(G.pendingEvent?.type).toBe('WINS_SKIRMISH');
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.responseWindow?.activePlayerId).toBe('0');
        // Toaster site — pas de bulle sur Gandalf ni sur le site.
        expect(abilityProjectsOnto(G, site, HEIGHTS_ABILITY, gandalf)).toBe(
            false
        );
        expect(
            collectVisibleAbilities(G, gandalf).map((r) => r.ability.id)
        ).not.toContain('11U244:0:site-each-time');
        expect(collectVisibleAbilities(G, site)).toEqual([]);
    });
});
