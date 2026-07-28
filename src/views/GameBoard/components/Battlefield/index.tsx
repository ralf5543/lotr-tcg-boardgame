import React, { useEffect, useRef } from 'react';
import type { CardState } from '../../../../game/types';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { BoardCharacterStack } from '../BoardCharacterStack';

interface BattlefieldProps {
    cards: CardState[];
    playerRole?: '0' | '1';
    currentSiteIndex?: number;
}

export const Battlefield: React.FC<BattlefieldProps> = ({
    cards,
    playerRole,
    currentSiteIndex,
}) => {
    const { registerTarget, activeTargetId, dragged } = useDrag();
    const containerRef = useRef<HTMLDivElement | null>(null);

    // 1. Enregistrement de la zone Battlefield
    useEffect(() => {
        registerTarget('battlefield', containerRef.current);
        return () => {
            registerTarget('battlefield', null);
        };
    }, [registerTarget]);

    // 2. Surbrillance au survol lors du drag d'un Séide
    const isValidCard = dragged?.card?.type === 'MINION' && dragged?.card?.kind === 'SHADOW';
    const isHovered = activeTargetId === 'battlefield' && isValidCard;

    // Si le joueur est l'Ombre ('1'), les séides ne sont pas perçus comme "adversaires"
    const isOpponent = playerRole === '0';

    return (
        <S.Battlefield ref={containerRef} $isHovered={isHovered}>
            <S.CardRow>
                {cards.length === 0 && (
                    <S.InfoText>
                        {isHovered
                            ? 'Déposez le serviteur ici !'
                            : 'Le champ de bataille est vide...'}
                    </S.InfoText>
                )}
                {cards.map((minion, idx) => (
                    <BoardCharacterStack
                        key={minion.id}
                        character={minion}
                        index={idx}
                        isOpponent={isOpponent}
                        currentSiteIndex={currentSiteIndex}
                    />
                ))}
            </S.CardRow>
        </S.Battlefield>
    );
};