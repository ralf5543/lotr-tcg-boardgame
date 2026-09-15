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

function pathWithSanctuaryAt(index: number): (SiteCardState | null)[] {
    const path: (SiteCardState | null)[] = Array.from(
        { length: 9 },
        () => null
    );
    path[index] = createSite({
        id: `sanctuary-${index}`,
        name: 'Sanctuary Site',
        keywords: ['SANCTUARY'],
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

describe('sanctuaire (mot-clé SANCTUARY)', () => {
    it('ouvre le choix de 5 soins au début de la compagnie sur un site Sanctuaire', () => {
        const engine = createEngineClient({
            startPhase: 'startOfFellowship',
            playerID: '0',
            G: {
                path: pathWithSanctuaryAt(2),
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
        expect(
            opened.players['0']?.fellowshipArea.find((c) => c.id === 'aragorn')
                ?.wounds
        ).toBe(2);

        engine.moves.assignSanctuaryHeal('aragorn');
        engine.moves.assignSanctuaryHeal('aragorn');
        engine.moves.assignSanctuaryHeal('gimli');

        const G = engine.getG();
        const fellows = G.players['0']?.fellowshipArea || [];
        expect(fellows.find((c) => c.id === 'aragorn')?.wounds).toBe(0);
        expect(fellows.find((c) => c.id === 'gimli')?.wounds).toBe(0);
        expect(fellows.find((c) => c.id === 'frodo')?.wounds).toBe(0);
        expect(G.sanctuaryHeal).toBeUndefined();
        expect(engine.getCtx().phase).toBe('fellowship');

        engine.stop();
    });

    it('permet de valider sans soigner', () => {
        const engine = createEngineClient({
            startPhase: 'startOfFellowship',
            playerID: '0',
            G: {
                path: pathWithSanctuaryAt(2),
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

    it('ne soigne pas sans mot-clé Sanctuary (même index 3)', () => {
        const wounded = createCompanion({
            id: 'aragorn',
            wounds: 2,
        });
        const path: (SiteCardState | null)[] = Array.from(
            { length: 9 },
            () => null
        );
        path[2] = createSite({
            id: 'plains',
            name: 'Open Plains',
            keywords: ['PLAINS'],
            siteNumber: 3,
        });
        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 2,
                    fellowshipArea: [wounded],
                }),
            },
        });
        expect(beginSanctuaryHeals(G)).toBe(false);
        expect(getSanctuaryHealCandidates(G)).toHaveLength(1);
        expect(assignSanctuaryHeal(G, 'aragorn')).toBe(false);
        expect(wounded.wounds).toBe(2);
    });

    it('ne soigne pas hors sanctuaire', () => {
        const wounded = createCompanion({
            id: 'aragorn',
            wounds: 2,
        });
        const G = createGameState({
            path: pathWithSanctuaryAt(2),
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
});
