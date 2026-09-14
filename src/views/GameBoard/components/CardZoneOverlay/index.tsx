import React, { useEffect } from 'react';
import type { CardState } from '../../../../game/types';
import { Card } from '../Card';
import { groupCardsForDisplay } from '../../../../utils/groupCardsForDisplay';
import * as S from './styles';

export interface CardZoneOverlayProps {
    title: string;
    subtitle?: string;
    cards: CardState[];
    currentSiteIndex?: number;
    emptyMessage?: string;
    onClose: () => void;
}

export const CardZoneOverlay: React.FC<CardZoneOverlayProps> = ({
    title,
    subtitle,
    cards,
    currentSiteIndex = 0,
    emptyMessage = 'Cette pile est vide.',
    onClose,
}) => {
    const grouped = groupCardsForDisplay(cards);
    const totalCards = cards.length;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const resolvedSubtitle =
        subtitle ??
        (totalCards === 0
            ? 'Aucune carte'
            : totalCards === 1
              ? '1 carte · ordre : dernière en haut de pile en premier'
              : `${totalCards} cartes · ordre : dernière en haut de pile en premier`);

    return (
        <S.Backdrop
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={onClose}
        >
            <S.Header onClick={(event) => event.stopPropagation()}>
                <S.TitleBlock>
                    <S.Title>{title}</S.Title>
                    <S.Subtitle>{resolvedSubtitle}</S.Subtitle>
                </S.TitleBlock>
                <S.CloseButton
                    type="button"
                    aria-label="Fermer"
                    onClick={onClose}
                >
                    ×
                </S.CloseButton>
            </S.Header>

            <S.GridScroll onClick={(event) => event.stopPropagation()}>
                {grouped.length === 0 ? (
                    <S.EmptyState>{emptyMessage}</S.EmptyState>
                ) : (
                    <S.Grid>
                        {grouped.map(({ card, count }) => (
                            <S.GridCell key={card.instanceId || card.id}>
                                {count > 1 && (
                                    <S.CountBadge aria-label={`${count} exemplaires`}>
                                        ×{count}
                                    </S.CountBadge>
                                )}
                                <Card
                                    card={card}
                                    size="md"
                                    currentSiteIndex={currentSiteIndex}
                                />
                            </S.GridCell>
                        ))}
                    </S.Grid>
                )}
            </S.GridScroll>
        </S.Backdrop>
    );
};
