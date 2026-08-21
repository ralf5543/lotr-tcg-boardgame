import React from 'react';
import type { SiteCardState } from '../../../../game/types';
import * as S from './styles';
import { TRANSLATIONS } from '../../../../game/translations';
import { TokenPlayer } from '../TokenPlayer';
import { KeywordBadge } from '../KeywordBadge';
import { FormattedText } from '../../../../utils/FormattedText';
import { getCardText } from '../../../../utils/i18n';
import type { SupportedLanguage } from '../../../../utils/i18n';

export interface SiteCardProps {
    site: SiteCardState;
    size?: S.SiteCardSize;
    // 🟢 On passe les URLs des avatars pour p0 et p1 (ou boolean si pas d'avatar)
    playersHere?: {
        p0?: { avatarUrl?: string; name?: string } | boolean;
        p1?: { avatarUrl?: string; name?: string } | boolean;
    };
    className?: string;
    style?: React.CSSProperties;
    currentLang?: SupportedLanguage;
}

export const SiteCard: React.FC<SiteCardProps> = ({
    site,
    size = 'md',
    playersHere,
    className,
    style,
    currentLang = 'fr',
}) => {

    const { title, gameText } = getCardText(
        site,
        currentLang
    );

    // Helpers pour extraire facilement les infos p0 / p1
    const p0Data = typeof playersHere?.p0 === 'object' ? playersHere.p0 : null;
    const p1Data = typeof playersHere?.p1 === 'object' ? playersHere.p1 : null;

    const hasP0 = Boolean(playersHere?.p0);
    const hasP1 = Boolean(playersHere?.p1);

    return (
        <S.Container $size={size} className={className} style={style}>
            {site.keywords && site.keywords.length > 0 && size === 'sm' && (
                <S.SiteKeywordsContainer>
                    {site.keywords.map((kw) => (
                        <KeywordBadge key={kw} keyword={kw} size={20} />
                    ))}
                </S.SiteKeywordsContainer>
            )}
            <S.Title $size={size}>{title}</S.Title>
            <S.TwilightBadge $size={size}>{site.twilightCost}</S.TwilightBadge>

            {size !== 'sm' && (
                <S.Text $size={size}>
                    <FormattedText text={gameText} />
                </S.Text>
            )}
            {size === 'sm' && (
                <S.Footer>
                    <span>
                        {site.ownerId !== undefined ? `P${site.ownerId}` : ''}
                    </span>
                    {playersHere && (
                        <>
                            {hasP0 && (
                                <TokenPlayer
                                    value="0"
                                    avatarUrl={p0Data?.avatarUrl}
                                    playerName={p0Data?.name}
                                />
                            )}
                            {hasP1 && (
                                <TokenPlayer
                                    value="1"
                                    avatarUrl={p1Data?.avatarUrl}
                                    playerName={p1Data?.name}
                                />
                            )}
                        </>
                    )}
                </S.Footer>
            )}

            {site.imageUrl && (
                <S.VisualContainer $size={size}>
                    <S.Visual src={site.imageUrl} alt={site.name} />
                </S.VisualContainer>
            )}
        </S.Container>
    );
};
