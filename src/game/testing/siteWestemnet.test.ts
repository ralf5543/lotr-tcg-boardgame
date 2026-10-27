import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    assignSiteCharacterWound,
    beginSiteMoveCharacterWoundsIfNeeded,
    livingSiteWoundTargets,
} from '../logic/siteMoveCharacterWounds';
import type { Ability, SiteCardState } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const WESTEMNET_TEXT =
    'When the fellowship moves to this site, the Free Peoples player wounds a companion for each ally.';

function westemnetSite(): SiteCardState {
    return createSite({
        id: '11S264',
        name: 'Westemnet Village',
        abilities: parseSiteAbilities(
            WESTEMNET_TEXT,
            '11S264'
        ) as unknown as Ability[],
    });
}

const ally = (id: string) =>
    createCard({
        id,
        instanceId: id,
        type: 'ALLY',
        kind: 'FREE_PEOPLE',
        title: id,
    });

describe('parseSiteAbilities — Westemnet Village', () => {
    it('moves to → WOUND perAlly sur compagnons', () => {
        expect(parseSiteAbilities(WESTEMNET_TEXT, '11S264')).toEqual([
            expect.objectContaining({
                trigger: { type: 'MOVES_TO' },
                cost: [],
                effects: [
                    {
                        type: 'WOUND',
                        count: 1,
                        perAlly: true,
                        target: [['COMPANION']],
                    },
                ],
            }),
        ]);
    });
});

describe('beginSiteMoveCharacterWoundsIfNeeded — Westemnet', () => {
    function westemnetG(allies: number, companions = 3) {
        const site = westemnetSite();
        return createGameState({
            currentSiteIndex: 0,
            path: [site],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        ...Array.from({ length: companions }, (_, i) =>
                            createCompanion({ instanceId: `comp-${i}` })
                        ),
                        ...Array.from({ length: allies }, (_, i) =>
                            ally(`ally-${i}`)
                        ),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
    }

    it('2 alliés → le FP assigne 2 blessures, compagnons seuls ciblables', () => {
        const G = westemnetG(2);
        expect(beginSiteMoveCharacterWoundsIfNeeded(G, 'startOfShadow')).toBe(
            true
        );
        expect(G.pendingSiteCharacterWounds).toEqual(
            expect.objectContaining({
                playerId: '0',
                remaining: 2,
                queue: [],
                companionsOnly: true,
            })
        );
        // Les alliés ne sont pas des cibles : compagnons seulement.
        expect(
            livingSiteWoundTargets(G, '0').map((c) => c.instanceId)
        ).toEqual(['comp-0', 'comp-1', 'comp-2']);

        // L’Ombre ne peut pas assigner.
        expect(assignSiteCharacterWound(G, '1', 'comp-0')).toBe(false);
        // Un allié n’est pas une cible valide.
        expect(assignSiteCharacterWound(G, '0', 'ally-0')).toBe(false);

        expect(assignSiteCharacterWound(G, '0', 'comp-1')).toBe(true);
        expect(G.pendingSiteCharacterWounds?.remaining).toBe(1);
        const comp1 = () =>
            G.players['0']?.fellowshipArea.find(
                (c) => c.instanceId === 'comp-1'
            );
        expect(comp1()?.wounds).toBe(1);
        expect(assignSiteCharacterWound(G, '0', 'comp-1')).toBe(true);
        expect(G.pendingSiteCharacterWounds).toBeUndefined();
        expect(comp1()?.wounds).toBe(2);
    });

    it('aucun allié → aucune assignation, le flux continue', () => {
        const G = westemnetG(0);
        expect(beginSiteMoveCharacterWoundsIfNeeded(G, 'startOfShadow')).toBe(
            false
        );
        expect(G.pendingSiteCharacterWounds).toBeUndefined();
    });

    it('plus d’alliés que de compagnons : plafonné aux compagnons vivants', () => {
        const G = westemnetG(5, 2);
        expect(beginSiteMoveCharacterWoundsIfNeeded(G, 'startOfShadow')).toBe(
            true
        );
        expect(G.pendingSiteCharacterWounds?.remaining).toBe(2);
    });
});
