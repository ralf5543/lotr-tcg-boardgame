import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    abilityProjectsOnto,
    collectVisibleAbilities,
} from '../engine/abilities/collectAbilities';
import { tryOpenWinsSkirmish } from '../engine/responseWindow';
import { isSiteReplaceForbidden } from '../logic/siteReplaceRestrictions';
import { getEffectiveStrength } from '../../utils/cardStats';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const STARKHORN_ABILITY: Ability = {
    id: '12U193:0:site-each-time',
    phases: ['RESPONSE'],
    optional: true,
    responsePlayer: 'FREE_PEOPLE',
    trigger: { type: 'WINS_SKIRMISH', winner: [['DWARF']] },
    cost: [],
    effects: [{ type: 'DRAW', count: 1 }],
    source: 'SELF',
    text: 'Each time your Dwarf wins a skirmish, you may draw a card.',
};

const WESTFOLD_ABILITY: Ability = {
    id: '15S194:0:site-hunter-str',
    phases: [],
    trigger: { type: 'WHILE' },
    cost: [],
    effects: [
        {
            type: 'MODIFY_STAT',
            stat: 'STRENGTH',
            value: 1,
            target: [['HUNTER']],
        },
    ],
    source: 'SELF',
    text: 'Each hunter character is strength +1.',
};

const MOUNT_DOOM_ABILITY: Ability = {
    id: '15R193:0:site-mount-doom',
    phases: [],
    cost: [],
    effects: [
        {
            type: 'CANNOT_REPLACE_SITE',
            player: 'ALL',
            scope: 'SOURCE_REGION',
            activeOnPath: true,
        },
    ],
    source: 'SELF',
    text: 'Until the end of the game, sites in this region cannot be replaced.',
};

describe('parseSiteAbilities — vague hard / suite', () => {
    it('Starkhorn : Dwarf wins → may draw', () => {
        expect(
            parseSiteAbilities(
                '**Mountain.** Each time your Dwarf wins a skirmish, you may draw a card.',
                '12U193'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['RESPONSE'],
                optional: true,
                responsePlayer: 'FREE_PEOPLE',
                trigger: {
                    type: 'WINS_SKIRMISH',
                    winner: [['DWARF']],
                },
                effects: [{ type: 'DRAW', count: 1 }],
            }),
        ]);
    });

    it('Westfold : hunter character strength +1', () => {
        expect(
            parseSiteAbilities(
                '**Plains.** Each hunter character is strength +1.',
                '15S194'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 1,
                        target: [['HUNTER']],
                    },
                ],
            }),
        ]);
    });

    it('Mount Doom : région verrouillée (activeOnPath)', () => {
        expect(
            parseSiteAbilities(
                '**Battleground. Mountain. Underground.** Until the end of the game, sites in this region cannot be replaced.',
                '15R193'
            )
        ).toEqual([
            expect.objectContaining({
                effects: [
                    {
                        type: 'CANNOT_REPLACE_SITE',
                        player: 'ALL',
                        scope: 'SOURCE_REGION',
                        activeOnPath: true,
                    },
                ],
            }),
        ]);
    });

    it('laisse Steward’s Tomb inerte', () => {
        expect(
            parseSiteAbilities(
                'Wounds cannot be prevented or healed. Burdens cannot be removed.',
                '18U139'
            )
        ).toBeUndefined();
    });
});

describe('runtime — Starkhorn / Westfold / Mount Doom', () => {
    it('Starkhorn : projette sur le Nain vainqueur', () => {
        const gimli = createCompanion({
            id: 'gimli',
            instanceId: 'gimli-1',
            title: 'Gimli',
            race: 'DWARF',
            culture: 'DWARVEN',
            strength: 6,
        });
        const site = {
            ...createSite({
                id: '12U193',
                instanceId: 'stark-1',
                siteNumber: 2,
            }),
            kind: 'SITE' as const,
            type: 'SITE' as const,
            abilities: [STARKHORN_ABILITY],
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
                winnerIds: ['gimli-1'],
                skirmishId: 'sk-1',
            },
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 1,
                    fellowshipArea: [gimli],
                    deck: [
                        createCompanion({ id: 'draw-1', instanceId: 'draw-1' }),
                    ],
                }),
                '1': createPlayerState('1', { currentSiteIndex: 1 }),
            },
        });

        expect(tryOpenWinsSkirmish(G)).toBe('WAITING');
        expect(abilityProjectsOnto(G, site, STARKHORN_ABILITY, gimli)).toBe(
            true
        );
        expect(
            collectVisibleAbilities(G, gimli).map((r) => r.ability.id)
        ).toContain('12U193:0:site-each-time');
    });

    it('Westfold : hunter force +1 sur le site courant', () => {
        const hunter = createCompanion({
            id: 'hunter',
            instanceId: 'hunter-1',
            title: 'Hunter',
            keywords: ['HUNTER 1'],
            strength: 5,
        });
        const site = {
            ...createSite({
                id: '15S194',
                instanceId: 'west-1',
                siteNumber: 3,
            }),
            kind: 'SITE' as const,
            type: 'SITE' as const,
            abilities: [WESTFOLD_ABILITY],
        };
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({ id: `p-${i}`, siteNumber: i + 1 })
        );
        path[2] = site as unknown as ReturnType<typeof createSite>;

        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 2,
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 2,
                    fellowshipArea: [hunter],
                }),
                '1': createPlayerState('1', { currentSiteIndex: 2 }),
            },
        });

        expect(getEffectiveStrength(hunter, G)).toBe(6);
    });

    it('Mount Doom : bloque le replace dans sa région même hors site', () => {
        const doom = {
            ...createSite({
                id: '15R193',
                instanceId: 'doom-1',
                siteNumber: 7,
            }),
            kind: 'SITE' as const,
            type: 'SITE' as const,
            abilities: [MOUNT_DOOM_ABILITY],
        };
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({ id: `p-${i}`, siteNumber: i + 1 })
        );
        path[6] = doom as unknown as ReturnType<typeof createSite>;

        // Compagnie au site 2 (région 1) — Mount Doom est en région 3 (sites 7–9).
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 1,
            path,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 1 }),
                '1': createPlayerState('1', { currentSiteIndex: 1 }),
            },
        });

        expect(isSiteReplaceForbidden(G, '0', 6)).toBe(true); // site 7
        expect(isSiteReplaceForbidden(G, '0', 7)).toBe(true); // site 8
        expect(isSiteReplaceForbidden(G, '0', 8)).toBe(true); // site 9
        expect(isSiteReplaceForbidden(G, '1', 6)).toBe(true);
        expect(isSiteReplaceForbidden(G, '0', 0)).toBe(false); // site 1
        expect(isSiteReplaceForbidden(G, '0', 2)).toBe(false); // site 3
    });
});
