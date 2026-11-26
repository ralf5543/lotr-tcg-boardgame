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
import {
    createMatchWithSelectedDecks,
    MatchCreateError,
} from '../../decks/startMatch';
import { prepareBotMatch } from '../../decks/startBotMatch';
import { validateDeck } from '../../decks/validateDeck';
import { startingCompanionTwilightCost } from '../../decks/validateDeck';
import {
    type AddTarget,
    type CatalogCamp,
    type CatalogFilter,
    type CatalogFilterKey,
    campForAddTarget,
    cardOrThrow,
    catalogCards,
    collectFilterOptions,
    countIds,
    displaySubtitle,
    displayTitle,
    isSiteCard,
    labelForFilterValue,
    CATALOG_CAMP_OPTIONS,
} from '../../decks/cardMeta';
import { useHoverCard } from '../../contexts/HoverCardContext';
import { usePreferencesOptional } from '../../contexts/PreferencesContext';
import { useImageSrcFallback } from '../../utils/useImageSrcFallback';
import { Card } from '../GameBoard/components/Card';
import { SiteCard } from '../GameBoard/components/SiteCard';
import * as S from './styles';
import { useUiMessages } from '../../i18n/ui/useUiMessages';
import { formatDeckIssue } from '../../i18n/ui/deckValidation';

function goToBoard(matchId?: string, playerId: string = '0') {
    const url = new URL(window.location.href);
    url.searchParams.delete('bot');
    url.searchParams.set('view', 'play');
    if (matchId) {
        url.searchParams.set('match', matchId);
    } else if (!url.searchParams.has('match')) {
        url.searchParams.set('match', 'default');
    }
    url.searchParams.set('player', playerId);
    window.location.href = url.toString();
}

