import React, { useEffect, useState } from 'react';
import type {
    CardState,
    CardType,
    CardSubtype,
    GameState,
} from '../../../../game/types';
import type { BoardProps } from 'boardgame.io/react';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { BoardCharacterStack } from '../BoardCharacterStack';
import { canPlayCard } from '../../../../game/engine/canPlayCard';
import { useFaction } from '../../../../contexts/FactionContext';

interface SkirmishEntry {
    id?: string;
    companionId?: string;
    minionIds?: string[];
}

interface PlayerAreaProps {
    playerId: string;
    deckCount: number;
    fellowshipArea: CardState[];
    supportArea: CardState[];
    isOpponent?: boolean;
    moves: BoardProps<GameState>['moves'] & {
        reorderFellowship?: (data: {
            fromIndex: number;
            toIndex: number;
        }) => void;
        selectSkirmish?: (id: string) => void;
    };
    skirmishes?: SkirmishEntry[];
    battlefield?: CardState[];
    isSkirmishPhase?: boolean;
    activeSkirmishId?: string;
    G: GameState;
    isFaceDown?: boolean;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    playerId: _playerId,
    deckCount: _deckCount,
    fellowshipArea = [],
    supportArea = [],
    isOpponent = false,
    moves,
    skirmishes = [],
    battlefield = [],
    isSkirmishPhase = false,
    activeSkirmishId,
    G,
}) => {
    const { activeTargetId, registerTarget, startDrag, dragged } = useDrag();
    const [isDormantExpanded, setIsDormantExpanded] = useState(false);

    // Identification des rôles : Seul le joueur Peuples Libres a sa Compagnie active
    const { fpPlayerId, isSetupPhase } = useFaction();

    // En setup, on force isFP à true pour afficher la zone normalement
    const isFP = isSetupPhase ? true : _playerId === fpPlayerId;
    const isFellowshipDormant = !isFP;
    const playerBurdens = isFP ? (G?.players?.[_playerId]?.burdens ?? 0) : 0;

    // Gestion du Drag & Drop pour réordonner sa propre compagnie
    useEffect(() => {
        if (isOpponent) return;

        const handleReorderDrop = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { draggedCard, targetId } = customEvent.detail || {};

            if (!targetId || !draggedCard) return;
            const { index, origin } = draggedCard;

            if (origin === 'BOARD') {
                const currentList = fellowshipArea || [];
                let targetIndex: number;

                if (targetId !== 'fellowshipArea') {
                    targetIndex = currentList.findIndex(
                        (c) =>
                            c &&
                            (c.id === targetId ||
                                (c as { card?: { id: string } }).card?.id ===
                                    targetId)
                    );
                } else {
                    targetIndex = currentList.length - 1;
                }

                if (index === undefined || targetIndex === -1) {
                    return;
                }

                moves.reorderFellowship?.({
                    fromIndex: index,
                    toIndex: targetIndex,
                });
            }
        };
        

        window.addEventListener('card-dropped', handleReorderDrop);
        return () =>
            window.removeEventListener('card-dropped', handleReorderDrop);
    }, [isOpponent, moves, fellowshipArea]);

    const renderFellowship = () => {
        // 💤 MODE BANDEAU : Si ce joueur incarne l'Ombre, la Compagnie roupille
        if (isFellowshipDormant) {
            return (
                <S.DormantFellowshipBanner
                    $isOpponent={isOpponent}
                    onClick={() => setIsDormantExpanded(!isDormantExpanded)}
                >
                    <span>
                        🛡️ Compagnie en sommeil ({fellowshipArea.length}{' '}
                        compagnon
                        {fellowshipArea.length > 1 ? 's' : ''})
                    </span>
                    <S.ExpandHint>
                        {isDormantExpanded
                            ? 'Cliquez pour réduire 🔼'
                            : 'Cliquez pour inspecter 🔽'}
                    </S.ExpandHint>

                    {isDormantExpanded && (
                        <S.DormantOverlay onClick={(e) => e.stopPropagation()}>
                            <S.CardRow>
                                {fellowshipArea.length === 0 && (
                                    <S.EmptyText>Aucun compagnon.</S.EmptyText>
                                )}
                                {fellowshipArea.map(
                                    (companion, companionIdx) => (
                                        <BoardCharacterStack
                                            key={companion.id}
                                            character={companion}
                                            index={companionIdx}
                                            isOpponent={isOpponent}
                                            G={G}
                                            playerID={_playerId}
                                            isFaceDown={
                                                isOpponent
                                                    ? (companion.isFaceDown ??
                                                      false)
                                                    : false
                                            }
                                            burdens={playerBurdens}
                                        />
                                    )
                                )}
                            </S.CardRow>
                        </S.DormantOverlay>
                    )}
                </S.DormantFellowshipBanner>
            );
        }

        // ⚔️ MODE NORMAL : Compagnie active (Joueur FP)
        const draggedCard = dragged?.card as CardState | undefined;
        const isFellowshipTargeted =
            !isOpponent &&
            activeTargetId === 'fellowshipArea' &&
            dragged?.orientation === 'portrait' &&
            (draggedCard
                ? canPlayCard(
                      draggedCard,
                      { G, ctx: {}, playerID: _playerId },
                      'fellowshipArea',
                      null,
                      { ignorePhase: true }
                  ).valid
                : false);

        const isCombatLocked = Boolean(
            G?.actionWindow?.isOpen && G?.activeSkirmishId
        );

        return (
            <S.Fellowship
                $borderColor="#3498db"
                $isTargeted={isFellowshipTargeted}
                $isOpponent={isOpponent}
                ref={(el) => {
                    if (!isOpponent && el) {
                        registerTarget('fellowshipArea', el);
                    }
                }}
            >
                <S.ZoneTitle color="#3498db">
                    🛡️ Compagnie (Fellowship) {isOpponent ? '(Adverse)' : ''}
                </S.ZoneTitle>
                <S.CardRow>
                    {fellowshipArea.length === 0 && (
                        <S.EmptyText>Aucun compagnon déployé.</S.EmptyText>
                    )}
                    {fellowshipArea.map((companion, companionIdx) => {
                        const cardId = companion.instanceId || companion.id;

                        const isWounded = Boolean(
                            G?.lastWoundedCardIds?.includes(cardId) ||
                            (companion.wounds && companion.wounds > 0)
                        );
                        const isDead = Boolean(
                            G?.pendingDeadCardIds?.includes(cardId)
                        );
                        const skirmish = skirmishes.find(
                            (s) => s.companionId === companion.id
                        );
                        const assignedMinions = battlefield.filter((m) =>
                            skirmish?.minionIds?.includes(m.id)
                        );

                        const skirmishId =
                            skirmish?.id || `skirmish_${companion.id}`;

                        const shouldBeFaceDown = isOpponent
                            ? (companion.isFaceDown ?? false)
                            : false;

                        return (
                            <BoardCharacterStack
                                key={companion.id}
                                character={companion}
                                index={companionIdx}
                                isOpponent={isOpponent}
                                assignedMinions={assignedMinions}
                                isSkirmishPhase={isSkirmishPhase}
                                skirmishId={skirmishId}
                                isFaceDown={shouldBeFaceDown}
                                burdens={playerBurdens}
                                isWounded={isWounded}
                                            G={G}
                                            playerID={_playerId}
                                isDead={isDead}
                                isSelectedSkirmish={
                                    activeSkirmishId === skirmishId
                                }
                                onSelectSkirmish={(id) => {
                                    if (isCombatLocked) return;
                                    moves.selectSkirmish?.(id);
                                }}
                                onStartDrag={(e) => {
                                    if (isOpponent || e.button !== 0) return;
                                    e.stopPropagation();
                                    startDrag(
                                        companion,
                                        companionIdx,
                                        e,
                                        'BOARD',
                                        'portrait'
                                    );
                                }}
                            />
                        );
                    })}
                </S.CardRow>
            </S.Fellowship>
        );
    };

    const renderSupportArea = () => {
        const draggedCard = dragged?.card as CardState | undefined;

        const isSupportTargeted =
            !isOpponent &&
            activeTargetId === 'supportArea' &&
            dragged?.orientation === 'portrait' &&
            (draggedCard
                ? canPlayCard(
                      draggedCard,
                      { G, ctx: {}, playerID: _playerId },
                      'supportArea',
                      null,
                      { ignorePhase: true }
                  ).valid
                : false);

        // 🟢 Separation automatique FP (gauche) / Ombre (droite)
        const fpSupportCards = supportArea.filter(
            (card) => card.kind === 'FREE_PEOPLE'
        );
        const shadowSupportCards = supportArea.filter(
            (card) => card.kind === 'SHADOW'
        );

        return (
            <S.SupportArea
                $borderColor="#f39c12"
                $isOpponent={isOpponent}
                $isTargeted={isSupportTargeted}
                ref={(el) => {
                    if (!isOpponent && el) {
                        registerTarget('supportArea', el);
                    }
                }}
            >
                <S.ZoneTitle color="#f39c12">
                    🎒 Aire de Soutien (Support Area)
                </S.ZoneTitle>

                <S.SupportSplitLayout>
                    {/* Sous-zone GAUCHE : Peuples Libres */}
                    <S.SupportSubZone $align="left">
                        {fpSupportCards.map((card, cardIdx) => {
                            const cardId = card.instanceId || card.id;
                            const isWounded = Boolean(
                                G?.lastWoundedCardIds?.includes(cardId) ||
                                (card.wounds && card.wounds > 0)
                            );
                            const isDead = Boolean(
                                G?.pendingDeadCardIds?.includes(cardId)
                            );
                            const shouldBeFaceDown = isOpponent
                                ? (card.isFaceDown ?? false)
                                : false;

                            return (
                                <BoardCharacterStack
                                    key={card.id}
                                    character={card}
                                    index={cardIdx}
                                    isOpponent={isOpponent}
                                    isFaceDown={shouldBeFaceDown}
                                    burdens={playerBurdens}
                                    isWounded={isWounded}
                                    G={G}
                                    playerID={_playerId}
                                    isDead={isDead}
                                    onStartDrag={(e) => {
                                        if (isOpponent || e.button !== 0)
                                            return;
                                        e.stopPropagation();
                                        startDrag(
                                            card,
                                            cardIdx,
                                            e,
                                            'BOARD',
                                            'portrait'
                                        );
                                    }}
                                />
                            );
                        })}
                    </S.SupportSubZone>

                    {/* Sous-zone DROITE : Ombre */}
                    <S.SupportSubZone $align="right">
                        {shadowSupportCards.map((card, cardIdx) => {
                            const cardId = card.instanceId || card.id;
                            const isWounded = Boolean(
                                G?.lastWoundedCardIds?.includes(cardId) ||
                                (card.wounds && card.wounds > 0)
                            );
                            const isDead = Boolean(
                                G?.pendingDeadCardIds?.includes(cardId)
                            );
                            const shouldBeFaceDown = isOpponent
                                ? (card.isFaceDown ?? false)
                                : false;

                            return (
                                <BoardCharacterStack
                                    key={card.id}
                                    character={card}
                                    index={cardIdx}
                                    isOpponent={isOpponent}
                                    isFaceDown={shouldBeFaceDown}
                                    burdens={playerBurdens}
                                    isWounded={isWounded}
                                    G={G}
                                    playerID={_playerId}
                                    isDead={isDead}
                                    onStartDrag={(e) => {
                                        if (isOpponent || e.button !== 0)
                                            return;
                                        e.stopPropagation();
                                        startDrag(
                                            card,
                                            cardIdx,
                                            e,
                                            'BOARD',
                                            'portrait'
                                        );
                                    }}
                                />
                            );
                        })}
                    </S.SupportSubZone>
                </S.SupportSplitLayout>
            </S.SupportArea>
        );
    };
    

    return (
        <S.AreaContainer $isOpponent={isOpponent}>
            {isOpponent ? (
                <>
                    {renderSupportArea()}
                    {renderFellowship()}
                </>
            ) : (
                <>
                    {renderFellowship()}
                    {renderSupportArea()}
                </>
            )}
        </S.AreaContainer>
    );
};
