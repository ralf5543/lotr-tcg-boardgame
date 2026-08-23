import React, { useEffect, useRef } from 'react';
import type { CardState, SiteCardState, GameState } from '../../../../game/types';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { BoardCharacterStack } from '../BoardCharacterStack';
import { getEffectiveVitality } from '../../../../utils/cardStats';

// Helper pour déterminer si une carte est une carte standard (CardState)
const isStandardCard = (card: CardState | SiteCardState): card is CardState => {
    return 'kind' in card && 'type' in card;
};

interface BattlefieldProps {
    cards: CardState[];
    playerRole?: '0' | '1';
    currentSiteIndex?: number;
    isAssignmentPhase?: boolean;
    skirmishes?: Array<{ companionId?: string; minionIds?: string[] }>;
    lastWoundedCardIds?: string[];
    pendingDeadCardIds?: string[];
    isOpponent?: boolean;
    playerId: string;
    G: GameState;
}

export const Battlefield: React.FC<BattlefieldProps> = ({
    cards,
    currentSiteIndex,
    isAssignmentPhase = false,
    skirmishes = [],
    lastWoundedCardIds = [],
    pendingDeadCardIds = [],
    isOpponent = false,
    G,
    playerId,
}) => {
    const { registerTarget, activeTargetId, dragged } = useDrag();
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        registerTarget('battlefield', containerRef.current);
        return () => {
            registerTarget('battlefield', null);
        };
    }, [registerTarget]);

    // Validation type-safe : on vérifie d'abord que c'est une carte standard
    const isValidCard =
        !!dragged?.card &&
        isStandardCard(dragged.card) &&
        dragged.card.type === 'MINION' &&
        dragged.card.kind === 'SHADOW';

    const isHovered = activeTargetId === 'battlefield' && isValidCard;

    // Filtrer les séides non assignés
    const unassignedMinions = cards.filter(
        (minion) => !skirmishes.some((s) => s.minionIds?.includes(minion.id))
    );

    return (
        <S.Battlefield ref={containerRef} $isHovered={isHovered}>
            <S.CardRow>
                {unassignedMinions.length === 0 && (
                    <S.InfoText>
                        {isHovered
                            ? 'Déposez le serviteur ici !'
                            : 'Le champ de bataille est vide...'}
                    </S.InfoText>
                )}
                {unassignedMinions.map((minion, idx) => {
                    const minionId = minion.instanceId || minion.id;

                    // 1. Détection de la blessure (jetons de blessures ou marqué dans lastWoundedCardIds)
                    const isWounded = Boolean(
                        (minion.wounds && minion.wounds > 0) ||
                        lastWoundedCardIds?.includes(minionId)
                    );

                    // 2. Détection de la mort (en attente de mort ou vitalité épuisée)
                    const isDead = Boolean(
                        pendingDeadCardIds.includes(minionId) ||
                        getEffectiveVitality(minion) <= 0
                    );

                    return (
                        <BoardCharacterStack
                            key={minion.id}
                            character={minion}
                            index={idx}
                            isOpponent={isOpponent}
                            currentSiteIndex={currentSiteIndex}
                            isAssignmentPhase={isAssignmentPhase}
                            isWounded={isWounded}
                            isDead={isDead}
                            burdens={0}
                            isFaceDown={false}
                            G={G}
                            playerID={playerId}
                        />
                    );
                })}
            </S.CardRow>
        </S.Battlefield>
    );
};
