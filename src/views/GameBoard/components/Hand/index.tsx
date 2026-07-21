import React from 'react';
import type { CardType } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';

interface HandProps {
    hand: CardType[];
    deckCount: number;
    onDrawCard: () => void;
    onPlayCard: (index: number) => void;
}

export const Hand: React.FC<HandProps> = ({
    hand,
    deckCount,
    onDrawCard,
}) => {
    // Fonction pour calculer l'inclinaison de chaque carte dans la main
    const getFanStyles = (index: number, total: number) => {
        // --- LE BOUTON DE RÉGLAGE : BASE_Y ---
        // Change cette valeur (ex: -20, 0, 20, 50) pour remonter ou descendre TOUTE la main d'un coup !
        const baseY = -60;
        if (total <= 1) {
            return { angle: 0, translateY: baseY, zIndex: 1 };
        }

        const midIndex = (total - 1) / 2;
        const angleStep = 5; // Écart angulaire
        const angle = (index - midIndex) * angleStep;

        // Courbe descendante
        const distanceFromCenter = Math.abs(index - midIndex);

        const translateY = baseY + distanceFromCenter * 20; // 14px de descente par niveau d'éloignement pour un bel arrondi sans excès

        // Gestion de l'ordre d'affichage (de gauche à droite)
        const zIndex = index + 1;

        return { angle, translateY, zIndex };
    };

    const { startDrag, dragged } = useDrag();

    return (
        <S.FixedHandContainer>
            <S.ControlGroup>
                <S.GameButton $bgColor="#3498db" onClick={onDrawCard}>
                    🃏 Piocher ({deckCount})
                </S.GameButton>

            </S.ControlGroup>

            <S.CardRow>
                {hand.length === 0 ? (
                    true
                ) : (
                    hand.map((card, idx) => {
                        // RÈGLE : Seul le Peuple Libre est jouable activement pour l'instant
                        const isPlayable = card.kind === 'FREE_PEOPLES';
                        const { angle, translateY, zIndex } = getFanStyles(
                            idx,
                            hand.length
                        );

                        const isBeingDragged = dragged?.card.id === card.id;

                        return (
                            <S.CardWrapper
                                key={card.id}
                                $angle={angle}
                                $translateY={translateY}
                                $zIndex={zIndex}
                                style={{
                                    width: isBeingDragged ? '0px' : '',
                                    opacity: isBeingDragged ? 0 : 1,
                                    pointerEvents: isBeingDragged
                                        ? 'none'
                                        : 'auto',
                                    transition:
                                        'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                }}
                                onPointerDown={(e) => {
                                    // 1. On ne dragge QUE si c'est un clic gauche ou un contact tactile principal
                                    if (e.button !== 0) return;

                                    // 2. LA SÉCURITÉ ABSOLUE : On empêche l'événement de déborder sur les cartes voisines
                                    e.stopPropagation();
                                    e.preventDefault();

                                    // 3. On lance le drag proprement
                                    startDrag(card, idx, e);
                                }}
                            >
                                <Card
                                    card={card}
                                    isPlayable={isPlayable}
                                    index={idx} // 👈 On passe l'index à la carte
                                    isDraggable={true} // 👈 On dit à la carte qu'elle peut être draggée
                                    size="md"
                                />
                            </S.CardWrapper>
                        );
                    })
                )}
            </S.CardRow>

        </S.FixedHandContainer>
    );
};
