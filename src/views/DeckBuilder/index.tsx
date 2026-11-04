import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardState, SiteCardState } from '../../game/types';
import type { DeckConfig } from '../../decks/types';
import {
    assignDeckToPlayer,
    createEmptyDeck,
    deleteDeck,
    duplicateDeck,
    getSelectedDeckIds,
    listDecks,
    saveDeck,
} from '../../decks/deckStorage';
import { createMatchWithSelectedDecks } from '../../decks/startMatch';
import { validateDeck } from '../../decks/validateDeck';
import { startingCompanionTwilightCost } from '../../decks/validateDeck';
import {
    type AddTarget,
    type CatalogFilter,
    type CatalogFilterKey,
    addTargetLabel,
    campForAddTarget,
    cardOrThrow,
    catalogCards,
    collectFilterOptions,
    countIds,
    displaySubtitle,
    displayTitle,
    filterDimensionLabel,
    isSiteCard,
    labelForFilterValue,
    CATALOG_CAMP_OPTIONS,
} from '../../decks/cardMeta';
import { useHoverCard } from '../../contexts/HoverCardContext';
import { useImageSrcFallback } from '../../utils/useImageSrcFallback';
import { Card } from '../GameBoard/components/Card';
import { SiteCard } from '../GameBoard/components/SiteCard';
import * as S from './styles';

function goToBoard(matchId?: string) {
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    if (matchId) url.searchParams.set('match', matchId);
    window.location.href = url.toString();
}

function cloneDraft(d: DeckConfig): DeckConfig {
    return {
        ...d,
        startingCompanionIds: [...d.startingCompanionIds],
        freePeople: [...d.freePeople],
        shadow: [...d.shadow],
        siteIds: [...d.siteIds],
    };
}

function makeFilter(
    key: CatalogFilterKey,
    value: string
): CatalogFilter {
    return {
        id: `${key}:${value}`,
        key,
        value,
        label: `${filterDimensionLabel(key)} : ${labelForFilterValue(key, value)}`,
    };
}

function toSiteForZoom(card: CardState): SiteCardState {
    return {
        id: card.id,
        name: displayTitle(card),
        twilightCost: Number(card.twilightCost) || 0,
        gameText:
            card.i18n?.fr?.gameText ||
            card.i18n?.en?.gameText ||
            card.gameText ||
            '',
        ownerId: '0',
        imageUrl: card.imageUrl,
        keywords: card.keywords,
        // getCardText lit i18n — présent à l’exécution.
        ...(card.i18n ? { i18n: card.i18n } : {}),
    } as SiteCardState;
}

