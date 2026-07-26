import React from 'react';
import type { SiteCardState } from '../../../../game/types';
import * as S from './styles';
import { TRANSLATIONS } from '../../../../game/translations';
import { TokenPlayer } from '../TokenPlayer';
import { KeywordBadge } from '../KeywordBadge';

export interface SiteCardProps {
    site: SiteCardState;
    size?: S.SiteCardSize;
    playersHere?: { p0?: boolean; p1?: boolean };
    className?: string;
    style?: React.CSSProperties;
}

export const SiteCard: React.FC<SiteCardProps> = ({
    site,
    size = 'md',
    playersHere,
    className,
    style,
}) => {
    // --- INTERPRÉTEUR DE TRADUCTION ---
    // On mappe chaque mot-clé brut vers sa version traduite.
    // Si la traduction n'existe pas, on conserve la clé brute par sécurité.
    const translatedKeywords = site.keywords
        ?.map((kw) => TRANSLATIONS.keyword[kw] || kw)
        .join(', ');

    return (
        <S.Container $size={size} className={className} style={style}>
            {site.keywords && site.keywords.length > 0 && size ==="sm" && (
                <S.SiteKeywordsContainer>
                    {site.keywords.map((kw) => (
                        <KeywordBadge key={kw} keyword={kw} size={20} />
                    ))}
                </S.SiteKeywordsContainer>
            )}
            <S.Title $size={size}>{site.name}</S.Title>
            <S.TwilightBadge $size={size}>{site.twilightCost}</S.TwilightBadge>

            {site.imageUrl && (
                <S.VisualContainer $size={size}>
                    <S.Visual src={site.imageUrl} alt={site.name} />
                </S.VisualContainer>
            )}

            {size !== 'sm' && (
                <S.Text $size={size}>
                    {translatedKeywords && (
                        <strong>{translatedKeywords}.&nbsp;</strong>
                    )}
                    {site.text}
                </S.Text>
            )}
            {size === 'sm' && (
                <S.Footer>
                    <span>
                        {site.ownerId !== undefined ? `P${site.ownerId}` : ''}
                    </span>
                    {playersHere && (
                        <>
                            {playersHere.p0 && <TokenPlayer value="1" />}
                            {playersHere.p1 && <TokenPlayer value="2" />}
                        </>
                    )}
                </S.Footer>
            )}
        </S.Container>
    );
};
