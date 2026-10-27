/**
 * Moria Guardroom (11S247) + Osgiliath Reclaimed (11S252) :
 * effets optionnels « moves from » — fenêtre AVANT le départ, puis
 * le déplacement reprend (continuation suspendue).
 */

import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createCompanion,
    createSite,
} from './createGameState';
import { resolvePendingSiteMoveAbility } from '../logic/siteMoveAbility';

const guardroom = () =>
    createSite({
        id: '11S247',
        name: 'Moria Guardroom',
        abilities: parseSiteAbilities(
            'When your fellowship moves from this site, you may spot a Dwarf to draw 2 cards.',
            '11S247'
        ) as never,
    });

const osgiliath = () =>
    createSite({
        id: '11S252',
        name: 'Osgiliath Reclaimed',
        abilities: parseSiteAbilities(
            'When the fellowship moves from this site, the Free Peoples player may spot 3 burdens to remove a burden.',
            '11S252'
        ) as never,
    });

/** Compagnie sur le site quitté, en phase fellowship. */
function stateOn(board: ReturnType<typeof createSite>, opts: {
    burdens?: number;
    fellowship: ReturnType<typeof createCompanion>[];
    deckCount?: number;
}) {
    const fp = createPlayerState('0', {
        burdens: opts.burdens ?? 0,
        deck: Array.from({ length: opts.deckCount ?? 5 }, (_, i) => ({
            id: `deck-${i}`,
            instanceId: `deck-${i}`,
            name: `Deck ${i}`,
        })) as never,
        fellowshipArea: opts.fellowship,
    });
    const sh = createPlayerState('1');
    const g = createGameState({ players: { '0': fp, '1': sh } });
    g.path = [board, null] as never;
    fp.currentSiteIndex = 0;
    return g;
}

describe('parse moves-from optionnels', () => {
    it('Guardroom : coût spot DWARF (désignation) + DRAW 2', () => {
        const abs = (parseSiteAbilities(
            'When your fellowship moves from this site, you may spot a Dwarf to draw 2 cards.',
            '11S247'
        ) || []) as unknown as Array<{
            optional?: boolean;
            trigger?: { type?: string };
            cost?: Array<{ spot?: Array<{ count: number; mode: string }> }>;
            effects?: unknown[];
        }>;
        expect(abs).toHaveLength(1);
        expect(abs[0].optional).toBe(true);
        expect(abs[0].trigger?.type).toBe('MOVES_FROM');
        expect(abs[0].cost?.[0].spot?.[0]).toMatchObject({
            count: 1,
            mode: 'DESIGNATION',
        });
        expect(abs[0].effects).toEqual([{ type: 'DRAW', count: 2 }]);
    });

    it('Osgiliath : coût spotBurdens 3 + REMOVE_BURDENS 1', () => {
        const abs = (parseSiteAbilities(
            'When the fellowship moves from this site, the Free Peoples player may spot 3 burdens to remove a burden.',
            '11S252'
        ) || []) as unknown as Array<{
            cost?: Array<{ spotBurdens?: number }>;
            effects?: unknown[];
        }>;
        expect(abs).toHaveLength(1);
        expect(abs[0].cost?.[0].spotBurdens).toBe(3);
        expect(abs[0].effects).toEqual([{ type: 'REMOVE_BURDENS', count: 1 }]);
    });
});

describe('Guardroom : proposition et résolution', () => {
    it('un Nain présent → fenêtre proposée ; Activer pioche 2', async () => {
        const { findOptionalSiteDepartureAbility, beginOptionalSiteDepartureAbility } =
            await import('../logic/siteMoveAbility');
        const dwarf = createCompanion({ instanceId: 'gimli' });
        (dwarf as { race?: string }).race = 'DWARF';
        const g = stateOn(guardroom(), { fellowship: [dwarf] });
        expect(findOptionalSiteDepartureAbility(g)).not.toBeNull();
        expect(beginOptionalSiteDepartureAbility(g, 'startOfShadow')).toBe(true);
        expect(g.pendingSiteMoveAbility?.fromDeparture).toBe(true);
        const handBefore = g.players['0'].hand?.length ?? 0;
        expect(
            resolvePendingSiteMoveAbility(g, '0', true, undefined)
        ).toBe(true);
        expect(g.pendingSiteMoveAbility).toBeUndefined();
        expect((g.players['0'].hand?.length ?? 0) - handBefore).toBe(2);
    });

    it('pas de Nain → pas de fenêtre', async () => {
        const { findOptionalSiteDepartureAbility } = await import(
            '../logic/siteMoveAbility'
        );
        const g = stateOn(guardroom(), {
            fellowship: [createCompanion({ instanceId: 'aragorn' })],
        });
        expect(findOptionalSiteDepartureAbility(g)).toBeNull();
    });

    it('Passer ne pioche pas et libère le pending', async () => {
        const { beginOptionalSiteDepartureAbility } = await import(
            '../logic/siteMoveAbility'
        );
        const dwarf = createCompanion({ instanceId: 'gimli2' });
        (dwarf as { race?: string }).race = 'DWARF';
        const g = stateOn(guardroom(), { fellowship: [dwarf] });
        beginOptionalSiteDepartureAbility(g, 'startOfShadow');
        const handBefore = g.players['0'].hand?.length ?? 0;
        expect(
            resolvePendingSiteMoveAbility(g, '0', false, undefined)
        ).toBe(true);
        expect(g.pendingSiteMoveAbility).toBeUndefined();
        expect(g.players['0'].hand?.length ?? 0).toBe(handBefore);
    });
});

