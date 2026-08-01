import React from 'react';
import * as S from './styles';

interface SkirmishClashProps {
    $isOpponent?: boolean;
}

// ----------------------------------------------------
// 🧩 COMPOSANT EXPORTÉ
// ----------------------------------------------------

export const SkirmishClash: React.FC<SkirmishClashProps> = ({ $isOpponent }) => {
    const path = 'interface/UI/';
    return (
        <S.ClashContainer $isOpponent={$isOpponent}>
            <S.Shield src={`${path}picto_skirmish_shield.webp`} alt="Bouclier" />
            <S.SwordLeft src={`${path}picto_skirmish_sword1.webp`} alt="Épée Gauche" />
            <S.SwordRight src={`${path}picto_skirmish_sword2.webp`} alt="Épée Droite" />
        </S.ClashContainer>
    );
};