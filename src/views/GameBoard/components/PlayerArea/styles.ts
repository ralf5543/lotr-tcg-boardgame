import styled, { css } from 'styled-components';

export const AreaContainer = styled.div<{ $isOpponent?: boolean }>`
    flex-shrink: 0;
    position: relative;
    z-index: 2;
`;

export const MetaInfo = styled.span<{ $isOpponent?: boolean }>`
    display: block;
    font-size: 12px;
    color: ${({ $isOpponent }) => ($isOpponent ? '#e74c3c' : '#3498db')};
    margin-bottom: 8px;
`;

export const Fellowship = styled.div<{
    $borderColor: string;
    $isTargeted?: boolean;
    $isOpponent?: boolean;
}>`
    position: relative;
    margin-bottom: 10px;
    border: none;
    background: none;
    padding: 0;
    transition: all 0.2s ease-in-out;

    &::before {
        content: '';
        position: absolute;
        z-index: 0;
        pointer-events: none;
        bottom: 18px;
        left: 0;
        width: 100%;
        height: 176px;
        border: 2px solid ${({ $borderColor }) => $borderColor};
        background-color: rgba(26, 37, 47, 0.5);
        border-radius: 6px;
        transition: all 0.2s ease-in-out;

        ${({ $isOpponent }) =>
        $isOpponent &&
        css`
            inset-block-start: 0;
        `}
    }

    ${({ $isTargeted }) =>
        $isTargeted &&
        css`
            &::before {
                border-color: #3498db;
                box-shadow:
                    0 0 16px rgba(52, 152, 219, 0.7),
                    inset 0 0 10px rgba(52, 152, 219, 0.2);
                background-color: rgba(26, 37, 47, 0.7);
            }
        `}
`;

/* 💤 BANDEAU COMPAGNIE EN SOMMEIL */
export const DormantFellowshipBanner = styled.button<{ $isOpponent?: boolean }>`
    position: relative;
    width: 100%;
    height: 36px;
    border: 1px dashed #3498db;
    background-color: rgba(52, 152, 219, 0.1);
    border-radius: 6px;
    padding: 0 12px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: bold;
    color: #3498db;
    cursor: pointer;
    transition: all 0.2s ease-in-out;

    &:hover {
        background-color: rgba(52, 152, 219, 0.2);
        border-style: solid;
    }
`;

export const ExpandHint = styled.span`
    font-size: 11px;
    font-weight: normal;
    opacity: 0.8;
`;

export const DormantOverlay = styled.div<{
    $isOpponent?: boolean;
}>`
    position: absolute;
    inset-block-end: 100%;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid #3498db;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);

    ${({ $isOpponent }) =>
        $isOpponent &&
        css`
            inset-block-start: 100%;
            inset-block-end: auto;
        `}
`;

export const SupportArea = styled.div<{
    $borderColor: string;
    $isOpponent?: boolean;
    $isTargeted?: boolean;
}>`
    position: relative;
    margin-bottom: 10px;
    border: none;
    background: none;
    padding: 0;
    transition: all 0.2s ease-in-out;

    &::before {
        content: '';
        position: absolute;
        z-index: 0;
        pointer-events: none;
        inset: 0px 0px 18px;
        border: 2px solid ${({ $borderColor }) => $borderColor};
        background-color: rgba(26, 37, 47, 0.5);
        border-radius: 6px;
        transition: all 0.2s ease-in-out;
    }

    ${({ $isTargeted }) =>
        $isTargeted &&
        css`
            &::before {
                border-color: #f39c12;
                box-shadow:
                    0 0 16px rgba(243, 156, 18, 0.7),
                    inset 0 0 10px rgba(243, 156, 18, 0.2);
                background-color: rgba(26, 37, 47, 0.7);
            }
        `}
`;

const hangScrollbar = css`
    overflow-x: auto;
    overflow-y: hidden;
    min-width: 0;
    scrollbar-width: thin;
    scrollbar-color: rgba(226, 192, 68, 0.5) transparent;

    &::-webkit-scrollbar {
        height: 6px;
    }
    &::-webkit-scrollbar-track {
        background: transparent;
    }
    &::-webkit-scrollbar-thumb {
        background: rgba(226, 192, 68, 0.5);
        border-radius: 4px;
    }
`;

export const CardScroller = styled.div`
    ${hangScrollbar}
    position: relative;
    z-index: 1;
`;

/* Couche sœur du scroll : même taille que la compagnie, overflow visible.
   Les séides assignés y sont portés (hors du clip overflow-x).
   inset 0 = boîte compagnie seulement, pas le champ de bataille. */
export const MinionTrack = styled.div`
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    overflow: visible;
`;

export const CardRow = styled.div<{ $isOpponent?: boolean }>`
    display: flex;
    gap: 60px;
    min-height: 120px;
    box-sizing: border-box;
    width: max-content;
    min-width: 100%;
    padding-block: 16px 32px;
    padding-inline-start: 40px;
    padding-inline-end: 32px;
    align-items: ${({ $isOpponent }) =>
        $isOpponent ? 'flex-start' : 'flex-end'};

    & > * {
        flex-shrink: 0;
    }
`;

export const CharacterStack = styled.div<{ $isBeingDragged?: boolean }>`
    display: flex;
    flex-direction: column;
    position: relative;
    align-items: center;
    opacity: ${({ $isBeingDragged }) => ($isBeingDragged ? 0.3 : 1)};
    transition: opacity 0.2s ease;
`;


export const MaskedZonePlaceholder = styled.div`
    padding: 15px;
    background-color: #34495e;
    border-radius: 6px;
    text-align: center;
    color: #bdc3c7;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
`;

export const EmptyText = styled.p`
    color: #7f8c8d;
    font-style: italic;
    font-size: 12px;
    margin: 0;
`;

export const SupportSplitLayout = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    box-sizing: border-box;
    width: max-content;
    min-width: 100%;
    padding-block: 16px 32px;
    min-height: 194px;
`;

export const SupportSubZone = styled.div<{ $align: 'left' | 'right' }>`
    display: flex;
    align-items: center;
    gap: 26px;
    min-height: 120px;
    flex: 0 0 auto;
    padding-inline-start: 38px;
    padding-inline-end: 24px;

    & > * {
        flex-shrink: 0;
    }

    justify-content: ${({ $align }) =>
        $align === 'left' ? 'flex-start' : 'flex-end'};
`;