function CardLine({
    card,
    count,
    onClick,
    onAddCopy,
    onRemoveCopy,
    canAddCopy = true,
    suffix,
}: {
    card: CardState;
    count?: number;
    onClick?: () => void;
    /** Menu : ajouter / retirer un exemplaire (listes du deck). */
    onAddCopy?: () => void;
    onRemoveCopy?: () => void;
    canAddCopy?: boolean;
    suffix?: string;
}) {
    const { setHoveredCard } = useHoverCard();
    const { src, onError } = useImageSrcFallback(
        card.imageUrl,
        'interface/lotr_cardback.webp'
    );
    const sub = displaySubtitle(card);
    const site = isSiteCard(card);
    const hasMenu = Boolean(onAddCopy || onRemoveCopy);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{
        left: number;
        top: number;
        host: Element;
    } | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!menuOpen || !wrapRef.current) {
            setMenuPos(null);
            return;
        }
        const place = () => {
            const wrap = wrapRef.current!;
            const root = wrap.closest('[data-deck-builder-root]');
            const scaled = root?.parentElement;
            if (!root || !scaled) {
                setMenuPos(null);
                return;
            }
            // Coords dans l’espace design du ScaledView (fixed y est relatif
            // à cause du transform), pour garder la même échelle / typo.
            const wr = wrap.getBoundingClientRect();
            const sr = scaled.getBoundingClientRect();
            const scale = sr.width / scaled.offsetWidth;
            if (scale <= 0) {
                setMenuPos(null);
                return;
            }
            setMenuPos({
                left: (wr.left - sr.left) / scale + 8,
                top: (wr.top - sr.top) / scale,
                host: root,
            });
        };
        place();
        // Scroll / resize : on ferme (évite un menu orphelin).
        const dismiss = () => setMenuOpen(false);
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        return () => {
            window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
        };
    }, [menuOpen]);

    useEffect(() => {
        if (!menuOpen) return;
        const onPointer = (e: MouseEvent) => {
            const t = e.target as Node;
            if (
                wrapRef.current?.contains(t) ||
                menuRef.current?.contains(t)
            ) {
                return;
            }
            setMenuOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const label = `${displayTitle(card)}${sub ? ` — ${sub}` : ''}${suffix ? ` ${suffix}` : ''}`;

    const row = (
        <S.CardRow
            type="button"
            $open={menuOpen}
            onClick={() => {
                if (hasMenu) setMenuOpen((o) => !o);
                else onClick?.();
            }}
            onMouseEnter={() =>
                setHoveredCard(card, site ? 'landscape' : 'portrait')
            }
            onMouseLeave={() => {
                if (!menuOpen) setHoveredCard(null);
            }}
            title={hasMenu ? 'Gérer les exemplaires' : undefined}
        >
            {src ? (
                site ? (
                    <S.ThumbSiteWrap>
                        <S.ThumbSite src={src} alt="" onError={onError} />
                    </S.ThumbSiteWrap>
                ) : (
                    <S.Thumb src={src} alt="" onError={onError} />
                )
            ) : (
                <S.Thumb as="div" />
            )}
            {typeof count === 'number' && (
                <S.CardCount>{count}×</S.CardCount>
            )}
            <S.CardText title={label}>
                {displayTitle(card)}
                {sub ? ` — ${sub}` : ''}
                {suffix ? ` ${suffix}` : ''}
            </S.CardText>
        </S.CardRow>
    );

    if (!hasMenu) return row;

    return (
        <S.CardLineWrap ref={wrapRef}>
            {row}
            {menuOpen &&
                menuPos &&
                createPortal(
                    <S.CardMenu
                        ref={menuRef}
                        role="menu"
                        $left={menuPos.left}
                        $top={menuPos.top}
                    >
                        {onAddCopy && (
                            <S.CardMenuBtn
                                type="button"
                                role="menuitem"
                                disabled={!canAddCopy}
                                onClick={() => {
                                    onAddCopy();
                                    setMenuOpen(false);
                                }}
                            >
                                + Ajouter un exemplaire
                            </S.CardMenuBtn>
                        )}
                        {onRemoveCopy && (
                            <S.CardMenuBtn
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    onRemoveCopy();
                                    setMenuOpen(false);
                                }}
                            >
                                − Retirer un exemplaire
                            </S.CardMenuBtn>
                        )}
                    </S.CardMenu>,
                    menuPos.host
                )}
        </S.CardLineWrap>
    );
}

const FILTER_KEYS: CatalogFilterKey[] = [
    'camp',
    'type',
    'culture',
    'race',
    'subtype',
    'keyword',
];

