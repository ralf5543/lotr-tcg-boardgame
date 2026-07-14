import React from 'react';
import type { CardType } from '../../../../game/types';
import * as S from './styles';
import { TRANSLATIONS } from '../../../../game/translations';

interface CardProps {
    card: CardType;
    onClick?: () => void;
    isPlayable?: boolean;
    size?: 'sm' | 'md' | 'lg'; // Ajout de la prop size
}

export const Card: React.FC<CardProps> = ({
    card,
    isPlayable,
    onClick,
    size = 'md',
}) => {
    const isShadow = card.kind === 'SHADOW';

    // --- INTERPRÉTEUR DE TRADUCTION ---
    const translatedSubType = TRANSLATIONS.subType[card.subType];
    const translatedRace = card.race ? TRANSLATIONS.race[card.race] : null;

    // Construction de la ligne de type (Ex: "Compagnon • Homme • Rôdeur")
    const typeLineElements = [translatedSubType, translatedRace].filter(
        Boolean
    ); // Retire les éléments undefined ou null

    const typeLine = typeLineElements.join(' • ');

    return (
        <S.CardContainer
            $culture={card.culture}
            $imageUrl={card.imageUrl}
            $isShadow={isShadow}
            $isPlayable={isPlayable}
            $size={size} // Transmis au style pour recalculer l'échelle !
            onClick={isPlayable ? onClick : undefined}
        >
            <S.CardHeader>
                <S.TwilightBadge>{card.twilightCost}</S.TwilightBadge>
              <S.CardTitles>
                <S.CardTitle>
                    {card.isUnique && '• '}
                    {card.title}
                </S.CardTitle>
                {card.subtitle && size === 'lg' && (
                    <S.CardSubtitle>{card.subtitle}</S.CardSubtitle>
                )}
                </S.CardTitles>
            </S.CardHeader>

            <S.VisualContainer>
                <S.Visual src={card.imageUrl} alt={card.title} />
            </S.VisualContainer>

            <S.Type>{typeLine}</S.Type>

            <S.GameText $culture={card.culture}>
                <p>{card.gameText}</p>
            </S.GameText>

            {/* N'affiche la force et la vitalité que s'ils sont définis */}
            {(card.strength !== undefined || card.vitality !== undefined) && (
                <S.StatsRow>
                    {card.strength !== undefined && (
                        <S.StrengthBadge>
                            {card.strength}
                        </S.StrengthBadge>
                    )}
                    {card.vitality !== undefined && (
                        <S.VitalityBadge>{card.vitality}</S.VitalityBadge>
                    )}
                </S.StatsRow>
            )}
        </S.CardContainer>
    );
};