function goToBotBoard(matchId: string) {
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.set('match', matchId);
    url.searchParams.set('bot', '1');
    url.searchParams.set('player', '0');
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
    const db = useUiMessages().deckBuilder;
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
            title={hasMenu ? db.manageCopies : undefined}
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
                                {db.addCopy}
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
                                {db.removeCopy}
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
    const db = useUiMessages().deckBuilder;
    const uiLanguage = usePreferencesOptional()?.uiLanguage ?? 'fr';
    const makeFilter = (key: CatalogFilterKey, value: string): CatalogFilter => ({
        id: `${key}:${value}`,
        key,
        value,
        label: `${db.filterDim[key]} : ${labelForFilterValue(
            key,
            value,
            uiLanguage
        )}`,
    });
    const [decks, setDecks] = useState<DeckConfig[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<CatalogFilter[]>(() => [
        {
            id: 'camp:FREE_PEOPLE',
            key: 'camp',
            value: 'FREE_PEOPLE',
            label: '',
        },
    ]);
    const [filterDim, setFilterDim] = useState<CatalogFilterKey>('culture');
    const [filterValue, setFilterValue] = useState('');
    const [addTarget, setAddTarget] = useState<AddTarget>('freePeople');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [draft, setDraft] = useState<DeckConfig | null>(null);
    const [issuesOpen, setIssuesOpen] = useState(false);
    const [seatDecks, setSeatDecks] = useState(() => getSelectedDeckIds());
    const { hoveredData, setHoveredCard } = useHoverCard();

    useEffect(() => {
        setFilters((prev) =>
            prev.map((f) => ({
                ...f,
                label: `${db.filterDim[f.key]} : ${labelForFilterValue(
                    f.key,
                    f.value,
                    uiLanguage
                )}`,
            }))
        );
    }, [db, uiLanguage]);

    const refreshSeatDecks = () => setSeatDecks(getSelectedDeckIds());

    const deckNameById = (id: string) =>
        decks.find((d) => d.id === id)?.name || db.missingDeck;

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
                        : db.errors.loadDecks
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
        return collectFilterOptions(filterDim, uiLanguage);
    }, [filterDim, uiLanguage]);

    // Pas de useMemo sur `draft` entier : le Porteur change le coût Halbarad
    // et la validité ; on recalcule à chaque rendu sur les champs utiles.
    const validation = draft ? validateDeck(draft) : null;
    const draftRingBearer = draft
        ? cardOrThrow(draft.ringBearerId)
        : undefined;
    const startingCost = draft
        ? draft.startingCompanionIds.reduce((sum, id) => {
              const c = cardOrThrow(id);
              return (
                  sum +
                  (c
                      ? startingCompanionTwilightCost(c, draftRingBearer)
                      : 0)
              );
          }, 0)
        : 0;

    const catalog = useMemo(
        () => catalogCards({ query, filters }),
        [query, filters]
    );

    if (loading) {
        return (
            <S.Root data-deck-builder-root>
                <S.TopBar>
                    <S.Title>{db.title}</S.Title>
                </S.TopBar>
                <S.Main>
                    <S.IssueLine>{db.loading}</S.IssueLine>
                </S.Main>
            </S.Root>
        );
    }

    if (loadError) {
        return (
            <S.Root data-deck-builder-root>
                <S.TopBar>
                    <S.Title>{db.title}</S.Title>
                    <S.Button type="button" onClick={() => goToBoard()}>
                        {db.backToGame}
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
                    <S.Title>{db.title}</S.Title>
                    <S.Button
                        type="button"
                        onClick={async () => {
                            const created = await createEmptyDeck();
                            const list = await refreshList();
                            selectDeck(created.id, list);
                        }}
                    >
                        {db.newDeck}
                    </S.Button>
                    <S.Button type="button" onClick={() => goToBoard()}>
                        {db.backToGame}
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
                    : db.errors.save
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
                err instanceof Error ? err.message : db.errors.create
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
                err instanceof Error ? err.message : db.errors.duplicate
            );
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(db.deleteConfirm(draft.name))) return;
        setBusy(true);
        try {
            await deleteDeck(draft.id);
            const next = await refreshList();
            if (next[0]) selectDeck(next[0].id, next);
            else setDraft(null);
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : db.errors.delete
            );
        } finally {
            setBusy(false);
        }
    };

    const assignSeat = async (playerId: '0' | '1') => {
        if (!draft) return;
        setBusy(true);
        try {
            await saveDeck(draft);
            assignDeckToPlayer(playerId, draft.id);
            await refreshList();
            refreshSeatDecks();
        } catch (err) {
            window.alert(
                err instanceof Error
                    ? err.message
                    : db.errors.assign
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
            refreshSeatDecks();
            await refreshList();
            const joined = await createMatchWithSelectedDecks();
            goToBoard(joined.matchID, joined.playerID);
        } catch (err) {
            console.error(err);
            const message =
                err instanceof MatchCreateError && err.code === 'SERVER_FULL'
                    ? db.errors.serverFull
                    : err instanceof Error
                      ? err.message
                      : db.errors.startMatch;
            window.alert(message);
            setBusy(false);
        }
    };

    const playVsBot = async () => {
        setBusy(true);
        try {
            await saveDeck(draft);
            // Deck ouvert → siège 0 (toi) ; le BOT garde le deck déjà attribué au siège 1.
            assignDeckToPlayer('0', draft.id);
            refreshSeatDecks();
            await refreshList();
            const matchID = await prepareBotMatch();
            goToBotBoard(matchID);
        } catch (err) {
            console.error(err);
            window.alert(
                err instanceof Error
                    ? err.message
                    : db.errors.startBot
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
                <S.Title>{db.title}</S.Title>
                <S.Button
                    type="button"
                    $compact
                    disabled={busy}
                    onClick={handleNew}
                >
                    {db.newShort}
                </S.Button>
                <S.Button
                    type="button"
                    $compact
                    disabled={busy}
                    onClick={handleDuplicate}
                >
                    {db.duplicate}
                </S.Button>
                <S.Button
                    type="button"
                    $compact
                    disabled={busy}
                    onClick={handleDelete}
                >
                    {db.delete}
                </S.Button>
                <S.Button type="button" disabled={busy} onClick={handleSave}>
                    {db.save}
                </S.Button>
                <S.Button
                    type="button"
                    $primary
                    disabled={busy}
                    onClick={() => playAs('0')}
                >
                    {db.playAs0}
                </S.Button>
                <S.Button
                    type="button"
                    $primary
                    disabled={busy}
                    onClick={() => playAs('1')}
                >
                    {db.playAs1}
                </S.Button>
                <S.Button
                    type="button"
                    $primary
                    disabled={busy}
                    onClick={playVsBot}
                >
                    {db.playVsBot}
                </S.Button>
                <S.Button type="button" onClick={() => goToBoard()}>
                    {db.backToGame}
                </S.Button>
            </S.TopBar>

            <S.Body>
            <S.Side>
                <S.SideLabel>{db.decks}</S.SideLabel>
                <S.SeatSummary>
                    <S.SeatRow>
                        <S.SeatRole>{db.you}</S.SeatRole>
                        <S.SeatDeckName title={deckNameById(seatDecks['0'])}>
                            {deckNameById(seatDecks['0'])}
                        </S.SeatDeckName>
                    </S.SeatRow>
                    <S.SeatRow>
                        <S.SeatRole>{db.bot}</S.SeatRole>
                        <S.SeatDeckName title={deckNameById(seatDecks['1'])}>
                            {deckNameById(seatDecks['1'])}
                        </S.SeatDeckName>
                    </S.SeatRow>
                    <S.SeatActions>
                        <S.Button
                            type="button"
                            $compact
                            disabled={busy || !draft}
                            onClick={() => assignSeat('0')}
                        >
                            {db.assignYou}
                        </S.Button>
                        <S.Button
                            type="button"
                            $compact
                            disabled={busy || !draft}
                            onClick={() => assignSeat('1')}
                        >
                            {db.assignBot}
                        </S.Button>
                    </S.SeatActions>
                </S.SeatSummary>
                <S.DeckList>
                    {decks.map((d) => {
                        // Deck sélectionné : valider le brouillon live (Porteur…).
                        const source =
                            d.id === selectedId && draft ? draft : d;
                        const v = validateDeck(source);
                        const roles = [
                            d.id === seatDecks['0'] ? db.youLower : null,
                            d.id === seatDecks['1'] ? db.bot : null,
                        ].filter(Boolean);
                        return (
                            <S.DeckItem
                                key={d.id}
                                $active={d.id === selectedId}
                                onClick={() => selectDeck(d.id)}
                            >
                                <S.DeckName>{d.name}</S.DeckName>
                                <S.DeckMeta>
                                    {v.ok ? db.playable : db.incomplete} ·{' '}
                                    {db.deckMeta(
                                        source.freePeople.length +
                                            source.startingCompanionIds
                                                .length,
                                        source.shadow.length,
                                        source.siteIds.length
                                    )}
                                    {roles.length > 0
                                        ? ` · ${roles.join(' · ')}`
                                        : ''}
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
                        {validation?.ok ? db.playable : db.notPlayable}
                    </S.Badge>
                    <S.Stats>
                        {db.stats(
                            startingCost,
                            fpTotal,
                            draft.shadow.length,
                            draft.siteIds.length
                        )}
                    </S.Stats>
                </S.EditorHeader>

                <S.TargetBanner>
                    {db.nextCardTo}{' '}
                    <S.TargetBannerStrong>
                        {db.target[addTarget]}
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
                                {db.startingFellowship}
                            </S.ColumnTitle>
                            <S.ColumnAddHint
                                $active={
                                    addTarget === 'startingCompanionIds'
                                }
                            >
                                {db.addHint}
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
                                {db.ringBearer}
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
                                {db.oneRing}
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
                                {db.fellowshipCount(startingCost)}
                            </S.SlotLabel>
                            {[...startCounts.entries()].map(([id, n]) => {
                                const c = cardOrThrow(id);
                                if (!c) return null;
                                const unitCost = startingCompanionTwilightCost(
                                    c,
                                    rb
                                );
                                const printed = Number(c.twilightCost) || 0;
                                const costHint =
                                    unitCost !== printed
                                        ? db.printedCost(unitCost, printed)
                                        : String(unitCost);
                                return (
                                    <CardLine
                                        key={id}
                                        card={c}
                                        count={n}
                                        suffix={db.costSuffix(costHint)}
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
                                {db.freePeoples(draft.freePeople.length)}
                            </S.ColumnTitle>
                            <S.ColumnAddHint
                                $active={addTarget === 'freePeople'}
                            >
                                {db.addHint}
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
                                {db.shadow(draft.shadow.length)}
                            </S.ColumnTitle>
                            <S.ColumnAddHint
                                $active={addTarget === 'shadow'}
                            >
                                {db.addHint}
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
                                {db.adventure(draft.siteIds.length)}
                            </S.ColumnTitle>
                            <S.ColumnAddHint
                                $active={addTarget === 'siteIds'}
                            >
                                {db.addHint}
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
                        placeholder={db.searchPlaceholder}
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
                            aria-label={db.filterTypeAria}
                        >
                            {FILTER_KEYS.map((key) => (
                                <option key={key} value={key}>
                                    {db.filterDim[key]}
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
                            aria-label={db.filterValueAria}
                        >
                            <option value="">{db.addFilter}</option>
                            {valueOptions.map((value) => (
                                <option key={value} value={value}>
                                    {labelForFilterValue(
                                        filterDim,
                                        value,
                                        uiLanguage
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
                                title={db.removeFilter}
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
{db.catalogLimit}
                        </S.DeckMeta>
                    )}
                    {catalog.length === 0 && (
                        <S.DeckMeta style={{ padding: 8 }}>
                            {db.noCards}
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
                                ? db.problems(validation.errors.length)
                                : db.warnings(validation.warnings.length)}
                            {issuesOpen ? ' ▾' : ' ▸'}
                        </S.IssuesFab>
                        {issuesOpen && (
                            <S.IssuesToaster>
                                {validation.errors.map((e) => (
                                    <S.IssueLine
                                        key={e.code + e.message}
                                        $error
                                    >
                                        {formatDeckIssue(uiLanguage, e)}
                                    </S.IssueLine>
                                ))}
                                {validation.warnings.map((w) => (
                                    <S.IssueLine key={w.code + w.message}>
                                        {formatDeckIssue(uiLanguage, w)}
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
