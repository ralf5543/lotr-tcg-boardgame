import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { TRANSLATIONS } from '../../../../game/translations';
import type { CardKeyword } from '../../../../game/types';
import * as S from './styles';
import { getKeywordIconPath } from '../../../../utils/getKeywordIconPath';

interface KeywordBadgeProps {
    keyword: CardKeyword;
    size?: number;
}

export const KeywordBadge: React.FC<KeywordBadgeProps> = ({ keyword, size = 18 }) => {
    const [hasError, setHasError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const badgeRef = useRef<HTMLSpanElement>(null);

    if (hasError) return null;

    // 1. Obtenir le chemin de l'image via le helper
    const imagePath = getKeywordIconPath(keyword);

    // 2. Extraire la clé de traduction générique (ex: "Damage +1" -> "Damage" ou "Damage +")
    // Nettoie les chiffres, points et symboles pour trouver la clé de base dans TRANSLATIONS.keyword
    const baseKeywordKey = keyword
        .replace(/[0-9.,+]/g, '')
        .trim();

    // Recherche de la traduction (soit le keyword exact, soit la version nettoyée)
    const keywordInfo = TRANSLATIONS.keyword[keyword] || TRANSLATIONS.keyword[baseKeywordKey];

    const handleMouseEnter = () => {
        if (badgeRef.current) {
            const rect = badgeRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top - 8,
                left: rect.left + rect.width / 2,
            });
            setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <>
            <S.BadgeContainer
                ref={badgeRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <S.BadgeImage 
                    src={imagePath} 
                    alt={keyword}
                    width={size}
                    height={size}
                    onError={() => setHasError(true)}
                />
            </S.BadgeContainer>

            {/* PORTAL : Injecte le tooltip directement à la racine du DOM (document.body) */}
            {isHovered && keywordInfo && ReactDOM.createPortal(
                <S.TooltipPortalContainer $top={coords.top} $left={coords.left}>
                    <S.TooltipHeader>
                        <img src={imagePath} alt="" width={16} height={16} />
                        {/* Affiche le keyword original (ex: "Damage +2") ou le titre traduit */}
                        <strong>{keywordInfo.label || keyword}</strong>
                    </S.TooltipHeader>
                    <S.TooltipText>{keywordInfo.description}</S.TooltipText>
                </S.TooltipPortalContainer>,
                document.body
            )}
        </>
    );
};