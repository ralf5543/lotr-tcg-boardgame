import styled, { css, keyframes } from 'styled-components';

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

/** Barres de défilement discrètes (Firefox + Chromium). */
const niceScrollbar = css`
    scrollbar-width: thin;
    scrollbar-color: rgba(212, 184, 134, 0.5) rgba(255, 255, 255, 0.04);
    scrollbar-gutter: stable;

    &::-webkit-scrollbar {
        width: 9px;
        height: 9px;
    }

    &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 999px;
        margin-block: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: linear-gradient(
            180deg,
            rgba(226, 192, 68, 0.65),
            rgba(212, 184, 134, 0.4)
        );
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: padding-box;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: rgba(226, 192, 68, 0.85);
        border: 2px solid transparent;
        background-clip: padding-box;
    }

    &::-webkit-scrollbar-corner {
        background: transparent;
    }
`;

export const Root = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #12141a;
    color: #f3ead7;
    font-family: 'DecipherRegular', Georgia, serif;
    font-size: 18px;
`;

export const TopBar = styled.header`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 64px;
    padding: 0 16px;
    border-bottom: 1px solid rgba(212, 184, 134, 0.25);
    background: #0d0e12;
`;

/** Side | Main | Catalog — Main absorbe le reste (dans le ScaledView 1920). */
export const Body = styled.div`
    display: flex;
    flex: 1;
    min-height: 0;
    min-width: 0;
`;

export const Title = styled.h1`
    margin: 0;
    margin-right: auto;
    font-family: 'DecipherTitle', Georgia, serif;
    font-size: 2rem;
    font-weight: 600;
    letter-spacing: 0.03em;
`;

export const Side = styled.aside`
    display: flex;
    flex-direction: column;
    width: 280px;
    flex-shrink: 0;
    min-height: 0;
    overflow: hidden;
    border-right: 1px solid rgba(212, 184, 134, 0.2);
    background: #0f1116;
`;

export const SideLabel = styled.div`
    padding: 12px 12px 6px;
    font-size: 1rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.55;
`;

/** Qui joue quel deck (humain siège 0 / BOT siège 1). */
export const SeatSummary = styled.div`
    padding: 0 12px 10px;
    font-size: 1.05rem;
    line-height: 1.45;
    opacity: 0.85;
`;

export const SeatRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
`;

export const SeatRole = styled.span`
    flex-shrink: 0;
    width: 2.6em;
    font-size: 0.95rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.55;
`;

export const SeatDeckName = styled.span`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const SeatActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
`;

export const DeckList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 8px;
    overflow: auto;
    min-height: 0;
    flex: 1;
    ${niceScrollbar}
`;

export const DeckItem = styled.li<{ $active?: boolean }>`
    padding: 12px 14px;
    margin-bottom: 4px;
    border-radius: 3px;
    cursor: pointer;
    border: 1px solid
        ${(p) =>
            p.$active ? 'rgba(212, 184, 134, 0.55)' : 'transparent'};
    background: ${(p) =>
        p.$active ? 'rgba(212, 184, 134, 0.12)' : 'transparent'};

    &:hover {
        background: rgba(212, 184, 134, 0.08);
    }
`;

export const DeckName = styled.div`
    font-weight: 600;
    font-size: 1.35rem;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const DeckMeta = styled.div`
    margin-top: 4px;
    font-size: 1.05rem;
    opacity: 0.7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

/** Overlay zoom : ancré à gauche (liste des decks), pas sur les listes de cartes. */
export const HoveredCardsZone = styled.div<{
    $orientation?: 'portrait' | 'landscape';
}>`
    position: fixed;
    inset-block-start: 50%;
    transform: translateY(-50%);
    inset-inline-start: 16px;
    z-index: 9999;
    pointer-events: none;

    width: ${(p) => (p.$orientation === 'landscape' ? '420px' : 'auto')};
    aspect-ratio: ${(p) =>
        p.$orientation === 'landscape' ? '1.39 / 1' : '1 / 1.39'};

    animation: ${fadeIn} 0.15s ease-out;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.8);
    border-radius: 8px;
`;

export const Main = styled.main`
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    flex: 1;
    min-width: 0;
    min-height: 0;
`;

export const EditorHeader = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(212, 184, 134, 0.15);
`;

export const NameInput = styled.input`
    flex: 1 1 260px;
    min-width: 0;
    max-width: 480px;
    padding: 10px 12px;
    border: 1px solid rgba(212, 184, 134, 0.35);
    border-radius: 3px;
    background: #1a1d24;
    color: #f3ead7;
    font: inherit;
    font-size: 1.35rem;
`;

export const Badge = styled.span<{ $ok?: boolean }>`
    padding: 8px 12px;
    border-radius: 3px;
    font-size: 1.15rem;
    font-weight: 600;
    border: 1px solid
        ${(p) =>
            p.$ok ? 'rgba(110, 180, 120, 0.55)' : 'rgba(220, 120, 100, 0.55)'};
    color: ${(p) => (p.$ok ? '#b8e0be' : '#f0c4ba')};
    background: ${(p) =>
        p.$ok ? 'rgba(110, 180, 120, 0.12)' : 'rgba(220, 120, 100, 0.12)'};
`;

