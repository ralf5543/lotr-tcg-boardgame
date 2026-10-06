import React, { useEffect, useMemo } from 'react';
import type { CardState } from '../../../../game/types';
import { Card } from '../Card';
import { groupCardsForDisplay } from '../../../../utils/groupCardsForDisplay';
import * as S from './styles';

export interface CardZoneSection {
    title: string;
    cards: CardState[];
}

export interface CardZoneOverlayProps {
    title: string;
    subtitle?: string;
    /** Mode consultation : une seule pile (défausse / cimetière). */
    cards?: CardState[];
    /** Mode recherche : plusieurs sections (pioche + défausse). */
    sections?: CardZoneSection[];
    currentSiteIndex?: number;
    emptyMessage?: string;
    onClose: () => void;
    /**
     * Mode sélection : ids jouables. Les autres cartes restent visibles
     * (parcours papier) mais non cliquables.
     */
    selectableCardIds?: string[];
    onSelectCard?: (cardId: string) => void;
}

function cardKey(card: CardState, index: number): string {
    return `${card.instanceId || card.id}-${index}`;
}

function isSelectable(
    card: CardState,
    selectable: Set<string> | null
): boolean {
    if (!selectable) return false;
    return (
        selectable.has(card.instanceId || '') || selectable.has(card.id || '')
    );
}

export const CardZoneOverlay: React.FC<CardZoneOverlayProps> = ({
    title,
    subtitle,
    cards = [],
    sections,
    currentSiteIndex = 0,
    emptyMessage = 'Cette pile est vide.',
    onClose,
    selectableCardIds,
    onSelectCard,
}) => {
    const selectable = useMemo(() => {
        if (!selectableCardIds?.length) return null;
        return new Set(selectableCardIds.filter(Boolean));
    }, [selectableCardIds]);

    const isPickMode = Boolean(selectable && onSelectCard);

    const resolvedSections: CardZoneSection[] = useMemo(() => {
        if (sections?.length) return sections;
        return [{ title: '', cards }];
    }, [sections, cards]);

    const totalCards = resolvedSections.reduce(
        (sum, section) => sum + section.cards.length,
        0
    );

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
            : isPickMode
              ? `${totalCards} carte${totalCards > 1 ? 's' : ''} · choisissez une carte jouable`
              : totalCards === 1
                ? '1 carte · ordre : dernière en haut de pile en premier'
                : `${totalCards} cartes · ordre : dernière en haut de pile en premier`);

    const renderCard = (card: CardState, index: number) => {
        const pickable = isSelectable(card, selectable);
        const dimmed = Boolean(selectable) && !pickable;

        return (
            <S.GridCell
                key={cardKey(card, index)}
                $selectable={pickable}
                $dimmed={dimmed}
                onClick={(event) => {
                    if (!pickable || !onSelectCard) return;
                    event.stopPropagation();
                    onSelectCard(card.instanceId || card.id);
                }}
            >
                <Card
                    card={card}
                    size="md"
                    currentSiteIndex={currentSiteIndex}
                    isActionable={pickable}
                />
            </S.GridCell>
        );
    };

    const renderSectionCards = (sectionCards: CardState[]) => {
        if (sectionCards.length === 0) {
            return <S.EmptyState>{emptyMessage}</S.EmptyState>;
        }

        // Sélection : chaque exemplaire visible (parcours papier).
        // Consultation : regroupement des doublons.
        if (isPickMode) {
            return (
                <S.Grid>
                    {sectionCards.map((card, index) => renderCard(card, index))}
                </S.Grid>
            );
        }

        const grouped = groupCardsForDisplay(sectionCards);
        return (
            <S.Grid>
                {grouped.map(({ card, count }) => (
                    <S.GridCell key={card.instanceId || card.id}>
                        {count > 1 && (
                            <S.CountBadge
                                aria-label={`${count} exemplaires`}
                            >
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
        );
    };

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
                {totalCards === 0 ? (
                    <S.EmptyState>{emptyMessage}</S.EmptyState>
                ) : (
                    resolvedSections.map((section) => (
                        <S.Section key={section.title || 'main'}>
                            {section.title ? (
                                <S.SectionTitle>
                                    {section.title}
                                    <S.SectionCount>
                                        {section.cards.length}
                                    </S.SectionCount>
                                </S.SectionTitle>
                            ) : null}
                            {section.cards.length === 0 && section.title ? (
                                <S.EmptyState>Vide</S.EmptyState>
                            ) : (
                                renderSectionCards(section.cards)
                            )}
                        </S.Section>
                    ))
                )}
            </S.GridScroll>
        </S.Backdrop>
    );
};
