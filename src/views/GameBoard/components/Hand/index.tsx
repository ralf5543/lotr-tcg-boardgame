import React from 'react';
import type { CardType } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';

interface HandProps {
    hand: CardType[];
    deckCount: number;
    onDrawCard: () => void;
    onNextSite: () => void;
    onPlayCard: (index: number) => void;
}

export const Hand: React.FC<HandProps> = ({
    hand,
    deckCount,
    onDrawCard,
    onNextSite,
    onPlayCard,
}) => {
    const [hoveredCard, setHoveredCard] = React.useState<CardType | null>(null);

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

    return (
        <S.FixedHandContainer>
            <S.ControlGroup>
                <S.GameButton $bgColor="#3498db" onClick={onDrawCard}>
                    🃏 Piocher ({deckCount})
                </S.GameButton>
                <S.GameButton $bgColor="#2ecc71" onClick={onNextSite}>
                    🗺️ Avancer Site
                </S.GameButton>
            </S.ControlGroup>

            <S.CardRow style={{ alignItems: 'flex-end' }}>
                {hand.length === 0 ? (
                    <S.InfoText>Ta main est vide.</S.InfoText>
                ) : (
                    hand.map((card, idx) => {
                        // RÈGLE : Seul le Peuple Libre est jouable activement pour l'instant
                        const isPlayable = card.kind === 'FREE_PEOPLES';
                        const { angle, translateY, zIndex } = getFanStyles(
                            idx,
                            hand.length
                        );

                        return (
                            <S.CardWrapper
                                key={card.id}
                                $angle={angle}
                                $translateY={translateY}
                                $zIndex={zIndex}
                                // Au survol, on enregistre la carte comme "active" pour le clone
                                onMouseEnter={() => setHoveredCard(card)}
                                // Quand la souris sort, on nettoie l'état
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <Card
                                    card={card}
                                    isPlayable={isPlayable}
                                    onClick={() => onPlayCard(idx)}
                                />
                            </S.CardWrapper>
                        );
                    })
                )}
            </S.CardRow>

            <S.InfoText style={{ width: '120px', textAlign: 'right' }}>
                ℹ️ Clic carte = Jouer
            </S.InfoText>
            {hoveredCard && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '240px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        pointerEvents: 'none',
                    }}
                >
                    <Card card={hoveredCard} size="lg" />
                </div>
            )}
        </S.FixedHandContainer>
    );
};
