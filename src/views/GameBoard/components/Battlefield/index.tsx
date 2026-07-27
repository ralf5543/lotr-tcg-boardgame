import React, { useEffect, useRef } from 'react';
import type { CardState } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';

interface BattlefieldProps {
    cards: CardState[];
    playerRole?: '0' | '1';
    currentSiteIndex?: number; // 🟢 1. Ajout dans l'interface
    onPlayShadowCard?: (cardIndex: number) => void;
}

export const Battlefield: React.FC<BattlefieldProps> = ({
    cards,
    currentSiteIndex, // 🟢 2. Récupération dans les props
    onPlayShadowCard,
}) => {
    const { registerTarget, activeTargetId, dragged } = useDrag();
    const containerRef = useRef<HTMLDivElement | null>(null);

    // 1. Enregistrement de la zone
    useEffect(() => {
        registerTarget('battlefield', containerRef.current);
        return () => {
            registerTarget('battlefield', null);
        };
    }, [registerTarget]);

    // 2. Écoute du drop
    useEffect(() => {
        const handleCardDropped = (e: Event) => {
            const customEvent = e as CustomEvent<{
                draggedCard: { card: CardState; index: number };
                targetId: string | null;
            }>;

            const { draggedCard, targetId } = customEvent.detail;

            // Sécurité : uniquement si la cible est 'battlefield' ET que c'est une carte SHADOW
            if (targetId === 'battlefield' && draggedCard.card.kind === 'SHADOW') {
                if (onPlayShadowCard) {
                    onPlayShadowCard(draggedCard.index);
                }
            }
        };

        window.addEventListener('card-dropped', handleCardDropped);
        return () => {
            window.removeEventListener('card-dropped', handleCardDropped);
        };
    }, [onPlayShadowCard]);

    // 🟢 3. Vérification de la validité de la carte survolée
    const isValidCard = dragged?.card.type === 'MINION';

    // 🟢 La zone ne s'allume en surbrillance QUE si la cible est active ET la carte est valide
    const isHovered = activeTargetId === 'battlefield' && isValidCard;

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
                {cards.map((card, idx) => (
                    <Card
                        key={card.id}
                        card={card}
                        index={idx}
                        size="sm"
                        currentSiteIndex={currentSiteIndex} // 🟢 3. Transmis à la carte !
                    />
                ))}
            </S.CardRow>
        </S.Battlefield>
    );
};