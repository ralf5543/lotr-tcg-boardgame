import { useEffect, useRef } from 'react';
import { Client } from 'boardgame.io/client';
import { LotrGame } from '../index';
import { enumerateBotMoves } from './enumerateBotMoves';
import { isBotToAct } from './isBotToAct';
import { botMatchLocal } from './botLocalTransport';
import type { GameState } from '../types';

const BOT_ID = '1';
const TICK_MS = 300;

type BotClient = ReturnType<typeof Client>;

function callMove(
    client: BotClient,
    moveName: string,
    args: unknown[] = []
): boolean {
    const moves = client.moves as Record<
        string,
        ((...a: unknown[]) => void) | undefined
    >;
    const moveFn = moves?.[moveName];
    if (typeof moveFn !== 'function') {
        if (import.meta.env.DEV) {
            console.warn(
                `[BotDriver] Coup « ${moveName} » indisponible. Coups :`,
                Object.keys(moves || {})
            );
        }
        return false;
    }
    const before = client.getState()?._stateID;
    moveFn(...args);
    const after = client.getState()?._stateID;
    return after !== before;
}

/**
 * Pilote le siège 1 en match solo Local (même transport que LotrBotClient).
 * Réessaie tant que c’est au BOT d’agir.
 */
export function BotDriver({ matchID }: { matchID: string }) {
    const clientRef = useRef<BotClient | null>(null);
    const busyRef = useRef(false);

    useEffect(() => {
        const client = Client({
            game: LotrGame,
            numPlayers: 2,
            playerID: BOT_ID,
            matchID,
            multiplayer: botMatchLocal,
            debug: false,
        });
        client.start();
        clientRef.current = client;

        const tryAct = () => {
            if (busyRef.current) return;
            const state = client.getState();
            if (!state || state.ctx.gameover) return;

            const G = state.G as GameState;
            const { ctx } = state;
            if (!isBotToAct(G, ctx, BOT_ID)) return;

            const specs = enumerateBotMoves(G, ctx, BOT_ID);
            if (!specs.length) {
                // Filet : en Ombre, toujours tenter de clore la phase.
                if (ctx.phase === 'shadow') {
                    busyRef.current = true;
                    callMove(client, 'endShadowPhase');
                    window.setTimeout(() => {
                        busyRef.current = false;
                    }, 60);
                }
                return;
            }

            busyRef.current = true;
            try {
                for (const spec of specs) {
                    if (callMove(client, spec.move, spec.args ?? [])) {
                        break;
                    }
                }
            } finally {
                window.setTimeout(() => {
                    busyRef.current = false;
                }, 60);
            }
        };

        const intervalId = window.setInterval(tryAct, TICK_MS);
        const unsubscribe = client.subscribe(() => {
            window.setTimeout(tryAct, 40);
        });
        window.setTimeout(tryAct, 150);

        return () => {
            window.clearInterval(intervalId);
            if (typeof unsubscribe === 'function') unsubscribe();
            client.stop();
            clientRef.current = null;
        };
    }, [matchID]);

    return null;
}
