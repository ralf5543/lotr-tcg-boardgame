// src/views/GameBoard/components/Card/index.tsx
import React from 'react';
import type { CardType } from '../../../../game/types';
import * as S from './styles';

interface CardProps {
  card: CardType;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ card, onClick }) => {
  const isShadow = card.kind === 'SHADOW';

  return (
    <S.CardContainer 
      $culture={card.culture} 
      $imageUrl={card.imageUrl} 
      $isShadow={isShadow}
      onClick={onClick}
    >
      <S.CardHeader>
        <S.CardTitle>{card.title}</S.CardTitle>
        <S.TwilightBadge>{card.twilightCost}</S.TwilightBadge>
      </S.CardHeader>

      <S.VisualContainer>
        <S.Visual src={card.imageUrl} alt={card.title} />
      </S.VisualContainer>
      
      {/* N'affiche la force et la vitalité que s'ils sont définis (les persos) */}
      {(card.strength !== undefined || card.vitality !== undefined) && (
        <S.StatsRow>
          {card.strength !== undefined && (
            <S.StatBadge $isStrength={true}>{card.strength}</S.StatBadge>
          )}
          {card.vitality !== undefined && (
            <S.StatBadge>{card.vitality}</S.StatBadge>
          )}
        </S.StatsRow>
      )}
    </S.CardContainer>
  );
};