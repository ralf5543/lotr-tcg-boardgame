// src/views/GameBoard/index.tsx
import React from 'react';
import type { CardType, SiteCardState } from '../../game/types';
import { Battlefield } from './components/Battlefield';
import { SitePath } from './components/SitePath';
import { PlayerArea } from './components/PlayerArea';
import { Hand } from './components/Hand';
import * as S from './styles';
import { useHoverCard } from '../../contexts/HoverCardContext';
import { Card } from './components/Card';
import { SiteCard } from './components/SiteCard';
import { DragProvider } from '../../contexts/DragContext';
import { TwilightPool } from './components/TwilightPool';
import { Dock } from './components/Dock';
import { SitesPicker } from './components/SitePicker';
import { GameNotifications } from './components/GameNotifications';

interface GameBoardProps {
    playerID: string | null; // 🧙‍♂️ Injecté par boardgame.io ("0" ou "1")
    G: {
        twilightPool: number;
        currentSite: number;
        battlefield: CardType[];
        players: Record<
            string,
            {
                sitesDeck: SiteCardState[];
                deck: CardType[];
                hand: CardType[];
                discard: CardType[];
                fellowshipArea: CardType[];
                supportArea: CardType[];
            }
        >;
    };
    ctx: {
        currentPlayer: string;
    };
    moves: any;
}

export const GameBoard: React.FC<GameBoardProps> = ({
    playerID,
    G,
    ctx,
    moves,
}) => {
    // ID du joueur connecté à cet écran (ex: "0" dans l'onglet FP, "1" dans l'onglet Ombre)
    const myId = playerID || ctx.currentPlayer;
    const oppId = myId === '0' ? '1' : '0';

    // 1. On vérifie si c'est actuellement au tour du joueur local d'agir
    const isMyTurn = ctx.activePlayers?.[playerID] === 'play';

    const me = G.players[myId] || {
        deck: [],
        hand: [],
        discard: [],
        fellowshipArea: [],
        supportArea: [],
    };
    const opponent = G.players[oppId] || {
        deck: [],
        hand: [],
        discard: [],
        fellowshipArea: [],
        supportArea: [],
    };

    const { hoveredData } = useHoverCard();
    const currentFaction = myId === '1' ? 'SHADOW' : 'FREE_PEOPLES';

    // 1. Récupération du joueur dont c'est le tour
    const activePlayerId = ctx.currentPlayer;
    const currentPlayer = G.players[activePlayerId];

    // 2. Sécurisation des tableaux (au cas où ils ne soient pas encore initialisés)
    const handCards = currentPlayer?.handCards || [];
    const sitesDeck = currentPlayer?.sitesDeck || [];
    const discardPile = currentPlayer?.discardPile || [];

    return (
        <DragProvider>
            <S.BoardContainer $faction={currentFaction}>
                {hoveredData && (
                    <S.HoveredCardsZone $orientation={hoveredData.orientation}>
                        {hoveredData.orientation === 'landscape' ? (
                            <SiteCard site={hoveredData.card} size="lg" />
                        ) : (
                            <Card card={hoveredData.card} size="lg" />
                        )}
                    </S.HoveredCardsZone>
                )}
                <GameNotifications
                    statusMessage={G.statusMessage ?? "En attente d'action..."}
                    activePlayerId={ctx.currentPlayer}
                    isMyTurn={isMyTurn}
                    awaitingSite={G.awaitingSiteSelection ?? false}
                />

                {/* ==================== 1. CÔTÉ ADVERSAIRE (HAUT) ==================== */}
                <PlayerArea
                    playerId={oppId}
                    deckCount={opponent.deck?.length || 0}
                    fellowshipArea={opponent.fellowshipArea || []}
                    supportArea={opponent.supportArea || []}
                    isOpponent={true}
                    moves={moves}
                />

                {/* ==================== 2. BLOC CENTRAL MUTUALISÉ ==================== */}
                <S.CentralBlock>
                    {/* Bandeau d'état de Phase */}
                    <S.PhaseBanner>
                        <span>
                            Phase : <strong>{ctx.phase?.toUpperCase()}</strong>
                        </span>
                        <span>
                            Joueur actif :{' '}
                            <strong>
                                {ctx.currentPlayer === '0'
                                    ? 'Peuples Libres'
                                    : 'Ombre'}
                            </strong>
                        </span>

                        {/* 1. Bouton pour le joueur FP (0) en Phase Fellowship */}
                        {ctx.phase === 'fellowship' && playerID === '0' && (
                            <button onClick={() => moves.endFellowshipPhase()}>
                                Fin de Communauté ➔
                            </button>
                        )}

                        {/* 2. Bouton pour le joueur Ombre (1) en Phase Shadow */}
                        {ctx.phase === 'shadow' && playerID === '1' && (
                            <button onClick={() => moves.endShadowPhase()}>
                                Fin de l'Ombre ➔
                            </button>
                        )}

                        {/* 3. Boutons pour le joueur FP (0) en Phase Regroup */}
                        {ctx.phase === 'regroup' && playerID === '0' && (
                            <>
                                <button onClick={() => moves.moveNextSite()}>
                                    Avancer au site suivant 🏕️
                                </button>
                                <button onClick={() => moves.endTurn()}>
                                    Terminer le tour 🏁
                                </button>
                            </>
                        )}
                    </S.PhaseBanner>

                    <S.MainZone>
                        <TwilightPool value={G.twilightPool} />
                        <Battlefield cards={G.battlefield || []} />
                    </S.MainZone>
                </S.CentralBlock>

                {/* ==================== 3. TON CÔTÉ (BAS) ==================== */}
                <PlayerArea
                    playerId={myId}
                    deckCount={me.deck?.length || 0}
                    fellowshipArea={me.fellowshipArea || []}
                    supportArea={me.supportArea || []}
                    isOpponent={false}
                    moves={moves}
                />

                {/* ==================== SITE PATH ==================== */}
                <SitePath
                    path={G.path}
                    players={G.players}
                    onPlaySite={(siteId, targetIndex) => {
                        // Appelle ton move game engine ici !
                        moves.playSite(siteId, targetIndex);
                        // ou client.moves.playSite(siteId, targetIndex) selon ta config
                    }}
                />
                {console.log('me : ', me)}
                <Dock
                    handCount={me.hand?.length || 0}
                    sitesCount={me.sitesDeck?.length || 0}
                    discardCount={me.discard?.length || 0}
                    handView={
                        <Hand
                            hand={me.hand || []}
                            deckCount={me.deck?.length || 0}
                            onDrawCard={() => moves.drawCard()}
                            onPlayCard={(idx) => moves.playCard(idx)}
                        />
                    }
                    sitesView={<SitesPicker sites={me.sitesDeck || []} />}
                />
            </S.BoardContainer>
        </DragProvider>
    );
};
