import styled, { css, keyframes } from 'styled-components';
import { playableEventHalo, spotMetHalo } from '../../cardHalo';

export const FixedHandContainer = styled.div<{ $isDragging?: boolean }>`
    position: fixed;
    inset-block-end: 100px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;

    ${({ $isDragging }) =>
        $isDragging &&
        `
        pointer-events: none !important;
    `}
`;

// 🟢 Keyframes STATIQUES utilisant des variables CSS
const drawCardIn = keyframes`
    0% {
        transform: rotate(var(--angle)) translateY(calc(var(--translateY) + 250px));
        opacity: 0;
    }
    100% {
        transform: rotate(var(--angle)) translateY(var(--translateY));
        opacity: 1;
    }
`;

const discardFlyUp = keyframes`
    0% {
        transform: rotate(var(--angle)) translateY(var(--translateY)) scale(1);
        opacity: 1;
    }
    100% {
        transform: rotate(var(--angle)) translateY(calc(var(--translateY) - 180px)) scale(0.7);
        opacity: 0;
    }
`;

export const CardWrapper = styled.div<{
    $angle: number;
    $translateY: number;
    $zIndex: number;
    $isNew?: boolean;
    $staggerIndex?: number;
    $isRoaming?: boolean;
    $isDiscardPhase?: boolean;
    $isDiscarding?: boolean;
    $hasSpot?: boolean;
    $isSpotMet?: boolean;
    $isPlayableEvent?: boolean;
}>`
    position: relative;
    margin: 0 -15px;

    /* Définition des variables CSS pour alimenter à la fois transform et keyframes */
    --angle: ${(props) => props.$angle}deg;
    --translateY: ${(props) => props.$translateY}px;

    transition:
        transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1),
        z-index 0.1s ease,
        box-shadow 0.2s ease,
        opacity 0.3s ease;

    transform: rotate(var(--angle)) translateY(var(--translateY));
    transform-origin: bottom center;
    z-index: ${(props) => props.$zIndex};
    box-shadow: 0 4px 6px rgba(0, 0, 0, 1);
    cursor: ${(props) => (props.$isDiscardPhase ? 'pointer' : 'grab')};
    height: fit-content;
    overflow: hidden;
    border-radius: 4px;

    ${(props) =>
        props.$isNew &&
        css`
            animation: ${drawCardIn} 0.5s cubic-bezier(0.16, 1, 0.3, 1)
                backwards;
            animation-delay: ${(props.$staggerIndex ?? 0) * 0.08}s;
        `}

    &:hover {
        transform: rotate(var(--angle)) translateY(var(--translateY)) scale(1.1);
        z-index: 100;

        ${(props) =>
            props.$isDiscardPhase &&
            !props.$isDiscarding &&
            css`
                box-shadow: 0 0 15px 4px rgba(231, 76, 60, 0.85);
            `}
    }

    ${(props) =>
        props.$isDiscarding &&
        css`
            animation: ${discardFlyUp} 0.45s cubic-bezier(0.11, 0, 0.5, 0)
                forwards !important;
            pointer-events: none !important;
            z-index: 150 !important;
        `}
    /* 1. Carte classique sans condition 'spot' : Style par défaut */

  /* 2. Condition SPOT REQUIS ET VALIDÉE (halo bleu turquoise) */
  ${(props) =>
        props.$hasSpot &&
        props.$isSpotMet &&
        spotMetHalo}

  /* 3. Condition SPOT REQUIS MAIS NON MET */
  ${(props) =>
        props.$hasSpot &&
        !props.$isSpotMet &&
        `
    border: 1px solid #ff4b4b;
    box-shadow: 0 0 10px rgba(255, 75, 75, 0.6);
  `}

  ${(props) => props.$isPlayableEvent && playableEventHalo}
`;

export const CardRow = styled.div`
    flex: 1;
    display: flex;
    position: fixed;
    justify-content: center;
    inset-inline-start: 50%;
    transform: translateX(-50%);
`;
