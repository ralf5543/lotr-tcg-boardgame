import type { Game } from 'boardgame.io';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { LotrGame } from '../index';
import type { GameState } from '../types';
import { createGameState } from './createGameState';

export type LotrPhaseName =
    | 'setup'
    | 'startOfFellowship'
    | 'fellowship'
    | 'startOfShadow'
    | 'shadow'
    | 'startOfManeuver'
    | 'maneuver'
    | 'startOfArchery'
    | 'archery'
    | 'startOfAssignment'
    | 'assignment'
    | 'startOfSkirmish'
    | 'skirmish'
    | 'startOfRegroup'
    | 'regroup';

type EngineClientOptions = {
    /** Morceaux de G à fusionner dans un état minimal. */
    G?: Partial<GameState>;
    /** Phase dans laquelle démarrer (au lieu du setup). */
    startPhase?: LotrPhaseName;
    /** Joueur qui envoie les moves (`'0'` par défaut). */
    playerID?: string;
};

/**
 * Deux clients boardgame.io headless branchés sur le même master Local.
 * `updatePlayerID` bascule le joueur qui envoie les moves.
 */
export function createEngineClient(options: EngineClientOptions = {}) {
    const startPhase = options.startPhase ?? 'setup';
    const playerID = options.playerID ?? '0';

    const phases = Object.fromEntries(
        Object.entries(LotrGame.phases ?? {}).map(([name, phase]) => [
            name,
            {
                ...phase,
                start: name === startPhase,
            },
        ])
    );

    const game = {
        ...LotrGame,
        seed: 0,
        setup: () => createGameState(options.G),
        phases,
    } as Game<GameState>;

    const spec = {
        game,
        numPlayers: 2,
        multiplayer: Local(),
        debug: false as const,
    };

    const clients = {
        '0': Client({ ...spec, playerID: '0' }),
        '1': Client({ ...spec, playerID: '1' }),
    };

    clients['0'].start();
    clients['1'].start();

    let currentPlayerID = playerID;

    const readState = () => {
        const state = clients['0'].getState();
        if (!state) {
            throw new Error(
                'État moteur indisponible (getState() a renvoyé null).'
            );
        }
        return state;
    };

    return {
        get client() {
            return clients[currentPlayerID];
        },
        get moves() {
            return clients[currentPlayerID].moves;
        },
        updatePlayerID: (id: string) => {
            currentPlayerID = id;
        },
        getState: readState,
        getG: (): GameState => readState().G as GameState,
        getCtx: () => readState().ctx,
        stop: () => {
            clients['0'].stop();
            clients['1'].stop();
        },
    };
}

export type EngineClient = ReturnType<typeof createEngineClient>;

/** Les deux joueurs passent la fenêtre d’action courante. */
export function passBothActionWindows(engine: EngineClient) {
    const first = engine.getG().actionWindow?.activePlayerId ?? '0';
    const second = first === '0' ? '1' : '0';

    engine.updatePlayerID(first);
    engine.moves.passActionWindow();
    engine.updatePlayerID(second);
    engine.moves.passActionWindow();
}
