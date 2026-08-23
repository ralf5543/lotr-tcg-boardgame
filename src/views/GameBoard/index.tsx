import React, { useEffect } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { CardState, SiteCardState, GameState } from '../../game/types';
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
import { canAttachToCharacter } from '../../game/engine/canPlayCard';
import { PhaseBanner } from './components/PhaseBanner';
import { DevPanel, type DevMoves } from '../../utils/DevPanel';
import { useFaction } from '../../contexts/FactionContext';
import { FactionProvider } from '../../contexts/FactionProvider';
import { useTargeting } from '../../contexts/TargetingContext';
import { audioService } from '../../services/audioService';
import { findTargetCard } from '../../utils/cardUtils';
import { canPlayCard } from '../../game/engine/canPlayCard';
import { useCardPlayAudio } from '../../hooks/audio/useCardPlayAudio';
import { useArcheryAudio } from '../../hooks/audio/useArcheryAudio';
import { useWoundAudio } from '../../hooks/audio/useWoundAudio';
import { useAssignmentAudio } from '../../hooks/audio/useAssignmentAudio';

export interface GameBoardProps extends BoardProps<GameState> {
    moves: BoardProps<GameState>['moves'] &
        DevMoves & {
            confirmEndPhase?: () => void;
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
    useCardPlayAudio(G);
    useArcheryAudio(G);
    useWoundAudio(G);
    useAssignmentAudio(G);
    const myId = playerID || ctx.currentPlayer;
    const oppId = myId === '0' ? '1' : '0';

    // 🟢 1. Détection stricte de la phase de setup
const isSetupPhase = Boolean(
    G?.setupState && 
    G.setupState.step !== 'COMPLETED' && 
    ctx.phase === 'setup'
);

// 🟢 2. Identification des rôles (TOUJOURS définie)
const fpPlayerId = G.fpPlayerId || '0';
const isLocalFP = myId === fpPlayerId;
const isLocalShadow = !isLocalFP; // 👈 Rétabli pour G.awaitingSiteSelection et les rôles

// 🟢 3. Thème visuel du plateau uniquement
const currentFaction: 'FREE_PEOPLE' | 'SHADOW' | 'NEUTRAL' = isSetupPhase
    ? 'NEUTRAL'
    : isLocalFP
    ? 'FREE_PEOPLE'
    : 'SHADOW';

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

    // 🟢 NETTOYAGE VISUEL UNIVERSEL (Toutes phases / Tous événements)
    useEffect(() => {
        const hasWounded =
            G.lastWoundedCardIds && G.lastWoundedCardIds.length > 0;
        const hasPendingDead =
            G.pendingDeadCardIds && G.pendingDeadCardIds.length > 0;

        if (hasWounded || hasPendingDead) {
            const timer = setTimeout(() => {
                moves.cleanupPendingDeaths?.();
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [G.lastWoundedCardIds, G.pendingDeadCardIds, moves]);

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

            const cardType = card?.type;
            const cardSubtype = card?.subtype;

            let soundPath;
            if (cardType === 'COMPANION' || cardType === 'ALLY') {
                soundPath = 'COMPANION';
            } else if (cardType === 'MINION') {
                soundPath = 'MINION';
            } else if (cardType === 'POSSESSION') {
                soundPath = cardSubtype
                    ? `POSSESSION_${cardSubtype}`
                    : 'POSSESSION';
            }

            if (origin === 'HAND') {
                const isGlobalZone =
                    targetId === 'fellowshipArea' ||
                    targetId === 'supportArea' ||
                    targetId === 'battlefield';

                const targetCard = !isGlobalZone
                    ? findTargetCard(G, targetId)
                    : null;

                // L'engine vérifie absolument tout (phase, coût, unicité, validité zone/cible)
                const validation = canPlayCard(
                    card,
                    { G, ctx, playerID: myId },
                    targetId,
                    targetCard
                );

                if (!validation.valid) {
                    console.warn(
                        `❌ [canPlayCard] Rejet : ${validation.reason}`
                    );
                    return;
                }

                // Exécution du Move approprié
                if (targetCard) {
                    if (typeof moves.attachCard === 'function') {
                        moves.attachCard(index, targetId);
                    }
                } else if (
                    targetId === 'battlefield' &&
                    card?.kind === 'SHADOW'
                ) {
                    if (typeof moves.playShadowCard === 'function') {
                        moves.playShadowCard(index);
                    } else if (typeof moves.playCard === 'function') {
                        moves.playCard(index);
                    }
                } else {
                    if (typeof moves.playCard === 'function') {
                        moves.playCard(index);
                    }
                }
                return;
            }

            if (origin === 'ATTACHMENT') {
                if (targetId === parentId) return;

                if (
                    targetId !== 'fellowshipArea' &&
                    targetId !== 'supportArea' &&
                    targetId !== 'battlefield'
                ) {
                    const targetCard = findTargetCard(G, targetId);
                    if (canAttachToCharacter(card, targetCard)) {
                        if (moves.transferAttachment) {
                            moves.transferAttachment({
                                attachmentId: card.id,
                                fromCharacterId: parentId,
                                toCharacterId: targetId,
                            });
                            audioService.play('CARD_PLAY');
                            audioService.play(soundPath, { delay: 0.3 });
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

    const lastPlayedSkirmishIdRef = React.useRef<string | null>(null);

    useEffect(() => {
        if (ctx.phase !== 'skirmish' || !G.activeSkirmishId) {
            lastPlayedSkirmishIdRef.current = null;
            return;
        }

        if (G.activeSkirmishId !== lastPlayedSkirmishIdRef.current) {
            lastPlayedSkirmishIdRef.current = G.activeSkirmishId;
            audioService.play('SKIRMISH');
        }
    }, [ctx.phase, G.activeSkirmishId]);

    // 🟢 5. SYNCHRONISATION DU CIBLAGE EN PHASE DE SKIRMISH
    useEffect(() => {
        if (
            ctx.phase !== 'skirmish' ||
            !G.skirmishes ||
            G.skirmishes.length === 0
        ) {
            if (ctx.phase !== 'archery') {
                stopTargeting();
            }
            return;
        }

        if (G.activeSkirmishId) {
            stopTargeting();
            return;
        }

        const targetableCompanionIds = G.skirmishes
            .map((s) => s.companionId)
            .filter(Boolean);

        startTargeting({
            targetableCardIds: targetableCompanionIds,
            message:
                'Escarmouche : Cliquez sur un groupe pour résoudre son combat.',
            onSelectTarget: (companionCardId) => {
                const chosenSkirmish = G.skirmishes.find(
                    (s) => s.companionId === companionCardId
                );

                if (chosenSkirmish && moves.selectSkirmish) {
                    moves.selectSkirmish(chosenSkirmish.id);
                }
            },
        });
    }, [
        ctx.phase,
        G.skirmishes,
        G.activeSkirmishId,
        moves,
        startTargeting,
        stopTargeting,
    ]);

    // Détermination de l'onglet prioritaire selon le state du jeu
    const getRequestedTab = (): 'hand' | 'sites' | null => {
        const isSetupPhase = ctx.phase === 'setup';
        const auctionWinnerId = G.setupState?.auctionWinnerId || fpPlayerId;

        if (isSetupPhase && G.setupState?.step === 'AWAITING_SITE') {
            if (myId === auctionWinnerId) {
                return 'sites';
            }
            return null;
        }

        if (isSetupPhase && G.setupState?.step === 'MULLIGAN') {
            return 'hand';
        }

        if (G.awaitingSiteSelection) {
            if (isLocalShadow) {
                return 'sites';
            }
            return null;
        }

        const isMainGamePhase =
            ctx.phase === 'fellowship' || ctx.phase === 'shadow';

        if (isMainGamePhase) return 'hand';

        return null;
    };

    return (
        <FactionProvider
            myPlayerId={myId}
            fpPlayerId={fpPlayerId}
            isSetupPhase={isSetupPhase}
        >
            <DragProvider>
                <S.BoardContainer $faction={currentFaction}>
                    {hoveredData && (
                        <S.HoveredCardsZone
                            $orientation={hoveredData.orientation}
                        >
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
                        deckCount={me.deck?.length || 0}
                        onDrawCard={() => {
                            if (moves.drawCard) moves.drawCard();
                        }}
                        moves={
                            moves as React.ComponentProps<
                                typeof DevPanel
                            >['moves']
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
                            <Battlefield
                                cards={G.battlefield}
                                playerRole={myId as '0' | '1'}
                                currentSiteIndex={currentSiteIndex}
                                isAssignmentPhase={ctx.phase === 'assignment'}
                                skirmishes={G.skirmishes}
                                lastWoundedCardIds={G.lastWoundedCardIds}
                            />
                            <TwilightPool value={G.twilightPool} />
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
                        requestedTab={getRequestedTab()}
                        handView={
                            <Hand
                                G={G}
                                playerRole={myId as '0' | '1'}
                                hand={me.hand || []}
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
        </FactionProvider>
    );
};
