import type { Game } from 'boardgame.io';
import type { GameState } from './types';
import { FREE_PEOPLES_DATABASE, SHADOW_DATABASE } from './cardsData';
import type { CardType } from './types';
import type { PlayerState } from './types';

// Fonction pour mélanger un tableau (Algorithme de Fisher-Yates)
const shuffle = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const createRealLotrDeck = (): CardType[] => {
    const fullPool: CardType[] = [];

    // On prend par exemple 15 cartes de chaque côté pour faire un deck de 30 cartes
    for (let i = 0; i < 15; i++) {
        const fpCard = FREE_PEOPLES_DATABASE[i % FREE_PEOPLES_DATABASE.length];
        const shCard = SHADOW_DATABASE[i % SHADOW_DATABASE.length];

        fullPool.push({ ...fpCard, id: `${fpCard.id}-${i}` });
        fullPool.push({ ...shCard, id: `${shCard.id}-${i}` });
    }

    // ON MÉLANGE ! (Le Peuple Libre et l'Ombre sont désormais complètement imbriqués)
    return shuffle(fullPool);
};

const createInitialPlayer = (): PlayerState => ({
    deck: createRealLotrDeck(), // Génère le deck mixte de 30 cartes (15 FP / 15 Shadow) mélangé
    hand: [],
    discard: [],
    freePeoplesArea: [],
    supportArea: [],
});

export const LotrGame: Game<GameState> = {
    // 1. On définit l'état initial du jeu au tout début de la partie
    setup: (): GameState => ({
        twilightPool: 0,
        currentSite: 1,
        battlefield: [], // La zone centrale commence vide
        players: {
            '0': createInitialPlayer(),
            '1': createInitialPlayer(),
        },
    }),

    // 2. On déclare nos phases. Pour l'instant, mettons les deux premières !
    phases: {
        fellowship: {
            start: true,

            // On déclare les actions possibles uniquement pendant la phase de Communauté
            moves: {
                // Une action toute simple pour ajouter des jetons au bassin
                addTwilight: ({ G, ctx }, amount: number) => {
                    G.twilightPool += amount;
                },

                // Une action pour faire avancer le site actuel
                nextSite: ({ G }) => {
                    if (G.currentSite < 9) {
                        G.currentSite += 1;
                    }
                }, // Notre nouveau move pour piocher !
                drawCard: ({ G, ctx }) => {
                    const playerId = ctx.currentPlayer; // "0" ou "1" selon le joueur actif
                    const player = G.players[playerId];

                    // Sécurité au cas où
                    if (!player.hand) player.hand = [];

                    if (player.deck && player.deck.length > 0) {
                        // On retire la première carte du deck
                        const card = player.deck.shift();
                        if (card) {
                            // On l'ajoute à la main du joueur
                            player.hand.push(card);
                        }
                    }
                },
                playCard: ({ G, ctx }, cardIndex: number) => {
                    const playerId = ctx.currentPlayer;
                    const player = G.players[playerId];
                    if (!player) return;

                    const card = player.hand?.[cardIndex];
                    if (!card) return;

                    // --- NOUVELLE VÉRIFICATION : COÛT EN CRÉPUSCULE ---
                    // Si c'est une carte Ombre, on refuse le coup si la réserve est insuffisante
                    if (
                        card.kind === 'SHADOW' &&
                        G.twilightPool < card.twilightCost
                    ) {
                        console.log(
                            `Pas assez de Crépuscule ! Requis: ${card.twilightCost}, Disponible: ${G.twilightPool}`
                        );
                        return;
                    }

                    // On s'assure à 100% que les zones existent avant de faire un push
                    if (!player.freePeoplesArea) player.freePeoplesArea = [];
                    if (!player.supportArea) player.supportArea = [];
                    if (!G.battlefield) G.battlefield = [];

                    // 1. On retire la carte de la main
                    player.hand.splice(cardIndex, 1);

                    // 2. On l'aiguille selon sa nature
                    if (card.kind === 'FREE_PEOPLES') {
                        // Les gentils vont dans la bonne zone selon leur type
                        if (card.subType === 'COMPANION') {
                            player.freePeoplesArea.push(card);
                        } else {
                            player.supportArea.push(card);
                        }

                        // Jouer un gentil génère de la menace (ajoute du Crépuscule)
                        G.twilightPool += card.twilightCost;
                    } else {
                        // Les méchants (Sbires) sont balancés au centre sur le Battlefield !
                        G.battlefield.push(card);

                        // Et ils dépensent la réserve accumulée
                        G.twilightPool = Math.max(
                            0,
                            G.twilightPool - card.twilightCost
                        );
                    }
                },
            },
        },
        shadow: {
            // Les sbires auront leurs propres actions ici plus tard !
        },
    },
};
