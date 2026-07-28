import React, { useEffect } from 'react';
import type { CardState, CardType } from '../../../../game/types';
import * as S from './styles';
import { Card } from '../Card';
import { useDrag } from '../../../../contexts/DragContext';
import { BoardCharacterStack } from '../BoardCharacterStack';
import {
    canDropInSupportArea,
    canDropInFellowship,
} from '../../../../utils/routingDragNDrop';

interface PlayerAreaProps {
    playerId: string;
    deckCount: number;
    fellowshipArea: CardState[];
    supportArea: CardState[];
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

    const cardSubtype = (dragged?.card as CardState)?.type as CardType | undefined;

    // Gestion ciblée du réordonnancement des compagnons (origin === 'BOARD')
    useEffect(() => {
        const handleReorderDrop = (e: Event) => {
            if (isOpponent) return;

            const customEvent = e as CustomEvent;
            const { draggedCard, targetId } = customEvent.detail || {};

            if (!targetId || !draggedCard) return;
            const { index, origin } = draggedCard;

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

        window.addEventListener('card-dropped', handleReorderDrop);
        return () => window.removeEventListener('card-dropped', handleReorderDrop);
    }, [isOpponent, moves, fellowshipArea]);

    // 1. Rendu de la Zone Communauté (Fellowship)
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
                        {(fellowshipArea || []).map((companion, companionIdx) => (
                            <BoardCharacterStack
                                key={companion.id}
                                character={companion}
                                index={companionIdx}
                                isOpponent={isOpponent}
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
                        ))}
                    </S.CardRow>
                </S.Fellowship>
            );
        }

        return <S.FellowshipCollapsed />;
    };

    // 2. Rendu de l'Aire de Soutien (SupportArea)
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
                            data-draggable={!isOpponent ? 'true' : undefined}
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