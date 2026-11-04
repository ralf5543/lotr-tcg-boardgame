import { loadDeckForPlayer } from './deckStorage';

const SERVER =
    typeof window !== 'undefined'
        ? `http://${window.location.hostname}:8000`
        : 'http://localhost:8000';

/**
 * Crée une partie SocketIO avec les decks sélectionnés (setupData),
 * puis renvoie l’id de match à mettre dans l’URL.
 */
export async function createMatchWithSelectedDecks(): Promise<string> {
    const decks = {
        '0': await loadDeckForPlayer('0'),
        '1': await loadDeckForPlayer('1'),
    };

    const res = await fetch(`${SERVER}/games/lotr/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            numPlayers: 2,
            setupData: { decks },
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(
            `Création de partie impossible : ${res.status} ${text}`
        );
    }

    const body = (await res.json()) as { matchID?: string };
    if (!body.matchID) {
        throw new Error('Réponse serveur sans matchID.');
    }
    return body.matchID;
}
