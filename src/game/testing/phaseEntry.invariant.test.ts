import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
    enterPhase,
    PLAY_PHASES,
    type PlayPhase,
} from '../logic/phaseEntry';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const GAME_SRC = join(__dirname, '..');

/** setPhase('shadow') etc. = entrée illégale (doit passer par enterPhase / exitStartOf). */
const DIRECT_PLAY_PHASE = new RegExp(
    String.raw`setPhase\??\.\(?['"](${PLAY_PHASES.join('|')})['"]\)`,
    'g'
);

function walkTsFiles(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) {
            if (name === 'testing' || name === 'node_modules') continue;
            walkTsFiles(full, out);
        } else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) {
            out.push(full);
        }
    }
    return out;
}

describe('enterPhase — mapping', () => {
    it.each(PLAY_PHASES)('enterPhase(%s) → startOf…', (phase: PlayPhase) => {
        const entry = enterPhase(phase);
        expect(entry).toBe(
            `startOf${phase.charAt(0).toUpperCase()}${phase.slice(1)}`
        );
    });
});

describe('invariant : pas de setPhase direct vers une phase jouable', () => {
    it('seul exitStartOf peut cibler une phase jouable (littéral)', () => {
        const violations: string[] = [];

        for (const file of walkTsFiles(GAME_SRC)) {
            const rel = relative(GAME_SRC, file).replace(/\\/g, '/');
            // Seule implémentation autorisée du setPhase(phase jouable)
            if (rel === 'logic/phaseEntry.ts') continue;

            const src = readFileSync(file, 'utf8');
            for (const match of src.matchAll(DIRECT_PLAY_PHASE)) {
                violations.push(`${rel}: setPhase('${match[1]}')`);
            }
        }

        expect(violations).toEqual([]);
    });
});

describe('transitions critiques passent par startOf (capacité jouable)', () => {
    it('fin de Communauté → startOfShadow si capacité début d’Ombre', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                path: [
                    createSite({ id: 'site-1' }),
                    createSite({ id: 'site-2', twilightCost: 1 }),
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
                        fellowshipArea: [createCompanion({ id: 'frodo' })],
                    }),
                    '1': createPlayerState('1', {
                        supportArea: [
                            createCompanion({
                                id: 'shadow-start',
                                kind: 'SHADOW',
                                type: 'CONDITION',
                                actionPhases: ['startOfShadow'],
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.endFellowshipPhase();

        expect(engine.getCtx().phase).toBe('startOfShadow');
        engine.stop();
    });

    it('fin d’Ombre sans séide → startOfRegroup si capacité début de Regroupement', () => {
        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                battlefield: [],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-regroup',
                                actionPhases: ['startOfRegroup'],
                            }),
                        ],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });

        engine.moves.endShadowPhase();

        expect(engine.getCtx().phase).toBe('startOfRegroup');
        engine.stop();
    });

    it('fin d’Ombre avec séide → startOfManeuver si capacité début de Manœuvre', () => {
        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                battlefield: [createMinion({ id: 'm1' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-maneuver',
                                actionPhases: ['startOfManeuver'],
                            }),
                        ],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });

        engine.moves.endShadowPhase();

        expect(engine.getCtx().phase).toBe('startOfManeuver');
        engine.stop();
    });
});
