import { Bot } from 'boardgame.io/ai';
import type { Game } from 'boardgame.io';
import type { GameState } from '../types';
import { enumerateBotMoves } from './enumerateBotMoves';
import { isBotToAct } from './isBotToAct';

/** Coup fantôme : rejeté par le master (move inconnu) → pas de boucle d’état. */
export const BOT_WAIT_MOVE = '___botWait';

type PlayState = { G: GameState; ctx: import('boardgame.io').Ctx };

function waitAction(playerID: string) {
    return {
        type: 'MAKE_MOVE' as const,
        payload: {
            type: BOT_WAIT_MOVE,
            args: [] as unknown[],
            playerID,
        },
    };
}

/**
 * BOT playtest : joue le premier coup enumeré quand c’est son tour logique.
 * Sinon envoie un move fantôme (rejeté) pour ne pas planter LocalMaster
 * quand les deux sièges sont en activePlayers.
 */
export class PlaytestBot extends Bot {
    constructor({
        enumerate,
        seed,
    }: {
        game?: Game;
        enumerate?: typeof enumerateBotMoves;
        seed?: string | number;
    } = {}) {
        super({
            enumerate: enumerate || enumerateBotMoves,
            seed,
        });
    }

    play({ G, ctx }: PlayState, playerID: string) {
        if (!isBotToAct(G, ctx, playerID)) {
            return Promise.resolve({ action: waitAction(playerID) });
        }

        const moves = this.enumerate(G, ctx, playerID);
        if (!moves.length) {
            return Promise.resolve({ action: waitAction(playerID) });
        }

        // Priorité = ordre d’enumerate (premier coup).
        return Promise.resolve({ action: moves[0] });
    }
}