export const Stats = styled.span`
    opacity: 0.75;
    font-size: 1.2rem;
`;

export const TargetBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(212, 184, 134, 0.2);
    background: rgba(212, 184, 134, 0.1);
    font-size: 1.35rem;
`;

export const TargetBannerStrong = styled.strong`
    color: #f0d9a0;
    font-weight: 700;
`;

export const Columns = styled.div`
    display: flex;
    gap: 6px;
    padding: 8px;
    min-height: 0;
    overflow: hidden;
`;

export const Column = styled.section<{
    $active?: boolean;
    $compact?: boolean;
}>`
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    width: 100%;
    ${(p) =>
        p.$compact
            ? `
        align-self: start;
        height: fit-content;
        max-height: 100%;
        overflow: auto;
      `
            : `
        height: 100%;
        overflow: hidden;
      `}
    border: 1px solid
        ${(p) =>
            p.$active
                ? 'rgba(226, 192, 68, 0.75)'
                : 'rgba(212, 184, 134, 0.2)'};
    border-radius: 4px;
    background: ${(p) =>
        p.$active ? 'rgba(226, 192, 68, 0.06)' : 'rgba(18, 20, 26, 0.9)'};
    box-shadow: ${(p) =>
        p.$active ? 'inset 0 0 0 1px rgba(226, 192, 68, 0.25)' : 'none'};
    ${niceScrollbar}
`;

export const ColumnHeader = styled.button<{ $active?: boolean }>`
    appearance: none;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 10px 12px;
    border: none;
    border-bottom: 1px solid rgba(212, 184, 134, 0.15);
    background: ${(p) =>
        p.$active ? 'rgba(226, 192, 68, 0.18)' : 'transparent'};
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
        background: rgba(212, 184, 134, 0.12);
    }
`;

export const ColumnTitle = styled.span`
    font-family: 'DecipherTitle', Georgia, serif;
    font-size: 1.35rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
`;

export const ColumnAddHint = styled.span<{ $active?: boolean }>`
    flex-shrink: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: ${(p) => (p.$active ? '#f0d9a0' : 'rgba(243, 234, 215, 0.55)')};
`;

export const SlotBlock = styled.div`
    padding: 8px 10px;
    border-bottom: 1px solid rgba(212, 184, 134, 0.12);
    font-size: 1.2rem;
`;

export const SlotLabel = styled.button<{ $active?: boolean }>`
    appearance: none;
    display: block;
    width: 100%;
    margin: 0 0 4px;
    padding: 2px 0;
    border: none;
    background: transparent;
    opacity: ${(p) => (p.$active ? 1 : 0.7)};
    color: ${(p) => (p.$active ? '#f0d9a0' : 'inherit')};
    font: inherit;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: left;
    cursor: pointer;

    &:hover {
        opacity: 1;
        color: #f0d9a0;
    }
`;

export const CardLineWrap = styled.div`
    position: relative;
    width: 100%;
    margin: 0 0 2px;
`;

export const CardRow = styled.button<{ $open?: boolean }>`
    display: flex;
    width: 100%;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    margin: 0;
    border: none;
    border-radius: 2px;
    background: ${(p) =>
        p.$open ? 'rgba(212, 184, 134, 0.14)' : 'transparent'};
    color: inherit;
    font: inherit;
    font-size: 1.25rem;
    text-align: left;
    cursor: pointer;
    min-width: 0;

    &:hover {
        background: rgba(212, 184, 134, 0.1);
    }
`;

/** Portail en fixed — au-dessus de la ligne, hors overflow scroll. */
export const CardMenu = styled.div<{ $left: number; $top: number }>`
    position: fixed;
    z-index: 10000;
    left: ${(p) => p.$left}px;
    top: ${(p) => p.$top}px;
    transform: translateY(calc(-100% - 4px));
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 12.5rem;
    padding: 6px;
    border-radius: 6px;
    border: 1px solid rgba(212, 184, 134, 0.4);
    background: rgba(18, 20, 26, 0.97);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
    animation: ${fadeIn} 0.12s ease-out;
`;

export const CardMenuBtn = styled.button`
    appearance: none;
    display: block;
    width: 100%;
    margin: 0;
    padding: 8px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #f3ead7;
    font: inherit;
    font-size: 1.1rem;
    text-align: left;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: rgba(212, 184, 134, 0.16);
        color: #f0d9a0;
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

export const CardText = styled.span`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const CardCount = styled.span`
    min-width: 2rem;
    opacity: 0.75;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
`;

export const CardList = styled.div<{ $natural?: boolean }>`
    ${(p) => (p.$natural ? '' : 'flex: 1;')}
    overflow: ${(p) => (p.$natural ? 'visible' : 'auto')};
    padding: 6px;
    min-height: 0;
    ${niceScrollbar}
`;

export const Catalog = styled.aside`
    display: flex;
    flex-direction: column;
    width: 300px;
    flex-shrink: 0;
    min-height: 0;
    border-left: 1px solid rgba(212, 184, 134, 0.2);
    background: #0f1116;
