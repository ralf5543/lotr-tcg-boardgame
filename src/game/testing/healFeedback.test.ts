import { describe, expect, it } from 'vitest';
import { applyHeal } from '../../utils/applyHeal';
import {
    assignSanctuaryHeal,
    beginSanctuaryHeals,
    getSanctuaryHealCandidates,
} from '../logic/sanctuary';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';
import type { SiteCardState } from '../types';

/** Chemin Standard : n’importe quelle carte ; sanctuaire = positions 3 et 6. */
function pathWithSiteAt(index: number): (SiteCardState | null)[] {
    const path: (SiteCardState | null)[] = Array.from(
        { length: 9 },
        () => null
    );
    path[index] = createSite({
        id: `site-${index}`,
        name: `Site ${index + 1}`,
        keywords: ['PLAINS'],
        siteNumber: index + 1,
    });
    return path;
}

describe('applyHeal', () => {
    it('retire des blessures et enregistre lastHealedCardIds', () => {
        const gimli = createCompanion({
            id: 'gimli',
            instanceId: 'gimli-1',
            wounds: 2,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { fellowshipArea: [gimli] }),
            },
        });

        expect(applyHeal(G, gimli, 1)).toBe(1);
        expect(gimli.wounds).toBe(1);
        expect(G.lastHealedCardIds).toEqual(['gimli-1']);
    });

    it('ne fait rien si la carte n’a pas de blessure', () => {
        const frodo = createCompanion({ id: 'frodo', wounds: 0 });
        const G = createGameState();
        expect(applyHeal(G, frodo, 1)).toBe(0);
        expect(G.lastHealedCardIds).toBeUndefined();
    });
});

describe('sanctuaire (Standard : sites 3 et 6)', () => {
    it('ouvre le choix de 5 soins au début de la compagnie sur le site 3', () => {
        const engine = createEngineClient({
            startPhase: 'startOfFellowship',
            playerID: '0',
            G: {
                path: pathWithSiteAt(2),
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 2,
                        fellowshipArea: [
                            createCompanion({
                                id: 'aragorn',
                                instanceId: 'aragorn',
                                wounds: 2,
                            }),
                            createCompanion({
                                id: 'gimli',
                                instanceId: 'gimli',
                                wounds: 1,
                            }),
                            createCompanion({
                                id: 'frodo',
                                instanceId: 'frodo',
                                wounds: 0,
                            }),
                        ],
                    }),
                },
            },
        });

        const opened = engine.getG();
        expect(engine.getCtx().phase).toBe('startOfFellowship');
        expect(opened.sanctuaryHeal?.remaining).toBe(5);

        engine.moves.assignSanctuaryHeal('aragorn');
        engine.moves.assignSanctuaryHeal('aragorn');
        engine.moves.assignSanctuaryHeal('gimli');

        const G = engine.getG();
        const fellows = G.players['0']?.fellowshipArea || [];
        expect(fellows.find((c) => c.id === 'aragorn')?.wounds).toBe(0);
        expect(fellows.find((c) => c.id === 'gimli')?.wounds).toBe(0);
        expect(G.sanctuaryHeal).toBeUndefined();
        expect(engine.getCtx().phase).toBe('fellowship');

        engine.stop();
    });

    it('permet de valider sans soigner', () => {
        const engine = createEngineClient({
            startPhase: 'startOfFellowship',
            playerID: '0',
            G: {
                path: pathWithSiteAt(2),
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 2,
                        fellowshipArea: [
                            createCompanion({
                                id: 'aragorn',
                                instanceId: 'aragorn',
                                wounds: 2,
                            }),
                        ],
                    }),
                },
            },
        });

        expect(engine.getG().sanctuaryHeal?.remaining).toBe(5);
        engine.moves.confirmSanctuaryHeals();
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(2);
        expect(engine.getG().sanctuaryHeal).toBeUndefined();
        expect(engine.getCtx().phase).toBe('fellowship');

        engine.stop();
    });

    it('soigne aussi au site 6', () => {
        const G = createGameState({
            path: pathWithSiteAt(5),
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 5,
                    fellowshipArea: [
                        createCompanion({ id: 'aragorn', wounds: 1 }),
                    ],
                }),
            },
        });
        expect(beginSanctuaryHeals(G)).toBe(true);
        expect(G.sanctuaryHeal?.remaining).toBe(5);
    });

    it('ne soigne pas hors sites 3 et 6', () => {
        const wounded = createCompanion({
            id: 'aragorn',
            wounds: 2,
        });
        const G = createGameState({
            path: pathWithSiteAt(0),
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [wounded],
                }),
            },
        });
        expect(beginSanctuaryHeals(G)).toBe(false);
        expect(getSanctuaryHealCandidates(G)).toHaveLength(1);
        expect(assignSanctuaryHeal(G, 'aragorn')).toBe(false);
        expect(wounded.wounds).toBe(2);
    });

    it('après le regroupement, le nouveau FP au site 3 ouvre le sanctuaire', () => {
        const engine = createEngineClient({
            startPhase: 'regroup',
            playerID: '0',
            G: {
                path: pathWithSiteAt(2),
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        fellowshipArea: [
                            createCompanion({ id: 'comp-0', wounds: 0 }),
                        ],
                        hand: Array.from({ length: 8 }, (_, i) =>
                            createCompanion({ id: `h0-${i}` })
                        ),
                        deck: Array.from({ length: 8 }, (_, i) =>
                            createCompanion({ id: `d0-${i}` })
                        ),
                    }),
                    '1': createPlayerState('1', {
                        currentSiteIndex: 2,
                        fellowshipArea: [
                            createCompanion({
                                id: 'aragorn',
                                instanceId: 'aragorn',
                                wounds: 2,
                            }),
                        ],
                        hand: Array.from({ length: 8 }, (_, i) =>
                            createCompanion({ id: `h1-${i}` })
                        ),
                        deck: Array.from({ length: 8 }, (_, i) =>
                            createCompanion({ id: `d1-${i}` })
                        ),
                    }),
                },
            },
        });

        engine.moves.passActionWindow?.();
        engine.updatePlayerID('1');
        engine.moves.passActionWindow?.();
        engine.updatePlayerID('1');
        engine.moves.confirmHandRefill();
        engine.updatePlayerID('0');
        engine.moves.endTurnChoice();
        engine.moves.confirmHandRefill();

        expect(engine.getG().fpPlayerId).toBe('1');
        expect(engine.getCtx().phase).toBe('startOfFellowship');
        expect(engine.getG().sanctuaryHeal?.remaining).toBe(5);

        engine.stop();
    });
});
