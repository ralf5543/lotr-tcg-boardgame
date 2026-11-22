import React, { useEffect, useMemo } from 'react';
import type { CardState } from '../../../../game/types';
import { Card } from '../Card';
import { groupCardsForDisplay } from '../../../../utils/groupCardsForDisplay';
import { useUiMessages } from '../../../../i18n/ui/useUiMessages';
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
    /** Portal hors du plateau (pile empilée) : couvre tout le viewport. */
    viewportFixed?: boolean;
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
    emptyMessage,
    onClose,
    selectableCardIds,
    onSelectCard,
    viewportFixed = false,
}) => {
    const ui = useUiMessages();
    const resolvedEmpty = emptyMessage ?? ui.chrome.overlay.emptyPile;
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
            ? ui.chrome.overlay.noCards
            : isPickMode
              ? ui.chrome.overlay.cardsPick(totalCards)
              : ui.chrome.overlay.cardsOrder(totalCards));

    const renderSectionCards = (sectionCards: CardState[]) => {
        if (sectionCards.length === 0) {
            return <S.EmptyState>{resolvedEmpty}</S.EmptyState>;
        }

        const grouped = groupCardsForDisplay(sectionCards);
        return (
            <S.Grid>
                {grouped.map(({ card, count }) => {
                    // Pick : un exemplaire légal du groupe (unicité / coût…).
                    const pickCard =
                        isPickMode && selectable
                            ? sectionCards.find(
                                  (c) =>
                                      c.id === card.id &&
                                      isSelectable(c, selectable)
                              ) || card
                            : card;
                    const pickable =
                        isPickMode && isSelectable(pickCard, selectable);
                    const dimmed = Boolean(isPickMode && selectable && !pickable);

                    return (
                        <S.GridCell
                            key={card.instanceId || card.id}
                            $selectable={pickable}
                            $dimmed={dimmed}
                            data-cursor={pickable ? 'arrow' : undefined}
                            data-interactive={pickable ? 'true' : undefined}
                            onClick={(event) => {
                                if (!pickable || !onSelectCard) return;
                                event.stopPropagation();
                                onSelectCard(
                                    pickCard.instanceId || pickCard.id
                                );
                            }}
                        >
                            {count > 1 && (
                                <S.CountBadge
                                    aria-label={ui.chrome.overlay.copies(
                                        count
                                    )}
                                >
                                    ×{count}
                                </S.CountBadge>
                            )}
                            <Card
                                card={pickCard}
                                size="md"
                                currentSiteIndex={currentSiteIndex}
                                isActionable={pickable}
                            />
                        </S.GridCell>
                    );
                })}
            </S.Grid>
        );
    };

    return (
        <S.Backdrop
            $viewportFixed={viewportFixed}
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
                    aria-label={ui.chrome.common.close}
                    onClick={onClose}
                >
                    ×
                </S.CloseButton>
            </S.Header>

            <S.GridScroll onClick={(event) => event.stopPropagation()}>
                {totalCards === 0 ? (
                    <S.EmptyState>{resolvedEmpty}</S.EmptyState>
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
