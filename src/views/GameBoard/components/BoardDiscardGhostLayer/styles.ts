import styled, { keyframes } from 'styled-components';

/** Largeur carte plateau `size="sm"` (avant scale App). */
export const BOARD_CARD_SM_WIDTH = 105;

/**
 * Vers le haut + léger drift vers la gauche (rail / piles de défausse).
 * Même durée / easing que la main (`discardFlyUp`).
 */
const discardFlyAway = keyframes`
    0% {
        transform: translate(0, 0) scale(1);
        opacity: 1;
    }
    100% {
        transform: translate(-48px, -140px) scale(0.7);
        opacity: 0;
    }
`;

export const Layer = styled.div`
    position: fixed;
    inset: 0;
    z-index: 80;
    pointer-events: none;
    overflow: visible;
`;

export const Ghost = styled.div<{
    $top: number;
    $left: number;
    $width: number;
    $height: number;
}>`
    position: fixed;
    top: ${({ $top }) => $top}px;
    left: ${({ $left }) => $left}px;
    width: ${({ $width }) => $width}px;
    height: ${({ $height }) => $height}px;
    z-index: 81;
    pointer-events: none;
    overflow: visible;
    will-change: transform, opacity;
    animation: ${discardFlyAway} 0.45s cubic-bezier(0.11, 0, 0.5, 0) forwards;
    filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.85));
`;

/**
 * Le plateau vit dans un `ScaledView` : le fantôme (sur `body`) doit
 * redimensionner la carte sm pour coller au rectangle écran.
 */
export const GhostScale = styled.div<{ $scale: number }>`
    transform: scale(${({ $scale }) => $scale});
    transform-origin: top left;
    pointer-events: none !important;

    & > * {
        pointer-events: none !important;
    }
`;
