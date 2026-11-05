import { useEffect, useRef, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { LotrGame } from '../index';
import { GameBoard } from '../../views/GameBoard';
import { enumerateBotMoves } from './enumerateBotMoves';
import { isBotToAct, pendingNamedActor } from './isBotToAct';
import type { GameState } from '../types';

const BOT_ID = '1';
const HUMAN_ID = '0';
const TICK_MS = 280;

type BotClient = ReturnType<typeof Client>;

/**
 * Partie solo sans multiplayer Local : un seul client, coups appliqués
 * tout de suite. Le BOT joue via MAKE_MOVE en tant que siège 1 sans
 * basculer l’UI (qui reste joueur 0).
 */
export function SoloBotMatch({ matchID }: { matchID: string }) {
    const clientRef = useRef<BotClient | null>(null);
    const busyRef = useRef(false);
    const lastWarnAt = useRef(0);
    const [, setRev] = useState(0);

    useEffect(() => {
        const client = Client({
            game: LotrGame,
            numPlayers: 2,
            playerID: HUMAN_ID,
            debug: false,
        });
        clientRef.current = client;

        const unsub = client.subscribe(() => setRev((n) => n + 1));
        client.start();

        const dispatchBotMove = (moveName: string, args: unknown[] = []) => {
            const before = client.getState()?._stateID;
            // Dispatch direct : évite updatePlayerID (pas de flash UI adversaire).
            (
                client as unknown as {
                    store: { dispatch: (a: unknown) => void };
                }
            ).store.dispatch({
                type: 'MAKE_MOVE',
                payload: {
                    type: moveName,
                    args,
                    playerID: BOT_ID,
                },
            });
            // Purge d’éventuelles infos d’erreur transitoires.
            (
                client as unknown as {
                    store: { dispatch: (a: unknown) => void };
                }
            ).store.dispatch({ type: 'STRIP_TRANSIENTS' });
            return client.getState()?._stateID !== before;
        };

        const tick = () => {
            if (busyRef.current) return;
            const state = client.getState();
            if (!state || state.ctx.gameover) return;

            const G = state.G as GameState;
            const { ctx } = state;

            if (!isBotToAct(G, ctx, BOT_ID)) {
                // Diagnostic si on stagne en Ombre (le joueur croit que le BOT doit jouer).
                if (
                    import.meta.env.DEV &&
                    ctx.phase === 'shadow' &&
                    Date.now() - lastWarnAt.current > 4000
                ) {
                    lastWarnAt.current = Date.now();
                    console.warn('[SoloBot] Ombre mais isBotToAct=false', {
                        fpPlayerId: G.fpPlayerId,
                        namedActor: pendingNamedActor(G),
                        statusMessage: G.statusMessage,
                        pendingSitePhase: G.pendingSitePhaseAbility,
                        actionWindow: G.actionWindow,
                        responseWindow: G.responseWindow,
                    });
                }
                return;
            }

            const specs = enumerateBotMoves(G, ctx, BOT_ID);
            const activeSkirmish = (G.skirmishes || []).find(
                (s) => s.id === G.activeSkirmishId
            );
            const spec =
                specs[0] ??
                (ctx.phase === 'shadow'
                    ? { move: 'endShadowPhase', args: [] as unknown[] }
                    : ctx.phase === 'fellowship'
                      ? {
                            move: 'endFellowshipPhase',
                            args: [] as unknown[],
                        }
                      : ctx.phase === 'skirmish' && activeSkirmish?.resolved
                        ? {
                              move: 'cleanupPendingDeaths',
                              args: [] as unknown[],
                          }
                        : null);
            if (!spec) {
                if (
                    import.meta.env.DEV &&
                    ctx.phase === 'skirmish' &&
                    Date.now() - lastWarnAt.current > 4000
                ) {
                    lastWarnAt.current = Date.now();
                    console.warn('[SoloBot] Escarmouche sans coup', {
                        fpPlayerId: G.fpPlayerId,
                        isBotToAct: true,
                        activeSkirmishId: G.activeSkirmishId,
                        resolved: activeSkirmish?.resolved,
                        actionWindow: G.actionWindow,
                        responseWindow: G.responseWindow,
                        pendingEvent: G.pendingEvent,
                        statusMessage: G.statusMessage,
                    });
                }
                return;
            }

            busyRef.current = true;
            try {
                const ok = dispatchBotMove(spec.move, spec.args ?? []);
                if (!ok && import.meta.env.DEV) {
                    const now = Date.now();
                    if (now - lastWarnAt.current > 2000) {
                        lastWarnAt.current = now;
                        console.warn('[SoloBot] Coup sans effet', spec.move, {
                            phase: ctx.phase,
                            statusMessage: G.statusMessage,
                            pendingSitePhase: G.pendingSitePhaseAbility,
                            pendingForced: G.pendingForcedChoice,
                            twilight: G.twilightPool,
                            handSize: G.players[BOT_ID]?.hand?.length,
                        });
                    }
                }
            } finally {
                busyRef.current = false;
            }
        };

        const intervalId = window.setInterval(tick, TICK_MS);
        window.setTimeout(tick, 120);

        return () => {
            window.clearInterval(intervalId);
            unsub();
            client.stop();
            clientRef.current = null;
        };
    }, [matchID]);

    const client = clientRef.current;
    const state = client?.getState();

    if (!client || !state) {
        return <div>Chargement de la partie contre le BOT…</div>;
    }

    return (
        <GameBoard
            {...state}
            moves={client.moves}
            events={client.events}
            playerID={HUMAN_ID}
            matchID={matchID}
            isMultiplayer={false}
            reset={client.reset}
            undo={client.undo}
            redo={client.redo}
            log={client.log}
            sendChatMessage={client.sendChatMessage}
            chatMessages={client.chatMessages}
        />
    );
}