export const DeckBuilder: React.FC = () => {
    const [decks, setDecks] = useState<DeckConfig[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<CatalogFilter[]>([
        makeFilter('camp', 'FREE_PEOPLE'),
    ]);
    const [filterDim, setFilterDim] = useState<CatalogFilterKey>('culture');
    const [filterValue, setFilterValue] = useState('');
    const [addTarget, setAddTarget] = useState<AddTarget>('freePeople');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [draft, setDraft] = useState<DeckConfig | null>(null);
    const [issuesOpen, setIssuesOpen] = useState(false);
    const { hoveredData, setHoveredCard } = useHoverCard();

    const refreshList = async (): Promise<DeckConfig[]> => {
        const list = await listDecks();
        setDecks(list);
        return list;
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await listDecks();
                if (cancelled) return;
                setDecks(list);
                const preferred =
                    getSelectedDeckIds()['0'] || list[0]?.id || '';
                const initial =
                    list.find((d) => d.id === preferred) || list[0] || null;
                setSelectedId(initial?.id || '');
                setDraft(initial ? cloneDraft(initial) : null);
                setLoadError(null);
            } catch (err) {
                if (cancelled) return;
                setLoadError(
                    err instanceof Error
                        ? err.message
                        : 'Impossible de charger les decks.'
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const selectDeck = (id: string, list = decks) => {
        const d = list.find((x) => x.id === id);
        if (!d) return;
        setSelectedId(id);
        setDraft(cloneDraft(d));
        setHoveredCard(null);
    };

    const chooseAddTarget = (target: AddTarget) => {
        setAddTarget(target);
        const camp = campForAddTarget(target);
        setFilters((prev) => {
            const withoutCamp = prev.filter((f) => f.key !== 'camp');
            return [makeFilter('camp', camp), ...withoutCamp];
        });
    };

    const addFilter = (key: CatalogFilterKey, value: string) => {
        if (!value) return;
        const next = makeFilter(key, value);
        setFilters((prev) => {
            const withoutSameKey =
                key === 'camp' ? prev.filter((f) => f.key !== 'camp') : prev;
            if (withoutSameKey.some((f) => f.id === next.id)) return withoutSameKey;
            return [...withoutSameKey, next];
        });
        setFilterValue('');
    };

    const removeFilter = (id: string) => {
        setFilters((prev) => prev.filter((f) => f.id !== id));
    };

    const valueOptions = useMemo(() => {
        if (filterDim === 'camp') {
            return CATALOG_CAMP_OPTIONS.map((o) => o.value);
        }
        return collectFilterOptions(filterDim);
    }, [filterDim]);

    const validation = useMemo(
        () => (draft ? validateDeck(draft) : null),
        [draft]
    );

    const startingCost = useMemo(() => {
        if (!draft) return 0;
        return draft.startingCompanionIds.reduce((sum, id) => {
            const c = cardOrThrow(id);
            return sum + (c ? startingCompanionTwilightCost(c) : 0);
        }, 0);
    }, [draft]);

    const catalog = useMemo(
        () => catalogCards({ query, filters }),
        [query, filters]
    );

    if (loading) {
        return (
            <S.Root data-deck-builder-root>
                <S.TopBar>
                    <S.Title>Création de deck</S.Title>
                </S.TopBar>
                <S.Main>
                    <S.IssueLine>Chargement des decks…</S.IssueLine>
                </S.Main>
            </S.Root>
        );
    }

    if (loadError) {
        return (
            <S.Root data-deck-builder-root>
                <S.TopBar>
                    <S.Title>Création de deck</S.Title>
                    <S.Button type="button" onClick={() => goToBoard()}>
                        Retour partie
                    </S.Button>
                </S.TopBar>
                <S.Main>
                    <S.IssueLine $error>{loadError}</S.IssueLine>
                </S.Main>
            </S.Root>
        );
    }

    if (!draft) {
        return (
            <S.Root data-deck-builder-root>
                <S.TopBar>
                    <S.Title>Création de deck</S.Title>
                    <S.Button
                        type="button"
                        onClick={async () => {
                            const created = await createEmptyDeck();
                            const list = await refreshList();
                            selectDeck(created.id, list);
                        }}
                    >
                        Nouveau deck
                    </S.Button>
                    <S.Button type="button" onClick={() => goToBoard()}>
                        Retour partie
                    </S.Button>
                </S.TopBar>
            </S.Root>
        );
    }

    const mutate = (next: DeckConfig) => setDraft(next);

    const addCard = (card: CardState) => {
        const id = card.id;
        if (addTarget === 'ringBearerId') {
            mutate({ ...draft, ringBearerId: id });
            return;
        }
        if (addTarget === 'oneRingId') {
            mutate({ ...draft, oneRingId: id });
            return;
        }
        if (addTarget === 'siteIds') {
            if (draft.siteIds.includes(id)) return;
            if (draft.siteIds.length >= 9) return;
            mutate({ ...draft, siteIds: [...draft.siteIds, id] });
            return;
        }
        if (addTarget === 'startingCompanionIds') {
            mutate({
                ...draft,
                startingCompanionIds: [...draft.startingCompanionIds, id],
            });
            return;
        }
        if (addTarget === 'freePeople') {
            mutate({ ...draft, freePeople: [...draft.freePeople, id] });
            return;
        }
        mutate({ ...draft, shadow: [...draft.shadow, id] });
    };

    const removeFromList = (
        key: 'freePeople' | 'shadow' | 'siteIds' | 'startingCompanionIds',
        id: string
    ) => {
        const list = [...draft[key]];
        const index = list.lastIndexOf(id);
        if (index < 0) return;
        list.splice(index, 1);
        mutate({ ...draft, [key]: list });
    };

    const addCopyToList = (
        key: 'freePeople' | 'shadow' | 'siteIds' | 'startingCompanionIds',
        id: string
    ) => {
        if (key === 'siteIds') {
            if (draft.siteIds.includes(id) || draft.siteIds.length >= 9) return;
        } else {
            const copies = draft[key].filter((x) => x === id).length;
            if (copies >= 4) return;
        }
        mutate({ ...draft, [key]: [...draft[key], id] });
    };

    const handleSave = async () => {
        setBusy(true);
        try {
            await saveDeck(draft);
            await refreshList();
        } catch (err) {
            window.alert(
                err instanceof Error
                    ? err.message
                    : 'Sauvegarde impossible (Vite allumé ?).'
            );
        } finally {
            setBusy(false);
        }
    };

    const handleNew = async () => {
        setBusy(true);
        try {
            const created = await createEmptyDeck();
            const list = await refreshList();
            selectDeck(created.id, list);
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : 'Création impossible.'
            );
        } finally {
            setBusy(false);
        }
    };

    const handleDuplicate = async () => {
        setBusy(true);
        try {
            const copy = await duplicateDeck(draft.id);
            const list = await refreshList();
            if (copy) selectDeck(copy.id, list);
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : 'Duplication impossible.'
            );
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Supprimer « ${draft.name} » ?`)) return;
        setBusy(true);
        try {
            await deleteDeck(draft.id);
            const next = await refreshList();
            if (next[0]) selectDeck(next[0].id, next);
            else setDraft(null);
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : 'Suppression impossible.'
            );
        } finally {
            setBusy(false);
        }
    };

    const playAs = async (playerId: '0' | '1') => {
        setBusy(true);
        try {
            await saveDeck(draft);
            assignDeckToPlayer(playerId, draft.id);
            await refreshList();
            const matchID = await createMatchWithSelectedDecks();
            goToBoard(matchID);
        } catch (err) {
            console.error(err);
            window.alert(
                err instanceof Error
                    ? err.message
                    : 'Impossible de créer la partie (serveur allumé ?).'
            );
            setBusy(false);
        }
    };

    const fpCounts = countIds(draft.freePeople);
    const shadowCounts = countIds(draft.shadow);
    const startCounts = countIds(draft.startingCompanionIds);

    const rb = cardOrThrow(draft.ringBearerId);
    const ring = cardOrThrow(draft.oneRingId);
    const fpTotal =
        draft.freePeople.length + draft.startingCompanionIds.length;

    return (
        <S.Root data-deck-builder-root>
            <S.TopBar>
                <S.Title>Création de deck</S.Title>
                <S.Button
                    type="button"
                    $compact
                    disabled={busy}
                    onClick={handleNew}
                >
                    Nouveau
                </S.Button>
                <S.Button
                    type="button"
                    $compact
                    disabled={busy}
                    onClick={handleDuplicate}
                >
                    Dupliquer
                </S.Button>
                <S.Button
                    type="button"
                    $compact
                    disabled={busy}
                    onClick={handleDelete}
                >
                    Supprimer
                </S.Button>
                <S.Button type="button" disabled={busy} onClick={handleSave}>
                    Sauver
                </S.Button>
                <S.Button
                    type="button"
                    $primary
                    disabled={busy}
                    onClick={() => playAs('0')}
                >
                    Jouer (joueur 0)
                </S.Button>
                <S.Button
                    type="button"
                    $primary
                    disabled={busy}
                    onClick={() => playAs('1')}
                >
                    Jouer (joueur 1)
                </S.Button>
                <S.Button type="button" onClick={() => goToBoard()}>
                    Retour partie
                </S.Button>
            </S.TopBar>

            <S.Body>
            <S.Side>
                <S.SideLabel>Decks</S.SideLabel>
                <S.DeckList>
                    {decks.map((d) => {
                        const v = validateDeck(d);
                        return (
                            <S.DeckItem
                                key={d.id}
                                $active={d.id === selectedId}
                                onClick={() => selectDeck(d.id)}
                            >
                                <S.DeckName>{d.name}</S.DeckName>
                                <S.DeckMeta>
                                    {v.ok ? 'Jouable' : 'Incomplet'} ·{' '}
                                    {d.freePeople.length +
                                        d.startingCompanionIds.length}
                                    /{d.shadow.length} · {d.siteIds.length}{' '}
                                    sites
                                </S.DeckMeta>
                            </S.DeckItem>
                        );
                    })}
                </S.DeckList>
            </S.Side>

            <S.Main>
                <S.EditorHeader>
                    <S.NameInput
                        value={draft.name}
                        onChange={(e) =>
                            mutate({ ...draft, name: e.target.value })
                        }
                    />
                    <S.Badge $ok={Boolean(validation?.ok)}>
                        {validation?.ok ? 'Jouable' : 'Non jouable'}
                    </S.Badge>
                    <S.Stats>
                        Départ {startingCost}/4 · Peuples Libres {fpTotal} ·
                        Ombre {draft.shadow.length} · Aventure{' '}
                        {draft.siteIds.length}/9
                    </S.Stats>
                </S.EditorHeader>

                <S.TargetBanner>
                    Prochaine carte du catalogue →{' '}
                    <S.TargetBannerStrong>
                        {addTargetLabel(addTarget)}
                    </S.TargetBannerStrong>
                </S.TargetBanner>

                <S.Columns>
                    <S.Column
                        $active={
                            addTarget === 'startingCompanionIds' ||
                            addTarget === 'ringBearerId' ||
                            addTarget === 'oneRingId'
                        }
                    >
                        <S.ColumnHeader
                            type="button"
                            $active={
                                addTarget === 'startingCompanionIds'
                            }
                            onClick={() =>
                                chooseAddTarget('startingCompanionIds')
                            }
                        >
                            <S.ColumnTitle>
                                Compagnie de départ
                            </S.ColumnTitle>
                            <S.ColumnAddHint
                                $active={
                                    addTarget === 'startingCompanionIds'
                                }
                            >
                                + Ajouter
                            </S.ColumnAddHint>
                        </S.ColumnHeader>
                        <S.SlotBlock>
                            <S.SlotLabel
                                type="button"
                                $active={addTarget === 'ringBearerId'}
                                onClick={() =>
                                    chooseAddTarget('ringBearerId')
                                }
                            >
                                Porteur
                            </S.SlotLabel>
                            {rb ? (
                                <CardLine
                                    card={rb}
                                    onClick={() =>
                                        chooseAddTarget('ringBearerId')
                                    }
                                />
                            ) : null}
                            <S.SlotLabel
                                type="button"
                                $active={addTarget === 'oneRingId'}
                                onClick={() =>
                                    chooseAddTarget('oneRingId')
                                }
                            >
                                Anneau Unique
                            </S.SlotLabel>
                            {ring ? (
                                <CardLine
                                    card={ring}
                                    onClick={() =>
                                        chooseAddTarget('oneRingId')
                                    }
                                />
                            ) : null}
                            <S.SlotLabel
                                type="button"
                                $active={
                                    addTarget === 'startingCompanionIds'
                                }
                                onClick={() =>
                                    chooseAddTarget('startingCompanionIds')
                                }
                            >
                                Compagnie ({startingCost}/4)
                            </S.SlotLabel>
                            {[...startCounts.entries()].map(([id, n]) => {
                                const c = cardOrThrow(id);
                                if (!c) return null;
                                return (
                                    <CardLine
                                        key={id}
                                        card={c}
                                        count={n}
                                        canAddCopy={n < 4}
                                        onAddCopy={() =>
                                            addCopyToList(
                                                'startingCompanionIds',
                                                id
                                            )
                                        }
                                        onRemoveCopy={() =>
                                            removeFromList(
                                                'startingCompanionIds',
                                                id
                                            )
                                        }
                                    />
                                );
                            })}
                        </S.SlotBlock>
                    </S.Column>

                    <S.Column $active={addTarget === 'freePeople'}>
                        <S.ColumnHeader
                            type="button"
                            $active={addTarget === 'freePeople'}
                            onClick={() => chooseAddTarget('freePeople')}
                        >
                            <S.ColumnTitle>
                                Peuples Libres ({draft.freePeople.length})
                            </S.ColumnTitle>
                            <S.ColumnAddHint
                                $active={addTarget === 'freePeople'}
                            >
                                + Ajouter
                            </S.ColumnAddHint>
                        </S.ColumnHeader>
                        <S.CardList>
                            {[...fpCounts.entries()].map(([id, n]) => {
                                const c = cardOrThrow(id);
                                if (!c) return null;
                                return (
                                    <CardLine
                                        key={id}
                                        card={c}
                                        count={n}
                                        canAddCopy={n < 4}
                                        onAddCopy={() =>
                                            addCopyToList('freePeople', id)
                                        }
                                        onRemoveCopy={() =>
                                            removeFromList('freePeople', id)
                                        }
                                    />
                                );
                            })}
                        </S.CardList>
                    </S.Column>

                    <S.Column $active={addTarget === 'shadow'}>
                        <S.ColumnHeader
                            type="button"
                            $active={addTarget === 'shadow'}
                            onClick={() => chooseAddTarget('shadow')}
                        >
                            <S.ColumnTitle>
                                Ombre ({draft.shadow.length})
                            </S.ColumnTitle>
                            <S.ColumnAddHint
                                $active={addTarget === 'shadow'}
                            >
                                + Ajouter
                            </S.ColumnAddHint>
                        </S.ColumnHeader>
                        <S.CardList>
                            {[...shadowCounts.entries()].map(([id, n]) => {
                                const c = cardOrThrow(id);
                                if (!c) return null;
                                return (
                                    <CardLine
                                        key={id}
                                        card={c}
                                        count={n}
                                        canAddCopy={n < 4}
                                        onAddCopy={() =>
                                            addCopyToList('shadow', id)
                                        }
                                        onRemoveCopy={() =>
                                            removeFromList('shadow', id)
                                        }
                                    />
                                );
                            })}
                        </S.CardList>
                    </S.Column>

                    <S.Column $compact $active={addTarget === 'siteIds'}>
                        <S.ColumnHeader
                            type="button"
                            $active={addTarget === 'siteIds'}
                            onClick={() => chooseAddTarget('siteIds')}
                        >
                            <S.ColumnTitle>
                                Aventure ({draft.siteIds.length}/9)
                            </S.ColumnTitle>
                            <S.ColumnAddHint
                                $active={addTarget === 'siteIds'}
                            >
                                + Ajouter
                            </S.ColumnAddHint>
                        </S.ColumnHeader>
                        <S.CardList $natural>
                            {draft.siteIds.map((id) => {
                                const c = cardOrThrow(id);
                                if (!c) return null;
                                return (
                                    <CardLine
                                        key={id}
                                        card={c}
                                        suffix={`· ${c.twilightCost ?? 0}`}
                                        onRemoveCopy={() =>
                                            removeFromList('siteIds', id)
                                        }
                                    />
                                );
                            })}
                        </S.CardList>
                    </S.Column>
                </S.Columns>
            </S.Main>

            <S.Catalog>
                <S.CatalogFilters>
                    <S.SearchInput
                        placeholder="Rechercher une carte…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <S.FilterRow>
                        <S.Select
                            value={filterDim}
                            onChange={(e) => {
                                setFilterDim(
                                    e.target.value as CatalogFilterKey
                                );
                                setFilterValue('');
                            }}
                            aria-label="Type de filtre"
                        >
                            {FILTER_KEYS.map((key) => (
                                <option key={key} value={key}>
                                    {filterDimensionLabel(key)}
                                </option>
                            ))}
                        </S.Select>
                        <S.Select
                            value={filterValue}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFilterValue(value);
                                if (value) addFilter(filterDim, value);
                            }}
                            aria-label="Valeur du filtre"
                        >
                            <option value="">Ajouter…</option>
                            {valueOptions.map((value) => (
                                <option key={value} value={value}>
                                    {filterDim === 'camp'
                                        ? CATALOG_CAMP_OPTIONS.find(
                                              (o) => o.value === value
                                          )?.label || value
                                        : labelForFilterValue(
                                              filterDim,
                                              value
                                          )}
                                </option>
                            ))}
                        </S.Select>
                    </S.FilterRow>
                    <S.ChipRow>
                        {filters.map((f) => (
                            <S.Chip
                                key={f.id}
                                type="button"
                                title="Retirer ce filtre"
                                onClick={() => removeFilter(f.id)}
                            >
                                {f.label} ×
                            </S.Chip>
                        ))}
                    </S.ChipRow>
                </S.CatalogFilters>
                <S.CatalogList>
                    {catalog.slice(0, 250).map((card) => (
                        <CardLine
                            key={card.id}
                            card={card}
                            onClick={() => addCard(card)}
                        />
                    ))}
                    {catalog.length > 250 && (
                        <S.DeckMeta style={{ padding: 8 }}>
                            Affichage limité à 250 — affine la recherche ou
                            les filtres.
                        </S.DeckMeta>
                    )}
                    {catalog.length === 0 && (
                        <S.DeckMeta style={{ padding: 8 }}>
                            Aucune carte pour ces filtres.
                        </S.DeckMeta>
                    )}
                </S.CatalogList>
            </S.Catalog>
            </S.Body>

            {validation &&
                (validation.errors.length > 0 ||
                    validation.warnings.length > 0) && (
                    <>
                        <S.IssuesFab
                            type="button"
                            $error={validation.errors.length > 0}
                            onClick={() => setIssuesOpen((o) => !o)}
                        >
                            {validation.errors.length > 0
                                ? `${validation.errors.length} problème${validation.errors.length > 1 ? 's' : ''}`
                                : `${validation.warnings.length} avertissement${validation.warnings.length > 1 ? 's' : ''}`}
                            {issuesOpen ? ' ▾' : ' ▸'}
                        </S.IssuesFab>
                        {issuesOpen && (
                            <S.IssuesToaster>
                                {validation.errors.map((e) => (
                                    <S.IssueLine
                                        key={e.code + e.message}
                                        $error
                                    >
                                        {e.message}
                                    </S.IssueLine>
                                ))}
                                {validation.warnings.map((w) => (
                                    <S.IssueLine key={w.code + w.message}>
                                        {w.message}
                                    </S.IssueLine>
                                ))}
                            </S.IssuesToaster>
                        )}
                    </>
                )}

            {hoveredData && (
                <S.HoveredCardsZone $orientation={hoveredData.orientation}>
                    {hoveredData.orientation === 'landscape' ? (
                        <SiteCard
                            site={toSiteForZoom(
                                hoveredData.card as CardState
                            )}
                            size="lg"
                        />
                    ) : (
                        <Card
                            card={{
                                ...(hoveredData.card as CardState),
                                instanceId:
                                    (hoveredData.card as CardState)
                                        .instanceId ||
                                    (hoveredData.card as CardState).id,
                            }}
                            size="lg"
                        />
                    )}
                </S.HoveredCardsZone>
            )}
        </S.Root>
    );
};
