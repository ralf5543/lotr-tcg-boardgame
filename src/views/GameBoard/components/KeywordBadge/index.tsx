import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { TRANSLATIONS } from '../../../../game/translations';
import type { CardKeyword } from '../../../../game/types';
import * as S from './styles';

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

    const keywordInfo = TRANSLATIONS.keyword[keyword];
    const imagePath = `/interface/pictos/${keyword}.webp`;

    const handleMouseEnter = () => {
        if (badgeRef.current) {
            const rect = badgeRef.current.getBoundingClientRect();
            // Positionne le tooltip juste au-dessus du pictogramme
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
                    draggable={false}
                    onError={() => setHasError(true)}
                />
            </S.BadgeContainer>

            {/* 🟢 PORTAL : Injecte le tooltip directement à la racine du DOM (document.body) */}
            {isHovered && keywordInfo && ReactDOM.createPortal(
                <S.TooltipPortalContainer $top={coords.top} $left={coords.left}>
                    <S.TooltipHeader>
                        <img src={imagePath} alt="" width={16} height={16} />
                        <strong>{keywordInfo.label}</strong>
                    </S.TooltipHeader>
                    <S.TooltipText>{keywordInfo.description}</S.TooltipText>
                </S.TooltipPortalContainer>,
                document.body
            )}
        </>
    );
};