describe('Osgiliath : proposition et résolution', () => {
    it('3 fardeaux → fenêtre ; Activer retire 1 fardeau', async () => {
        const { findOptionalSiteDepartureAbility, beginOptionalSiteDepartureAbility } =
            await import('../logic/siteMoveAbility');
        const g = stateOn(osgiliath(), {
            burdens: 3,
            fellowship: [createCompanion({ instanceId: 'frodo' })],
        });
        expect(findOptionalSiteDepartureAbility(g)).not.toBeNull();
        beginOptionalSiteDepartureAbility(g, 'startOfShadow');
        expect(
            resolvePendingSiteMoveAbility(g, '0', true, undefined)
        ).toBe(true);
        expect(g.players['0'].burdens).toBe(2);
    });

    it('seulement 2 fardeaux → pas de fenêtre', async () => {
        const { findOptionalSiteDepartureAbility } = await import(
            '../logic/siteMoveAbility'
        );
        const g = stateOn(osgiliath(), {
            burdens: 2,
            fellowship: [createCompanion({ instanceId: 'frodo2' })],
        });
        expect(findOptionalSiteDepartureAbility(g)).toBeNull();
    });

    it('Passer garde les fardeaux', async () => {
        const { beginOptionalSiteDepartureAbility } = await import(
            '../logic/siteMoveAbility'
        );
        const g = stateOn(osgiliath(), {
            burdens: 4,
            fellowship: [createCompanion({ instanceId: 'frodo3' })],
        });
        beginOptionalSiteDepartureAbility(g, 'startOfShadow');
        resolvePendingSiteMoveAbility(g, '0', false, undefined);
        expect(g.players['0'].burdens).toBe(4);
        expect(g.pendingSiteMoveAbility).toBeUndefined();
    });
});

describe('continuation du déplacement (Guardroom)', () => {
    it('après le choix, la reprise avance la compagnie et pose le site', async () => {
        const { beginOptionalSiteDepartureAbility } = await import(
            '../logic/siteMoveAbility'
        );
        const { resumeSiteDepartureContinuation } = await import(
            '../logic/siteDeparture'
        );
        const dwarf = createCompanion({ instanceId: 'gimli-run' });
        (dwarf as { race?: string }).race = 'DWARF';
        const g = stateOn(guardroom(), { fellowship: [dwarf] });
        // Filet d’arrivée : site anodin posé dans le deck de l’Ombre.
        g.players['1'].sitesDeck = [
            createSite({ id: '11S228', name: 'Anduin Confluence' }),
        ];
        (g as { awaitingSiteSelection?: boolean }).awaitingSiteSelection = true;

        expect(beginOptionalSiteDepartureAbility(g, 'startOfShadow')).toBe(true);
        g.pendingSiteDepartureContinuation = {
            kind: 'PLAY_SITE',
            siteId: '11S228',
            targetIndex: 1,
        };
        const ok = resolvePendingSiteMoveAbility(g, '0', false, undefined);
        expect(ok).toBe(true);
        resumeSiteDepartureContinuation(
            { G: g, ctx: { phase: 'fellowship' }, events: undefined, playerID: '1' } as never,
            g.pendingSiteDepartureContinuation ?? { kind: 'PLAY_SITE', siteId: '11S228', targetIndex: 1 }
        );
        // La compagnie est arrivée sur le site 2, plus de pending.
        expect(g.players['0'].currentSiteIndex).toBe(1);
        expect(g.pendingSiteMoveAbility).toBeUndefined();
        expect(g.pendingSiteDepartureContinuation).toBeUndefined();
    });
});
