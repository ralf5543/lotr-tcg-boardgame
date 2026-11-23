import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import type { CardKeyword } from '../../../../game/types';
import { getKeywordInfo } from '../../../../i18n/keywords';
import { usePreferencesOptional } from '../../../../contexts/PreferencesContext';
import * as S from './styles';
import { getKeywordIconPath } from '../../../../utils/getKeywordIconPath';
import { usePulseOnChange } from '../../hooks/usePulseOnChange';

interface KeywordBadgeProps {
    keyword: CardKeyword;
    size?: number;
    value?: number;
}

export const KeywordBadge: React.FC<KeywordBadgeProps> = ({
    keyword,
    size = 18,
    value = 0,
}) => {
    const [hasError, setHasError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const badgeRef = useRef<HTMLSpanElement>(null);
    const valuePulse = usePulseOnChange(value);
    const prefs = usePreferencesOptional();
    const uiLang = prefs?.uiLanguage ?? 'fr';

    if (hasError) return null;

    const imagePath = getKeywordIconPath(keyword);
    const keywordInfo = getKeywordInfo(keyword, uiLang);

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
                data-cursor="arrow"
                $pulseGen={valuePulse}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <S.BadgeImage
                    src={imagePath}
                    alt={keywordInfo?.label || keyword}
                    width={size}
                    height={size}
                    onError={() => setHasError(true)}
                />
                {value > 0 && <S.BadgeValue>+{value}</S.BadgeValue>}
            </S.BadgeContainer>

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
