// src/views/GameBoard/index.tsx
import React from 'react';
import type { CardType } from '../../game/types';
import { Battlefield } from './components/Battlefield';
import { SitePath } from './components/SitePath';
import { PlayerArea } from './components/PlayerArea';
import { Hand } from './components/Hand'; // Nouveau composant !
import * as S from './styles';
import { useHoverCard } from '../../contexts/HoverCardContext';
import { Card } from './components/Card';
import { DragProvider } from '../../contexts/DragContext';

interface GameBoardProps {
    G: {
        twilightPool: number;
        currentSite: number;
        battlefield: CardType[];
        players: Record<
            string,
            {
                deck: CardType[];
                hand: CardType[];
                discard: CardType[];
                freePeoplesArea: CardType[];
                supportArea: CardType[];
            }
        >;
    };
    ctx: {
        currentPlayer: string;
    };
    moves: {
        addTwilight: (amount: number) => void;
        nextSite: () => void;
        drawCard: () => void;
        playCard: (index: number) => void;
    };
}

export const GameBoard: React.FC<GameBoardProps> = ({ G, ctx, moves }) => {
    // boardgame.io fournit généralement une prop 'playerID' au composant pour savoir
    // quel joueur regarde cet écran. Si elle n'existe pas encore, on prend currentPlayer.
    const myPlayerId = ctx.currentPlayer;

    const myId = ctx.currentPlayer;
    const oppId = myId === '0' ? '1' : '0';

    const me = G.players[myId] || {
        deck: [],
        hand: [],
        discard: [],
        freePeoplesArea: [],
        supportArea: [],
    };
    const opponent = G.players[oppId] || {
        deck: [],
        hand: [],
        discard: [],
        freePeoplesArea: [],
        supportArea: [],
    };
    const { hoveredCard } = useHoverCard();

    // Calcul temporaire pour le container de style
    const currentFaction = myPlayerId === '1' ? 'SHADOW' : 'FREE_PEOPLES';

    return (
        <DragProvider>
            <S.BoardContainer $faction={currentFaction}>
                {hoveredCard && (
                    <S.HoveredCardsZone>
                        <Card card={hoveredCard} size="lg" />
                    </S.HoveredCardsZone>
                )}

                <PlayerArea
                    playerId={oppId}
                    deckCount={opponent.deck?.length || 0}
                    freePeoplesArea={opponent.freePeoplesArea || []}
                    supportArea={opponent.supportArea || []}
                    isOpponent={true}
                    moves={moves}
                />

                <S.CentralBlock>
                    <Battlefield
                        twilightPoolValue={G.twilightPool}
                        cards={G.battlefield || []}
                    />
                    <SitePath currentSite={G.currentSite} />
                </S.CentralBlock>

                <PlayerArea
                    playerId={myId}
                    deckCount={me.deck?.length || 0}
                    freePeoplesArea={me.freePeoplesArea || []}
                    supportArea={me.supportArea || []}
                    moves={moves}
                />

                <Hand
                    hand={me.hand || []}
                    deckCount={me.deck?.length || 0}
                    onDrawCard={() => moves.drawCard()}
                    onNextSite={() => moves.nextSite()}
                    onPlayCard={(idx) => moves.playCard(idx)}
                />
            </S.BoardContainer>
        </DragProvider>
    );
};
