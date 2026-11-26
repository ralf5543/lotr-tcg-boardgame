import type { DeckConfig } from '../../decks/types';
import { validateDeck } from '../../decks/validateDeck';
import { setStatus } from '../../i18n/status';
import type { LotrMoveContext } from '../types';
import {
    assemblePlayer,
    type ProfileSeed,
} from '../logic/assemblePlayer';
import { playerDisplayName } from '../logic/playerName';

/**
 * Antichambre : pose profil + deck sur **son** siège.
 * Quand les deux sont prêts → enchère de fardeaux.
 */
export const readyWithLoadout = (
    { G, playerID, random }: LotrMoveContext,
    deckConfig: DeckConfig,
    profile?: ProfileSeed
) => {
    if (!G.setupState || G.setupState.step !== 'LOBBY') {
        return 'INVALID_MOVE';
    }

    const pId = String(playerID ?? '');
    if (!G.players[pId]) return 'INVALID_MOVE';

    if (G.setupState.loadouts?.[pId]?.ready) {
        return;
    }

    const validation = validateDeck(deckConfig);
    if (!validation.ok) {
        console.warn(
            '[readyWithLoadout] deck invalide',
            deckConfig?.name,
            validation.errors?.map((e) => e.code)
        );
        setStatus(G, 'LOBBY_WAITING');
        return 'INVALID_MOVE';
    }

    const seed: ProfileSeed = {
        name: profile?.name,
        avatar: profile?.avatar,
    };

    G.players[pId] = assemblePlayer(pId, deckConfig, seed, random);

    if (!G.setupState.loadouts) {
        G.setupState.loadouts = {
            '0': { ready: false },
            '1': { ready: false },
        };
    }
    G.setupState.loadouts[pId] = {
        ready: true,
        deckName: deckConfig.name,
    };

    const ready0 = G.setupState.loadouts['0']?.ready;
    const ready1 = G.setupState.loadouts['1']?.ready;

    if (ready0 && ready1) {
        G.setupState.step = 'BIDDING';
        setStatus(G, 'BIDDING_SETUP');
    } else {
        setStatus(G, 'LOBBY_WAITING', {
            name: playerDisplayName(G, pId),
        });
    }
};

export const lobbyMoves = {
    readyWithLoadout,
};
