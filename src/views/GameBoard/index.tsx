// src/views/GameBoard/index.tsx
import React, { useEffect } from 'react';
import type {
    CardState,
    CardType,
    SiteCardState,
    GameState,
} from '../../game/types';
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
import { GameControls } from './components/GameControls';
import {
    canDropInSupportArea,
    canDropInFellowship,
    canAttachToCharacter,
} from '../../utils/routingDragNDrop';
import { PhaseBanner } from './components/PhaseBanner';
import { DevPanel } from '../../utils/DevPanel';

interface GameBoardProps {
    playerID: string | null;
    G: {
        twilightPool: number;
        currentSite: number;
        statusMessage?: string;
        awaitingSiteSelection?: boolean;
        path: (SiteCardState | null)[];
        battlefield: CardState[];
        // 🟢 Ajout du tableau des escarmouches dans le type de G
        skirmishes?: Array<{ companionId?: string; minionIds?: string[] }>;
        players: Record<
            string,
            {
                sitesDeck: SiteCardState[];
                deck: CardState[];
                hand: CardState[];
                discard: CardState[];
                fellowshipArea: CardState[];
                supportArea: CardState[];
                currentSiteIndex: number;
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
    const myId = playerID || ctx.currentPlayer;
    const oppId = myId === '0' ? '1' : '0';

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
    const currentSiteIndex = G.players['0']?.currentSiteIndex ?? 0;

    // 🟢 centralisation du ROUTER DE DRAG & DROP
    useEffect(() => {
        const handleGlobalCardDrop = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { draggedCard, targetId } = customEvent.detail || {};

            if (!targetId || !draggedCard) return;

            const { index, origin, card, parentId } = draggedCard;
            const cardSubtype = card?.type as CardType | undefined;

            // ==========================================
            // 1. CARTES JOUÉES DEPUIS LA MAIN (origin === 'HAND')
            // ==========================================
            if (origin === 'HAND') {
                if (
                    targetId === 'fellowshipArea' &&
                    canDropInFellowship(cardSubtype)
                ) {
                    console.log('🃏 [GLOBAL DROP] Jouer Compagnon:', { index });
                    moves.playCard(index);
                    return;
                }

                if (
                    targetId === 'supportArea' &&
                    canDropInSupportArea(cardSubtype)
                ) {
                    console.log('🎒 [GLOBAL DROP] Jouer Support:', { index });
                    moves.playCard(index);
                    return;
                }

                if (targetId === 'battlefield' && card.kind === 'SHADOW') {
                    console.log(
                        '⚔️ [GLOBAL DROP] Jouer Séide sur Battlefield:',
                        { index }
                    );
                    moves.playShadowCard(index);
                    return;
                }

                // Attachement depuis la main sur un personnage
                if (
                    targetId !== 'fellowshipArea' &&
                    targetId !== 'supportArea' &&
                    targetId !== 'battlefield' &&
                    canAttachToCharacter(cardSubtype)
                ) {
                    console.log(
                        '📎 [GLOBAL DROP] Attachement depuis la main:',
                        {
                            cardIndex: index,
                            targetCardId: targetId,
                        }
                    );
                    moves.attachCard(index, targetId);
                    return;
                }
            }

            // ==========================================
            // 2. TRANSFERT D'ATTACHEMENT (origin === 'ATTACHMENT')
            // ==========================================
            if (origin === 'ATTACHMENT') {
                // Empêche de transférer sur le même personnage
                if (targetId === parentId) {
                    console.log(
                        'ℹ️ Attachement déposé sur le même hôte. Annulation.'
                    );
                    return;
                }

                // Si la cible est un personnage valide pour recevoir l'attachement
                if (
                    targetId !== 'fellowshipArea' &&
                    targetId !== 'supportArea' &&
                    targetId !== 'battlefield' &&
                    canAttachToCharacter(cardSubtype)
                ) {
                    console.log("🔄 [GLOBAL DROP] Transfert d'attachement:", {
                        attachmentId: card.id,
                        fromCharacterId: parentId,
                        toCharacterId: targetId,
                    });

                    // 🟢 Appelle ton action de jeu (ex: moves.transferAttachment)
                    if (moves.transferAttachment) {
                        moves.transferAttachment({
                            attachmentId: card.id,
                            fromCharacterId: parentId,
                            toCharacterId: targetId,
                        });
                    } else {
                        console.warn(
                            "⚠️ La fonction moves.transferAttachment n'est pas encore définie dans vos moves."
                        );
                    }
                }
            }
            // ==========================================
            // 3. ASSIGNATION DE SÉIDE (origin === 'BATTLEFIELD')
            // ==========================================
            if (origin === 'BATTLEFIELD') {
                const isAssignmentPhase = ctx.phase === 'assignment';
                const isMinion = card?.type === 'MINION';

                // Si on est en phase d'assignment, qu'on lâche un Séide et que la cible n'est pas une zone générique
                if (
                    isAssignmentPhase &&
                    isMinion &&
                    targetId !== 'fellowshipArea' &&
                    targetId !== 'supportArea' &&
                    targetId !== 'battlefield' &&
                    targetId !== 'sitePath'
                ) {
                    console.log(
                        '⚔️ [GLOBAL DROP] Assignation Séide -> Compagnon:',
                        {
                            minionId: card.id,
                            companionId: targetId,
                        }
                    );

                    // 🚀 Appel du move boardgame.io
                    moves.assignMinion(card.id, targetId);
                    return;
                }
            }
        };

        window.addEventListener('card-dropped', handleGlobalCardDrop);
        return () =>
            window.removeEventListener('card-dropped', handleGlobalCardDrop);
    }, [moves, ctx.phase]);

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
                <PhaseBanner key={ctx.phase} phaseName={ctx.phase} />
                <DevPanel G={G} ctx={ctx} moves={moves} />
                <GameControls
                    G={G}
                    statusMessage={G.statusMessage}
                    ctx={ctx}
                    playerID={playerID}
                    isMyTurn={ctx.currentPlayer === playerID}
                    awaitingSite={G.awaitingSiteSelection ?? false}
                    moves={moves}
                />

                {/* ==================== 1. ADVERSAIRE ==================== */}
                <PlayerArea
                    playerId={oppId}
                    deckCount={opponent.deck?.length || 0}
                    fellowshipArea={opponent.fellowshipArea || []}
                    supportArea={opponent.supportArea || []}
                    isOpponent={true}
                    moves={moves}
                    skirmishes={G.skirmishes}
                    battlefield={G.battlefield}
                    isSkirmishPhase={ctx.phase === 'skirmish'}
                    activeSkirmishId={(G as GameState).activeSkirmishId}
                />

                {/* ==================== 2. CENTRAL ==================== */}
                <S.CentralBlock>
                    <S.MainZone>
                        <TwilightPool value={G.twilightPool} />
                        <Battlefield
                            cards={G.battlefield}
                            playerRole={playerID as '0' | '1'}
                            currentSiteIndex={currentSiteIndex}
                            isAssignmentPhase={ctx.phase === 'assignment'}
                            skirmishes={G.skirmishes}
                        />
                    </S.MainZone>
                </S.CentralBlock>

                {/* ==================== 3. MOI ==================== */}
                <PlayerArea
                    playerId={myId}
                    deckCount={me.deck?.length || 0}
                    fellowshipArea={me.fellowshipArea || []}
                    supportArea={me.supportArea || []}
                    isOpponent={false}
                    moves={moves}
                    skirmishes={G.skirmishes}
                    battlefield={G.battlefield}
                    isSkirmishPhase={ctx.phase === 'skirmish'}
                    activeSkirmishId={(G as GameState).activeSkirmishId}
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
