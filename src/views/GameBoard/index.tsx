import React, { useEffect } from 'react';
import type { BoardProps } from 'boardgame.io/react';
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
import { DragProvider } from '../../contexts/DragProvider';
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
import { DevPanel, type DevMoves } from '../../utils/DevPanel';
import { useFaction } from '../../contexts/FactionContext';
import { useTargeting } from '../../contexts/TargetingContext';

export interface GameBoardProps extends BoardProps<GameState> {
    moves: BoardProps<GameState>['moves'] &
        DevMoves & {
            confirmEndPhase?: () => void;
            finishSkirmishResolution?: () => void;
            playCard: (index: number) => void;
            playShadowCard: (index: number) => void;
            attachCard: (index: number, targetId: string) => void;
            transferAttachment?: (data: {
                attachmentId: string;
                fromCharacterId: string;
                toCharacterId: string;
            }) => void;
            assignMinion: (minionId: string, targetId: string) => void;
            playSite: (siteId: string, targetIndex: number) => void;
            drawCard: () => void;
            selectStartingSite?: (siteCard: CardState) => void;
        };
}

export const GameBoard: React.FC<GameBoardProps> = ({
    playerID,
    G,
    ctx,
    moves,
}) => {
    const myId = playerID || ctx.currentPlayer;
    const oppId = myId === '0' ? '1' : '0';

    const fpPlayerId = G.fpPlayerId || '0';
    const isLocalFP = myId === fpPlayerId;
    const currentFaction = isLocalFP ? 'FREE_PEOPLE' : 'SHADOW';

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
    const currentSiteIndex = G.players['0']?.currentSiteIndex ?? 0;

    // 🟢 1. GESTION GLOBALE DE LA TEMPORISATION DE FIN DE PHASE
    useEffect(() => {
        if (G.pendingPhaseEnd) {
            const GLOBAL_PHASE_DELAY = 1500;

            const timer = setTimeout(() => {
                if (moves.confirmEndPhase) {
                    moves.confirmEndPhase();
                }
            }, GLOBAL_PHASE_DELAY);

            return () => clearTimeout(timer);
        }
    }, [G.pendingPhaseEnd, moves]);

    // 🟢 2. TEMPORISATION DE FIN DE COMBAT
    useEffect(() => {
        const hasWounded =
            G.lastWoundedCardIds && G.lastWoundedCardIds.length > 0;
        const hasPendingDead =
            G.pendingDeadCardIds && G.pendingDeadCardIds.length > 0;

        if ((hasWounded || hasPendingDead) && G.activeSkirmishId) {
            const timer = setTimeout(() => {
                if (moves.finishSkirmishResolution) {
                    moves.finishSkirmishResolution();
                }
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [G.lastWoundedCardIds, G.pendingDeadCardIds, G.activeSkirmishId, moves]);

    // 🟢 3. ROUTER DE DRAG & DROP GLOBAL
    useEffect(() => {
        const handleGlobalCardDrop = (e: Event) => {
            const customEvent = e as CustomEvent;

            const { draggedCard, targetId } = customEvent.detail || {};

            if (!targetId || !draggedCard) {
                console.warn(
                    '⚠️ DROP IGNORÉ : targetId ou draggedCard manquant',
                    { targetId, draggedCard }
                );
                return;
            }

            const { index, origin, card, parentId } = draggedCard;

            // Helper pour trouver la carte cible dans toutes les zones du jeu
            const findTargetCard = (
                id: string
            ): CardState | SiteCardState | null => {
                if (!G || !G.players) return null;

                // 1. Recherche dans les joueurs (Fellowship & Support)
                for (const pId of ['0', '1']) {
                    const player = G.players[pId];
                    if (!player) continue;

                    const foundInFellowship = player.fellowshipArea?.find(
                        (c) => c?.id === id
                    );
                    if (foundInFellowship) return foundInFellowship;

                    const foundInSupport = player.supportArea?.find(
                        (c) => c?.id === id
                    );
                    if (foundInSupport) return foundInSupport;
                }

                // 2. Recherche sur le Champ de Bataille
                const foundInBattlefield = G.battlefield?.find(
                    (c) => c?.id === id
                );
                if (foundInBattlefield) return foundInBattlefield;

                // 3. Recherche dans le Path (Sites)
                const foundInPath = G.path?.find((s) => s?.id === id);
                if (foundInPath) return foundInPath;

                return null;
            };

            const cardType = card?.type;
            const cardSubtype = card?.subtype;

            if (origin === 'HAND') {
                if (
                    targetId === 'fellowshipArea' &&
                    canDropInFellowship(cardType)
                ) {
                    if (typeof moves.playCard === 'function') {
                        moves.playCard(index);
                    }
                    return;
                }

                if (
                    targetId === 'supportArea' &&
                    canDropInSupportArea(cardType, cardSubtype)
                ) {
                    if (typeof moves.playCard === 'function') {
                        moves.playCard(index);
                    }
                    return;
                }

                if (targetId === 'battlefield' && card?.kind === 'SHADOW') {
                    if (typeof moves.playShadowCard === 'function') {
                        moves.playShadowCard(index);
                    }
                    return;
                }

                if (
                    targetId !== 'fellowshipArea' &&
                    targetId !== 'supportArea' &&
                    targetId !== 'battlefield'
                ) {
                    const targetCard = findTargetCard(targetId);
                    if (canAttachToCharacter(card, targetCard)) {
                        if (typeof moves.attachCard === 'function') {
                            moves.attachCard(index, targetId);
                        }
                        return;
                    }
                }
            }

            if (origin === 'ATTACHMENT') {
                if (targetId === parentId) return;

                if (
                    targetId !== 'fellowshipArea' &&
                    targetId !== 'supportArea' &&
                    targetId !== 'battlefield'
                ) {
                    const targetCard = findTargetCard(targetId);
                    if (canAttachToCharacter(card, targetCard)) {
                        if (moves.transferAttachment) {
                            moves.transferAttachment({
                                attachmentId: card.id,
                                fromCharacterId: parentId,
                                toCharacterId: targetId,
                            });
                        }
                    }
                }
            }

            if (origin === 'BATTLEFIELD') {
                const isAssignmentPhase = ctx.phase === 'assignment';
                const isMinion = card?.type === 'MINION';

                if (
                    isAssignmentPhase &&
                    isMinion &&
                    targetId !== 'fellowshipArea' &&
                    targetId !== 'supportArea' &&
                    targetId !== 'battlefield' &&
                    targetId !== 'sitePath'
                ) {
                    if (moves.assignMinion) {
                        moves.assignMinion(card.id, targetId);
                    }
                    return;
                }
            }
        };

        window.addEventListener('card-dropped', handleGlobalCardDrop);
        return () =>
            window.removeEventListener('card-dropped', handleGlobalCardDrop);
    }, [moves, ctx.phase, G]);

    const { setFpPlayerId } = useFaction();
    useEffect(() => {
        if (setFpPlayerId && G.fpPlayerId !== undefined) {
            setFpPlayerId(G.fpPlayerId);
        }
    }, [G.fpPlayerId, setFpPlayerId]);

    const { startTargeting, stopTargeting } = useTargeting();

    // 🟢 4. SYNCHRONISATION DU CIBLAGE D'ARCHERIE
    useEffect(() => {
        if (ctx.phase !== 'archery' || !G.archeryState) {
            stopTargeting();
            return;
        }

        const { step } = G.archeryState;

        if (step === 'FP_ASSIGN') {
            // Cibles valides : Compagnons dans la Fellowship Area du joueur FP
            const fpPlayer = G.players[G.fpPlayerId || '0'];
            const validTargets = (fpPlayer?.fellowshipArea || [])
                .filter((c) => c && c.id)
                .map((c) => c.id);

            startTargeting({
                targetableCardIds: validTargets,
                message:
                    "Tir d'archerie : Cliquez sur un compagnon pour lui assigner une blessure.",
                onSelectTarget: (cardId) => {
                    if (moves.assignArcheryWound) {
                        moves.assignArcheryWound(cardId);
                    }
                },
            });
        } else if (step === 'SHADOW_ASSIGN') {
            // Cibles valides : Séides (MINION) sur le battlefield
            const validTargets = (G.battlefield || [])
                .filter((c) => c && c.kind === 'SHADOW' && c.type === 'MINION')
                .map((c) => c.id);

            startTargeting({
                targetableCardIds: validTargets,
                message:
                    "Tir d'archerie : Cliquez sur un séide pour lui assigner une blessure.",
                onSelectTarget: (cardId) => {
                    if (moves.assignArcheryWound) {
                        moves.assignArcheryWound(cardId);
                    }
                },
            });
        } else {
            stopTargeting();
        }
    }, [
        ctx.phase,
        G.archeryState,
        G.fpPlayerId,
        G.players,
        G.battlefield,
        moves,
        startTargeting,
        stopTargeting,
    ]);

    return (
        <DragProvider>
            <S.BoardContainer $faction={currentFaction}>
                {hoveredData && (
                    <S.HoveredCardsZone $orientation={hoveredData.orientation}>
                        {hoveredData.orientation === 'landscape' ? (
                            <SiteCard
                                site={hoveredData.card as SiteCardState}
                                size="lg"
                            />
                        ) : (
                            <Card
                                card={hoveredData.card as CardState}
                                size="lg"
                                currentSiteIndex={currentSiteIndex}
                                isFaceDown={
                                    hoveredData.card.isOpponent
                                        ? (hoveredData.card as CardState)
                                              ?.isFaceDown
                                        : false
                                }
                            />
                        )}
                    </S.HoveredCardsZone>
                )}
                <PhaseBanner key={ctx.phase} phaseName={ctx.phase} />
                <DevPanel
                    G={G}
                    ctx={ctx}
                    moves={
                        moves as React.ComponentProps<typeof DevPanel>['moves']
                    }
                />
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
                    activeSkirmishId={G.activeSkirmishId}
                    G={G}
                />

                {/* ==================== 2. CENTRAL ==================== */}
                <S.CentralBlock>
                    <S.MainZone>
                        <TwilightPool value={G.twilightPool} />
                        <Battlefield
                            cards={G.battlefield}
                            playerRole={myId as '0' | '1'}
                            currentSiteIndex={currentSiteIndex}
                            isAssignmentPhase={ctx.phase === 'assignment'}
                            skirmishes={G.skirmishes}
                            lastWoundedCardIds={G.lastWoundedCardIds}
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
                    activeSkirmishId={G.activeSkirmishId}
                    G={G}
                />

                {/* ==================== SITE PATH ==================== */}
                <SitePath
                    path={G.path}
                    players={G.players}
                    onPlaySite={(siteId, targetIndex) => {
                        const isInitialSetupSite =
                            ctx.phase === 'setup' &&
                            G.setupState?.step === 'AWAITING_SITE' &&
                            targetIndex === 0;

                        if (isInitialSetupSite) {
                            const fpPlayer = G.players[G.fpPlayerId || '0'];
                            const siteCard = fpPlayer?.sitesDeck?.find(
                                (s) => s.id === siteId
                            );

                            if (siteCard && moves.selectStartingSite) {
                                moves.selectStartingSite(siteCard);
                                return;
                            }
                        }

                        if (moves.playSite) {
                            moves.playSite(siteId, targetIndex);
                        }
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
                            phase={ctx.phase}
                            regroupStep={G.regroupStep}
                            onDrawCard={() => {
                                if (moves.drawCard) moves.drawCard();
                            }}
                            onPlayCard={(idx) => {
                                if (moves.playCard) moves.playCard(idx);
                            }}
                            onDiscardCard={(index) =>
                                moves.discardCardFromHand(index)
                            }
                        />
                    }
                    sitesView={<SitesPicker sites={me.sitesDeck || []} />}
                />
            </S.BoardContainer>
        </DragProvider>
    );
};