`;

export const CatalogFilters = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-bottom: 1px solid rgba(212, 184, 134, 0.15);
`;

export const FilterRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

export const ChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 0;
`;

export const Chip = styled.button`
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid rgba(212, 184, 134, 0.45);
    background: rgba(212, 184, 134, 0.14);
    color: #f3ead7;
    font: inherit;
    font-size: 1.1rem;
    cursor: pointer;

    &:hover {
        background: rgba(220, 120, 100, 0.25);
        border-color: rgba(220, 120, 100, 0.55);
    }
`;

export const Select = styled.select`
    flex: 1;
    min-width: 0;
    padding: 10px;
    border: 1px solid rgba(212, 184, 134, 0.3);
    border-radius: 3px;
    background: #1a1d24;
    color: #f3ead7;
    font: inherit;
    font-size: 1.2rem;
`;

export const SearchInput = styled.input`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid rgba(212, 184, 134, 0.3);
    border-radius: 3px;
    background: #1a1d24;
    color: #f3ead7;
    font: inherit;
    font-size: 1.25rem;
`;

export const CatalogList = styled.div`
    flex: 1;
    overflow: auto;
    padding: 6px 8px;
    min-height: 0;
    ${niceScrollbar}
`;

export const Button = styled.button<{
    $primary?: boolean;
    $active?: boolean;
    $compact?: boolean;
}>`
    appearance: none;
    padding: ${(p) => (p.$compact ? '8px 12px' : '10px 14px')};
    border-radius: 3px;
    border: 1px solid
        ${(p) =>
            p.$active
                ? 'rgba(226, 192, 68, 0.85)'
                : p.$primary
                  ? 'rgba(212, 184, 134, 0.6)'
                  : 'rgba(243, 234, 215, 0.25)'};
    background: ${(p) =>
        p.$active
            ? 'rgba(226, 192, 68, 0.28)'
            : p.$primary
              ? 'rgba(212, 184, 134, 0.2)'
              : 'transparent'};
    color: #f3ead7;
    font: inherit;
    font-size: ${(p) => (p.$compact ? '1.15rem' : '1.25rem')};
    font-weight: 600;
    cursor: pointer;
    box-shadow: ${(p) =>
        p.$active ? '0 0 0 1px rgba(226, 192, 68, 0.35)' : 'none'};

    &:hover {
        background: ${(p) =>
            p.$active
                ? 'rgba(226, 192, 68, 0.35)'
                : 'rgba(212, 184, 134, 0.28)'};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

/** Crop illustration personnages (fichiers paysage). */
export const Thumb = styled.img`
    height: 2.2em;
    width: auto;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    object-position: center;
    border-radius: 2px;
    flex-shrink: 0;
    background: #222;
`;

/**
 * Sites : même logique que SiteCard —
 * conteneur paysage + fichier (portrait) tourné à 90°.
 */
export const ThumbSiteWrap = styled.span`
    position: relative;
    height: 2.2em;
    width: auto;
    aspect-ratio: 1.39 / 1;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 2px;
    background: #222;
    container-type: size;
`;

export const ThumbSite = styled.img`
    position: absolute;
    left: 50%;
    top: 50%;
    /* Comme SiteCard/Visual : inverser w/h puis rotate */
    width: 100cqh;
    height: 100cqw;
    object-fit: cover;
    object-position: center;
    transform-origin: center center;
    transform: translate(-50%, -50%) rotate(90deg);
`;

/** Widget erreurs / avertissements (fixe). */
export const IssuesFab = styled.button<{ $error?: boolean }>`
    appearance: none;
    position: fixed;
    inset-block-end: 20px;
    inset-inline-end: 20px;
    z-index: 9000;
    padding: 12px 16px;
    border-radius: 6px;
    border: 1px solid
        ${(p) =>
            p.$error
                ? 'rgba(220, 120, 100, 0.65)'
                : 'rgba(212, 184, 134, 0.45)'};
    background: ${(p) =>
        p.$error ? 'rgba(60, 28, 24, 0.95)' : 'rgba(28, 30, 36, 0.95)'};
    color: ${(p) => (p.$error ? '#f0c4ba' : '#d8c89a')};
    font: inherit;
    font-size: 1.15rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);

    &:hover {
        filter: brightness(1.08);
    }
`;

export const IssuesToaster = styled.div`
    position: fixed;
    inset-block-end: 72px;
    inset-inline-end: 20px;
    z-index: 9001;
    width: min(420px, calc(100vw - 40px));
    max-height: min(420px, 50vh);
    overflow: auto;
    padding: 14px 16px;
    border-radius: 6px;
    border: 1px solid rgba(212, 184, 134, 0.35);
    background: rgba(18, 20, 26, 0.97);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
    ${niceScrollbar}
    font-size: 1.15rem;
`;

export const IssueLine = styled.div<{ $error?: boolean }>`
    color: ${(p) => (p.$error ? '#f0c4ba' : '#d8c89a')};
    margin-bottom: 8px;
    line-height: 1.35;
`;
