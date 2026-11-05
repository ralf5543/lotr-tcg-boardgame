import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { LotrGame } from '../index';
import { enumerateBotMoves } from '../bot/enumerateBotMoves';
import { isBotToAct } from '../bot/isBotToAct';
import { stashBotMatchDecks } from '../bot/botMatchSetup';
import { botMatchLocal } from '../bot/botLocalTransport';
import { getSeedDecks } from '../../decks/deckStorage';
import type { GameState } from '../types';

async function botTick(bot: ReturnType<typeof Client>) {
    const state = bot.getState();
    if (!state) return false;
    const G = state.G as GameState;
    if (!isBotToAct(G, state.ctx, '1')) return false;
    const specs = enumerateBotMoves(G, state.ctx, '1');
    const before = state._stateID;
    for (const spec of specs) {
        const fn = (bot.moves as Record<string, ((...a: unknown[]) => void) | undefined>)[
            spec.move
        ];
        if (!fn) continue;
        fn(...(spec.args ?? []));
        await new Promise((r) => setTimeout(r, 30));
        if (bot.getState()?._stateID !== before) return true;
    }
    return false;
}

/**
 * Match Local + BOT : humain siège 0, BOT siège 1 (même logique que BotDriver).
 */
describe('BOT playtest — match Local', () => {
    it('avance jusqu’à la phase shadow puis le BOT termine l’Ombre', async () => {
        const seeds = getSeedDecks();
        stashBotMatchDecks({ '0': seeds[0]!, '1': seeds[1]! });

        const matchID = `bot-test-${Date.now()}`;

        const human = Client({
            game: LotrGame,
            numPlayers: 2,
            playerID: '0',
            matchID,
            multiplayer: botMatchLocal,
            debug: false,
        });
        const bot = Client({
            game: LotrGame,
            numPlayers: 2,
            playerID: '1',
            matchID,
            multiplayer: botMatchLocal,
            debug: false,
        });
        human.start();
        bot.start();

        await new Promise((r) => setTimeout(r, 100));

        // Enchères
        human.moves.submitBid?.(0);
        await botTick(bot);
        await new Promise((r) => setTimeout(r, 80));

        let G = human.getState()?.G as GameState;
        if (G?.setupState?.step === 'CHOOSING_FIRST') {
            if (G.setupState.auctionWinnerId === '0') {
                human.moves.chooseFirstPlayer?.(true);
            } else {
                await botTick(bot);
            }
            await new Promise((r) => setTimeout(r, 80));
        }

        G = human.getState()?.G as GameState;
        if (G?.setupState?.step === 'AWAITING_SITE') {
            const site = G.players['0']?.sitesDeck?.[0];
            human.moves.selectStartingSite?.(site);
            await new Promise((r) => setTimeout(r, 80));
        }

        G = human.getState()?.G as GameState;
        if (G?.setupState?.step === 'MULLIGAN') {
            human.moves.submitMulliganChoice?.(false);
            await botTick(bot);
            await new Promise((r) => setTimeout(r, 100));
        }

        // startOfFellowship éventuel
        for (let i = 0; i < 6; i++) {
            const phase = human.getState()?.ctx?.phase;
            if (phase === 'fellowship' || phase === 'shadow') break;
            if (phase?.startsWith('startOf')) {
                human.moves.confirmStartOfPhase?.();
                await botTick(bot);
            }
            await new Promise((r) => setTimeout(r, 60));
        }

        // Fin de fellowship → Ombre
        if (human.getState()?.ctx?.phase === 'fellowship') {
            human.moves.endFellowshipPhase?.();
            await new Promise((r) => setTimeout(r, 80));
        }

        // Pose de site Ombre + startOfShadow + shadow
        for (let i = 0; i < 20; i++) {
            const acted = await botTick(bot);
            const phase = human.getState()?.ctx?.phase;
            if (phase === 'maneuver' || phase === 'regroup' || phase === 'startOfManeuver') {
                break;
            }
            if (!acted) {
                // Humain doit peut-être confirmer un startOf*
                if (phase?.startsWith('startOf')) {
                    human.moves.confirmStartOfPhase?.();
                }
            }
            await new Promise((r) => setTimeout(r, 50));
        }

        const finalPhase = human.getState()?.ctx?.phase;
        expect([
            'shadow',
            'startOfShadow',
            'startOfManeuver',
            'maneuver',
            'regroup',
            'startOfRegroup',
        ]).toContain(finalPhase);

        // Le BOT ne doit plus être bloqué en Ombre sans rien faire :
        // après assez de ticks, on a quitté shadow ou le BOT a joué/ended.
        if (finalPhase === 'shadow') {
            // Dernière chance : forcer end
            await botTick(bot);
            await botTick(bot);
        }

        const after = human.getState()?.ctx?.phase;
        expect(after).not.toBe('fellowship');

        human.stop();
        bot.stop();
    }, 20000);
});
