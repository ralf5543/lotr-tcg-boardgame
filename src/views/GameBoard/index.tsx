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

    const currentFaction = ctx.currentPlayer === '1' ? 'SHADOW' : 'FREE_PEOPLES';

    return (
        <DragProvider>
            <S.BoardContainer $faction={currentFaction}>
                {/* 2. L'inspecteur de carte global (fixé à l'écran, par exemple à droite ou centré) */}
                {hoveredCard && (
                    <S.HoveredCardsZone>
                        <Card card={hoveredCard} size="lg" />
                    </S.HoveredCardsZone>
                )}
                {/* ==================== 1. CÔTÉ ADVERSAIRE (HAUT) ==================== */}
                <PlayerArea
                    playerId={oppId}
                    deckCount={opponent.deck?.length || 0}
                    freePeoplesArea={opponent.freePeoplesArea || []}
                    supportArea={opponent.supportArea || []}
                    isOpponent={true}
                    moves={moves}
                />

                {/* ==================== 2. LE BLOC CENTRAL MUTUALISÉ ==================== */}
                <S.CentralBlock>
                    <Battlefield twilightPoolValue={G.twilightPool} cards={G.battlefield || []} />
                    <SitePath currentSite={G.currentSite} />
                </S.CentralBlock>

                {/* ==================== 3. CÔTÉ JOUEUR (BAS) ==================== */}
                <PlayerArea
                    playerId={myId}
                    deckCount={me.deck?.length || 0}
                    freePeoplesArea={me.freePeoplesArea || []}
                    supportArea={me.supportArea || []}
                    moves={moves}
                />

                {/* ==================== 4. LA MAIN FLOTTANTE (COMPOSANT UNIQUE) ==================== */}
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
