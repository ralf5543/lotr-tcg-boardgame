// src/views/GameBoard/index.tsx
import React from 'react';
import type { CardState, SiteCardState } from '../../game/types';
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
        statusMessage?: string;
        awaitingSiteSelection?: boolean;
        path: (SiteCardState | null)[];
        battlefield: CardState[];
        players: Record<
            string,
            {
                sitesDeck: SiteCardState[];
                deck: CardState[];
                hand: CardState[];
                discard: CardState[];
                fellowshipArea: CardState[];
                supportArea: CardState[];
                currentSiteIndex: number; // 🟢 1. Ajout dans le type G
            }
        >;
    };
    ctx: {
        currentPlayer: string;
        activePlayers?: Record<string, string>;
        phase?: string;
    };
    moves: any;
}

export const GameBoard: React.FC<GameBoardProps> = ({
    playerID,
    G,
    ctx,
    moves,
}) => {
    // ID du joueur connecté à cet écran ("0" ou "1")
    const myId = playerID || ctx.currentPlayer;
    const oppId = myId === '0' ? '1' : '0';

    // Vérification de la main active
    const isMyTurn = ctx.activePlayers?.[playerID || ''] === 'play';

    const me = G.players[myId] || {
        deck: [],
        hand: [],
        discard: [],
        fellowshipArea: [],
        supportArea: [],
        sitesDeck: [],
        currentSiteIndex: 0,
    };
    const opponent = G.players[oppId] || {
        deck: [],
        hand: [],
        discard: [],
        fellowshipArea: [],
        supportArea: [],
        sitesDeck: [],
        currentSiteIndex: 0,
    };

    const { hoveredData } = useHoverCard();
    const currentFaction = myId === '1' ? 'SHADOW' : 'FREE_PEOPLES';

    // 🟢 Extracteur de l'index de site FP (toujours sur le Joueur 0)
    const currentSiteIndex = G.players['0']?.currentSiteIndex ?? 0;

    return (
        <DragProvider>
            <S.BoardContainer $faction={currentFaction}>
                {hoveredData && (
                    <S.HoveredCardsZone $orientation={hoveredData.orientation}>
                        {hoveredData.orientation === 'landscape' ? (
                            <SiteCard site={hoveredData.card} size="lg" />
                        ) : (
                            <Card 
                                card={hoveredData.card} 
                                size="lg" 
                                currentSiteIndex={currentSiteIndex} 
                            />
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
                        <Battlefield
                            cards={G.battlefield}
                            playerRole={playerID as '0' | '1'}
                            currentSiteIndex={currentSiteIndex} // 🟢 2. Transmis au Battlefield
                            onPlayShadowCard={(cardIndex) => {
                                moves.playShadowCard(cardIndex);
                            }}
                        />
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
                        moves.playSite(siteId, targetIndex);
                    }}
                />
                <Dock
                    handCount={me.hand?.length || 0}
                    sitesCount={me.sitesDeck?.length || 0}
                    discardCount={me.discard?.length || 0}
                    handView={
                        <Hand
                            playerRole={myId as '0' | '1'}
                            hand={me.hand || []}
                            deckCount={me.deck?.length || 0}
                            currentSiteIndex={currentSiteIndex}
                            onDrawCard={() => {
                                moves.drawCard();
                            }}
                            onPlayCard={(idx) => moves.playCard(idx)}
                        />
                    }
                    sitesView={<SitesPicker sites={me.sitesDeck || []} />}
                />
            </S.BoardContainer>
        </DragProvider>
    );
};