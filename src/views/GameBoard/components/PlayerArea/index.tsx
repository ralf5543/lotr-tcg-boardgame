import React, { useRef, useEffect } from 'react';
import type { CardType, CardSubtype } from '../../../../game/types';
import * as S from './styles';
import { Card } from '../Card';
import { useDrag } from '../../../../contexts/DragContext';
import {
    canDropInSupportArea,
    canDropInFellowship,
    canAttachToCharacter,
} from '../../../../utils/routingDragNDrop';

interface PlayerAreaProps {
    playerId: string;
    deckCount: number;
    fellowshipArea: CardType[];
    supportArea: CardType[];
    isOpponent?: boolean;
    moves: any;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    playerId,
    deckCount,
    fellowshipArea,
    supportArea,
    isOpponent = false,
    moves,
}) => {
    const isFreePeoplesPlayer = playerId === '0';
    const { activeTargetId, registerTarget, startDrag, dragged } = useDrag();

    const movesRef = useRef(moves);
    useEffect(() => {
        movesRef.current = moves;
    }, [moves]);

    const companionsRef = useRef<CardType[]>(fellowshipArea);
    useEffect(() => {
        companionsRef.current = fellowshipArea;
    }, [fellowshipArea]);

    const cardSubtype = (dragged?.card as CardType)?.subType as CardSubtype | undefined;

    useEffect(() => {
        const handlePhysicalDrop = (e: Event) => {
            if (isOpponent) return;

            const customEvent = e as CustomEvent;
            const { draggedCard, targetId } = customEvent.detail || {};

            if (!targetId || !draggedCard) return;
            const { index, origin } = draggedCard;
            const droppedSubtype = (draggedCard.card as CardType)?.subType as CardSubtype | undefined;

            // --- CASE A : ATTACHEMENT SUR UN PERSONNAGE ---
            if (
                origin === 'HAND' &&
                targetId !== 'fellowshipArea' &&
                targetId !== 'supportArea'
            ) {
                if (canAttachToCharacter(droppedSubtype)) {
                    console.log('📎 [TRY ATTACH]:', { cardIndex: index, targetCardId: targetId });
                    moves.attachCard(index, targetId);
                }
                return;
            }

            // --- CASE B : POSE SUR LA FELLOWSHIP AREA ---
            if (origin === 'HAND' && targetId === 'fellowshipArea') {
                if (canDropInFellowship(droppedSubtype)) {
                    console.log('🃏 [PLAY COMPANION]:', { cardIndex: index });
                    moves.playCard(index);
                }
                return;
            }

            // --- CASE C : POSE SUR LA SUPPORT AREA ---
            if (origin === 'HAND' && targetId === 'supportArea') {
                if (canDropInSupportArea(droppedSubtype)) {
                    console.log('🎒 [PLAY SUPPORT]:', { cardIndex: index });
                    moves.playCard(index);
                }
                return;
            }

            // --- CASE D : REORDER SUR LE PLATEAU ---
            if (origin === 'BOARD') {
                const currentList = fellowshipArea || [];
                let toIndex = -1;

                if (targetId !== 'fellowshipArea') {
                    toIndex = currentList.findIndex(
                        (c) => c && (c.id === targetId || (c as any).card?.id === targetId)
                    );
                } else {
                    toIndex = currentList.length - 1;
                }

                if (index === undefined || toIndex === -1) {
                    return;
                }

                moves.reorderFellowship({ fromIndex: index, toIndex });
            }
        };

        window.addEventListener('card-dropped', handlePhysicalDrop);
        return () => window.removeEventListener('card-dropped', handlePhysicalDrop);
    }, [isOpponent, moves, fellowshipArea]);

    // 1. Rendu du composant Zone Communauté (Fellowship)
    const renderFellowship = () => {
        if (isFreePeoplesPlayer) {
            const isFellowshipTargeted =
                !isOpponent &&
                activeTargetId === 'fellowshipArea' &&
                dragged?.orientation === 'portrait' &&
                canDropInFellowship(cardSubtype);

            return (
                <S.Fellowship
                    className="fellowship-active"
                    $borderColor="#3498db"
                    $isTargeted={isFellowshipTargeted}
                    ref={(el) => !isOpponent && registerTarget('fellowshipArea', el)}
                >
                    <S.CardRow>
                        {(fellowshipArea || []).length === 0 && (
                            <S.EmptyText>Aucun compagnon déployé.</S.EmptyText>
                        )}
                        {(fellowshipArea || []).map((companion, companionIdx) => {
                            const isBeingDragged = dragged?.card?.id === companion.id;
                            const isCompanionTargeted =
                                !isOpponent &&
                                activeTargetId === companion.id &&
                                dragged?.orientation === 'portrait' &&
                                canAttachToCharacter(cardSubtype);

                            return (
                                <S.CharacterStack
                                    key={companion.id}
                                    $isBeingDragged={isBeingDragged}
                                >
                                    <S.CardDragTarget
                                        $isOpponent={isOpponent}
                                        $isTargeted={isCompanionTargeted}
                                        /* 🟢 Indique au curseur que l'élément est grabbable s'il n'appartient pas à l'adversaire */
                                        data-draggable={!isOpponent ? "true" : undefined}
                                        ref={(el) =>
                                            !isOpponent && registerTarget(companion.id, el)
                                        }
                                        onPointerDown={(e) => {
                                            if (isOpponent) return;
                                            if (e.button !== 0) return;
                                            e.stopPropagation();

                                            startDrag(
                                                companion,
                                                companionIdx,
                                                e,
                                                'BOARD',
                                                'portrait'
                                            );
                                        }}
                                    >
                                        <Card 
                                            card={companion} 
                                            size="sm" 
                                            isDraggable={!isOpponent} 
                                            index={companionIdx}
                                        />
                                    </S.CardDragTarget>

                                    {companion.attachments?.map((attachment, idx) => (
                                        <S.AttachmentWrapper
                                            key={attachment.id}
                                            $index={idx}
                                        >
                                            <Card card={attachment} size="sm" />
                                        </S.AttachmentWrapper>
                                    ))}
                                </S.CharacterStack>
                            );
                        })}
                    </S.CardRow>
                </S.Fellowship>
            );
        }

        return <S.FellowshipCollapsed />;
    };

    // 2. Rendu du composant Aire de Soutien (SupportArea)
    const renderSupportArea = () => {
        const isSupportTargeted =
            !isOpponent &&
            activeTargetId === 'supportArea' &&
            dragged?.orientation === 'portrait' &&
            canDropInSupportArea(cardSubtype);

        return (
            <S.SupportArea
                $borderColor="#f39c12"
                $isOpponent={isOpponent}
                $isTargeted={isSupportTargeted}
                ref={(el) => !isOpponent && registerTarget('supportArea', el)}
            >
                <S.ZoneTitle color="#f39c12">
                    🎒 Aire de Soutien (Support Area)
                </S.ZoneTitle>
                <S.CardRow>
                    {(supportArea || []).length === 0 && (
                        <S.EmptyText>Aire de soutien vide.</S.EmptyText>
                    )}
                    {(supportArea || []).map((card, cardIdx) => (
                        <S.CharacterStack 
                            key={card.id}
                            /* 🟢 Si les cartes de support sont déplaçables */
                            data-draggable={!isOpponent ? "true" : undefined}
                        >
                            <Card 
                                size="sm" 
                                card={card} 
                                isDraggable={!isOpponent} 
                                index={cardIdx}
                            />
                        </S.CharacterStack>
                    ))}
                </S.CardRow>
            </S.SupportArea>
        );
    };

    return (
        <S.AreaContainer $isOpponent={isOpponent}>
            <S.MetaInfo $isOpponent={isOpponent}>
                {isOpponent
                    ? `🔴 ADVERSAIRE (Joueur ${playerId}) — Deck : ${deckCount} cartes`
                    : `🧙‍♂️ TOI (Joueur ${playerId})`}
            </S.MetaInfo>

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