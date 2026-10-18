import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { advanceCompany } from '../moves/fellowshipMoves';
import {
    beginOptionalSiteMoveAbility,
    resolvePendingSiteMoveAbility,
} from '../logic/siteMoveAbility';
import type { Ability, SiteCardState } from '../types';
import {
    createEngineClient,
    passBothActionWindows,
    type EngineClient,
} from './createEngineClient';
import {
    createCard,
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const CITY_TEXT =
    '<keyword>Battleground.</keyword> When the fellowship moves to this site during the regroup phase, the Free Peoples player may draw a card.';
const CAVES_TEXT =
    '<keyword>Underground.</keyword> When the fellowship moves to this site during the regroup phase, the Free Peoples player may remove 2 burdens.';

function parsedSite(id: string, text: string, siteNumber = 2): SiteCardState {
    return createSite({
        id,
        siteNumber,
        abilities: parseSiteAbilities(text, id) as unknown as Ability[],
        ...({ instanceId: `${id}-inst` } as object),
    });
}

function goToFpDecision(engine: EngineClient) {
    passBothActionWindows(engine);
    engine.updatePlayerID('1');
    engine.moves.confirmHandRefill();
    expect(engine.getG().regroupStep).toBe('FP_DECISION');
}

describe('parseSiteAbilities — moves to optionnel (regroup)', () => {
    it('City of Kings : FP peut piocher', () => {
        expect(parseSiteAbilities(CITY_TEXT, '13U187')).toEqual([
            expect.objectContaining({
                optional: true,
                responsePlayer: 'FREE_PEOPLE',
                trigger: { type: 'MOVES_TO', duringRegroup: true },
                cost: [],
                effects: [{ type: 'DRAW', count: 1 }],
            }),
        ]);
    });

    it('Caves of Aglarond : FP peut retirer 2 fardeaux', () => {
        expect(parseSiteAbilities(CAVES_TEXT, '13S186')).toEqual([
            expect.objectContaining({
                optional: true,
                responsePlayer: 'FREE_PEOPLE',
                trigger: { type: 'MOVES_TO', duringRegroup: true },
                cost: [],
                effects: [{ type: 'REMOVE_BURDENS', count: 2 }],
            }),
        ]);
    });
});

describe('runtime — moves to optionnel (regroup)', () => {
    function buildState(site: SiteCardState, opts?: { burdens?: number }) {
        return createGameState({
            regroupStep: 'FP_DECISION',
            path: [
                createSite({ id: 'from', siteNumber: 1 }),
                site,
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
                    burdens: opts?.burdens ?? 0,
                    deck: [
                        createCard({ id: 'd1', title: 'D1' }),
                        createCard({ id: 'd2', title: 'D2' }),
                    ],
                    fellowshipArea: [createCompanion({ id: 'c1' })],
                }),
            },
        });
    }

    it('advanceCompany n’applique pas l’optionnel (aucun effet auto)', () => {
        const G = buildState(parsedSite('13U187', CITY_TEXT));
        advanceCompany(G);
        expect(G.players['0']?.hand).toHaveLength(0);
        expect(G.pendingSiteMoveAbility).toBeUndefined();
    });

    it('City of Kings : ouvre pendingSiteMoveAbility ; Activer pioche', () => {
        const G = buildState(parsedSite('13U187', CITY_TEXT));
        advanceCompany(G);
        expect(beginOptionalSiteMoveAbility(G, 'startOfShadow')).toBe(true);
        expect(G.pendingSiteMoveAbility).toEqual(
            expect.objectContaining({
                playerId: '0',
                siteInstanceId: '13U187-inst',
                pendingPhaseAfterSiteMove: 'startOfShadow',
            })
        );

        const phases: string[] = [];
        expect(
            resolvePendingSiteMoveAbility(G, '0', true, {
                setPhase: (p) => phases.push(p),
            })
        ).toBe(true);
        expect(G.pendingSiteMoveAbility).toBeUndefined();
        expect(G.players['0']?.hand).toHaveLength(1);
        expect(G.players['0']?.deck).toHaveLength(1);
        expect(phases).toEqual(['startOfShadow']);
    });

    it('Caves : Activer retire 2 fardeaux ; Passer ne fait rien', () => {
        const accept = buildState(parsedSite('13S186', CAVES_TEXT), {
            burdens: 3,
        });
        advanceCompany(accept);
        expect(beginOptionalSiteMoveAbility(accept, 'startOfShadow')).toBe(
            true
        );
        resolvePendingSiteMoveAbility(accept, '0', true, {});
        expect(accept.players['0']?.burdens).toBe(1);

        const decline = buildState(parsedSite('13S186', CAVES_TEXT), {
            burdens: 3,
        });
        advanceCompany(decline);
        beginOptionalSiteMoveAbility(decline, 'startOfShadow');
        const phases: string[] = [];
        expect(
            resolvePendingSiteMoveAbility(decline, '0', false, {
                setPhase: (p) => phases.push(p),
            })
        ).toBe(true);
        expect(decline.players['0']?.burdens).toBe(3);
        expect(decline.pendingSiteMoveAbility).toBeUndefined();
        expect(phases).toEqual(['startOfShadow']);
    });

    it('inerte si rien à faire (pioche vide / 0 fardeau) ou hors regroupement', () => {
        const emptyDeck = buildState(parsedSite('13U187', CITY_TEXT));
        emptyDeck.players['0']!.deck = [];
        advanceCompany(emptyDeck);
        expect(beginOptionalSiteMoveAbility(emptyDeck, 'startOfShadow')).toBe(
            false
        );

        const noBurden = buildState(parsedSite('13S186', CAVES_TEXT), {
            burdens: 0,
        });
        advanceCompany(noBurden);
        expect(beginOptionalSiteMoveAbility(noBurden, 'startOfShadow')).toBe(
            false
        );

        const fellowshipPhase = buildState(parsedSite('13U187', CITY_TEXT));
        fellowshipPhase.regroupStep = undefined;
        advanceCompany(fellowshipPhase);
        expect(
            beginOptionalSiteMoveAbility(fellowshipPhase, 'startOfShadow')
        ).toBe(false);
    });

    it('moveNextSite (regroup, FP_DECISION) : toaster, puis Activer pioche et lance la phase', () => {
        const engine = createEngineClient({
            startPhase: 'regroup',
            playerID: '0',
            G: {
                path: [
                    createSite({ id: 'site-1' }),
                    parsedSite('13U187', CITY_TEXT),
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
                        deck: [
                            createCard({ id: 'd1', title: 'D1' }),
                            createCard({ id: 'd2', title: 'D2' }),
                        ],
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });
        goToFpDecision(engine);
        engine.updatePlayerID('0');
        engine.moves.moveNextSite();

        expect(engine.getG().pendingSiteMoveAbility?.abilityId).toBeDefined();
        expect(engine.getCtx().phase).toBe('regroup');
        expect(engine.getG().players['0']?.hand).toHaveLength(0);

        engine.moves.resolveSiteMoveAbilityChoice(true);
        expect(engine.getG().pendingSiteMoveAbility).toBeUndefined();
        expect(engine.getG().players['0']?.hand).toHaveLength(1);
        expect(['startOfShadow', 'shadow']).toContain(engine.getCtx().phase);
    });

    it('moveNextSite : Passer n’applique rien mais reprend la phase', () => {
        const engine = createEngineClient({
            startPhase: 'regroup',
            playerID: '0',
            G: {
                path: [
                    createSite({ id: 'site-1' }),
                    parsedSite('13S186', CAVES_TEXT),
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
                        burdens: 3,
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });
        goToFpDecision(engine);
        engine.updatePlayerID('0');
        engine.moves.moveNextSite();
        expect(engine.getG().pendingSiteMoveAbility).toBeDefined();

        engine.moves.resolveSiteMoveAbilityChoice(false);
        expect(engine.getG().players['0']?.burdens).toBe(3);
        expect(engine.getG().pendingSiteMoveAbility).toBeUndefined();
        expect(['startOfShadow', 'shadow']).toContain(engine.getCtx().phase);
    });

    it('playSite en regroupement : toaster aussi après la pose du site', () => {
        const nextSite = parsedSite('13S186', CAVES_TEXT);
        nextSite.id = 'site-2';
        const engine = createEngineClient({
            startPhase: 'regroup',
            playerID: '0',
            G: {
                path: [
                    createSite({ id: 'site-1' }),
                    null,
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
                        burdens: 3,
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                    '1': createPlayerState('1', { sitesDeck: [nextSite] }),
                },
            },
        });
        goToFpDecision(engine);
        engine.updatePlayerID('0');
        engine.moves.moveNextSite();
        expect(engine.getG().awaitingSiteSelection).toBe(true);

        engine.updatePlayerID('1');
        engine.moves.playSite('site-2', 1);
        expect(engine.getG().pendingSiteMoveAbility?.playerId).toBe('0');
        expect(engine.getCtx().phase).toBe('regroup');

        engine.updatePlayerID('0');
        engine.moves.resolveSiteMoveAbilityChoice(true);
        expect(engine.getG().players['0']?.burdens).toBe(1);
        expect(['startOfShadow', 'shadow']).toContain(engine.getCtx().phase);
    });
});
