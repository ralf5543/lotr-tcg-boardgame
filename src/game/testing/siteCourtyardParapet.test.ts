import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { advanceCompany } from '../moves/fellowshipMoves';
import {
    beginOptionalSiteMoveAbility,
    resolvePendingSiteMoveAbility,
} from '../logic/siteMoveAbility';
import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const COURTYARD_TEXT =
    '<keyword>Dwelling.</keyword> When the fellowship moves to this site, the first Shadow player may discard 2 cards from hand to add a burden.';

function courtyardSite(): SiteCardState {
    return createSite({
        id: '13U188',
        siteNumber: 2,
        abilities: parseSiteAbilities(
            COURTYARD_TEXT,
            '13U188'
        ) as unknown as Ability[],
        ...({
            instanceId: '13U188-inst',
            kind: 'SITE',
            type: 'SITE',
        } as object),
    });
}

function shadowHand(n: number): CardState[] {
    return Array.from({ length: n }, (_, i) =>
        createCard({ id: `sh${i + 1}`, title: `Shadow ${i + 1}` })
    );
}

function buildState(shadowCards: number, burdens = 0): GameState {
    return createGameState({
        path: [
            createSite({ id: 'from', siteNumber: 1 }),
            courtyardSite(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
        ],
        players: {
            '0': createPlayerState('0', {
                currentSiteIndex: 0,
                burdens,
                hand: shadowHand(0),
                fellowshipArea: [createCompanion({ id: 'c1' })],
            }),
            '1': createPlayerState('1', { hand: shadowHand(shadowCards) }),
        },
    });
}

describe('parseSiteAbilities — Courtyard Parapet', () => {
    it('Ombre : défausser 2 cartes de la main → +1 fardeau (hors regroupement)', () => {
        const abilities = parseSiteAbilities(COURTYARD_TEXT, '13U188');
        expect(abilities).toEqual([
            expect.objectContaining({
                optional: true,
                responsePlayer: 'SHADOW',
                trigger: { type: 'MOVES_TO' },
                cost: [{ discardFromHand: 2 }],
                effects: [{ type: 'ADD_BURDENS', count: 1 }],
            }),
        ]);
        expect(abilities?.[0]?.trigger).not.toHaveProperty('duringRegroup');
    });
});

describe('runtime — Courtyard Parapet', () => {
    it('advanceCompany : toaster pour le joueur Ombre si main ≥ 2', () => {
        const G = buildState(3);
        advanceCompany(G);
        // Pas d’effet automatique.
        expect(G.players['0']?.burdens).toBe(0);
        expect(G.players['1']?.hand).toHaveLength(3);
        expect(beginOptionalSiteMoveAbility(G, 'startOfShadow')).toBe(true);
        expect(G.pendingSiteMoveAbility).toEqual(
            expect.objectContaining({
                playerId: '1',
                siteInstanceId: '13U188-inst',
                pendingPhaseAfterSiteMove: 'startOfShadow',
            })
        );
    });

    it('Activer avec 2 cartes : +1 fardeau, main Ombre −2, défausse +2', () => {
        const G = buildState(3, 1);
        advanceCompany(G);
        beginOptionalSiteMoveAbility(G, 'startOfShadow');

        const phases: string[] = [];
        expect(
            resolvePendingSiteMoveAbility(
                G,
                '1',
                true,
                { setPhase: (p) => phases.push(p) },
                ['sh1', 'sh2']
            )
        ).toBe(true);
        expect(G.players['0']?.burdens).toBe(2);
        expect(G.players['1']?.hand.map((c) => c.id)).toEqual(['sh3']);
        expect(G.players['1']?.discard).toHaveLength(2);
        expect(G.pendingSiteMoveAbility).toBeUndefined();
        expect(phases).toEqual(['startOfShadow']);
    });

    it('Activer sans choix de cartes ou mauvais nombre : refusé, rien ne change', () => {
        const G = buildState(3);
        advanceCompany(G);
        beginOptionalSiteMoveAbility(G, 'startOfShadow');
        expect(resolvePendingSiteMoveAbility(G, '1', true, {})).toBe(false);
        expect(resolvePendingSiteMoveAbility(G, '1', true, {}, ['sh1'])).toBe(
            false
        );
        expect(G.players['0']?.burdens).toBe(0);
        expect(G.players['1']?.hand).toHaveLength(3);
        expect(G.pendingSiteMoveAbility).toBeDefined();
    });

    it('le joueur FP ne peut pas répondre à la place de l’Ombre', () => {
        const G = buildState(3);
        advanceCompany(G);
        beginOptionalSiteMoveAbility(G, 'startOfShadow');
        expect(
            resolvePendingSiteMoveAbility(G, '0', true, {}, ['sh1', 'sh2'])
        ).toBe(false);
    });

    it('Passer : aucun changement, la phase reprend', () => {
        const G = buildState(3, 1);
        advanceCompany(G);
        beginOptionalSiteMoveAbility(G, 'startOfShadow');
        const phases: string[] = [];
        expect(
            resolvePendingSiteMoveAbility(G, '1', false, {
                setPhase: (p) => phases.push(p),
            })
        ).toBe(true);
        expect(G.players['0']?.burdens).toBe(1);
        expect(G.players['1']?.hand).toHaveLength(3);
        expect(G.pendingSiteMoveAbility).toBeUndefined();
        expect(phases).toEqual(['startOfShadow']);
    });

    it('main Ombre < 2 : pas de toaster', () => {
        const G = buildState(1);
        advanceCompany(G);
        expect(beginOptionalSiteMoveAbility(G, 'startOfShadow')).toBe(false);
        expect(G.pendingSiteMoveAbility).toBeUndefined();
    });

    it('phase Compagnie : fin de phase → toaster Ombre, Activer applique, puis Ombre', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                path: [
                    createSite({ id: 'from', siteNumber: 1 }),
                    courtyardSite(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                ],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        fellowshipArea: [createCompanion({ id: 'c1' })],
                    }),
                    '1': createPlayerState('1', { hand: shadowHand(3) }),
                },
            },
        });
        engine.updatePlayerID('0');
        engine.moves.endFellowshipPhase();
        expect(engine.getG().pendingSiteMoveAbility?.playerId).toBe('1');
        expect(engine.getCtx().phase).toBe('fellowship');

        engine.updatePlayerID('1');
        engine.moves.resolveSiteMoveAbilityChoice(true, ['sh1', 'sh2']);
        const G = engine.getG();
        expect(G.pendingSiteMoveAbility).toBeUndefined();
        expect(G.players['0']?.burdens).toBe(1);
        expect(G.players['1']?.hand).toHaveLength(1);
        expect(['startOfShadow', 'shadow']).toContain(engine.getCtx().phase);
    });
});
