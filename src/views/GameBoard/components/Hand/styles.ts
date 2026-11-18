import styled, { css, keyframes } from 'styled-components';
import { handDiscardHalo, playableEventHalo } from '../../cardHalo';

export const FixedHandContainer = styled.div<{ $isDragging?: boolean }>`
    position: fixed;
    inset-block-end: 70px;
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
    $isSelected?: boolean;
    $hasSpot?: boolean;
    $isSpotMet?: boolean;
    $isPlayableEvent?: boolean;
    /** Défausse main (coût / ralliement / muster) : halo rouge permanent. */
    $isDiscardEligible?: boolean;
    /** Désignation / défausse : flèche — grab réservé au drag. */
    $isClickPick?: boolean;
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
    box-shadow: 2px 4px 6px rgba(0, 0, 0, 1);
    cursor: ${(props) =>
        props.$isDiscardPhase || props.$isClickPick ? 'pointer' : 'grab'};
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

    /* Survol = zoom seul (pas de 2ᵉ halo) — cf. halo-colors. */
    &:hover {
        transform: rotate(var(--angle)) translateY(var(--translateY)) scale(1.1);
        z-index: 100;
    }

    ${(props) =>
        props.$isSelected &&
        css`
            outline: 2px solid #e23b3b;
            box-shadow:
                rgb(0, 0, 0) 2px 4px 6px,
                rgb(226, 59, 59) 0px 0px 12px,
                rgb(192, 57, 43) 0px 0px 4px,
                rgba(226, 59, 59, 0.9) 0px 0px 18px,
                rgba(226, 59, 59, 0.5) 0px 0px 48px;
            z-index: 80;
        `}

    ${(props) =>
        props.$isDiscarding &&
        css`
            animation: ${discardFlyUp} 0.45s cubic-bezier(0.11, 0, 0.5, 0)
                forwards !important;
            pointer-events: none !important;
            z-index: 150 !important;
        `}
    /* Défausse main → rouge (éligibles seulement). Prioritaire sur l’or jouable. */
    ${(props) =>
        props.$isDiscardEligible &&
        !props.$isDiscarding &&
        !props.$isSelected &&
        handDiscardHalo}
    /* Jouable → or ; spot KO (condition non réunie) → rien. */
    ${(props) =>
        props.$isPlayableEvent &&
        !props.$isDiscardEligible &&
        !(props.$hasSpot && !props.$isSpotMet) &&
        playableEventHalo}
`;
export const CardRow = styled.div`
    flex: 1;
    display: flex;
    position: fixed;
    justify-content: center;
    inset-inline-start: 50%;
    transform: translateX(-50%);
`;

const drawOpponentCardIn = keyframes`
    0% {
        transform: rotate(var(--angle)) translateY(calc(var(--translateY) - 140px));
        opacity: 0;
    }
    100% {
        transform: rotate(var(--angle)) translateY(var(--translateY));
        opacity: 1;
    }
`;

export const OpponentHandContainer = styled.div`
    position: fixed;
    inset-block-start: -28px;
    left: 0;
    right: 0;
    z-index: 40;
    pointer-events: none;
    display: flex;
    justify-content: center;
`;

export const OpponentCardRow = styled.div`
    display: flex;
    justify-content: center;
`;

export const OpponentCardWrapper = styled.div<{
    $angle: number;
    $translateY: number;
    $zIndex: number;
    $isNew?: boolean;
    $staggerIndex?: number;
}>`
    position: relative;
    margin: 0 -8px;
    --angle: ${(props) => props.$angle}deg;
    --translateY: ${(props) => props.$translateY}px;
    transform: rotate(var(--angle)) translateY(var(--translateY));
    transform-origin: top center;
    z-index: ${(props) => props.$zIndex};
    box-shadow: 2px 3px 5px rgba(0, 0, 0, 0.85);
    height: fit-content;
    overflow: hidden;
    border-radius: 2px;
    transition: transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);

    ${(props) =>
        props.$isNew &&
        css`
            animation: ${drawOpponentCardIn} 0.5s cubic-bezier(0.16, 1, 0.3, 1)
                backwards;
            animation-delay: ${(props.$staggerIndex ?? 0) * 0.08}s;
        `}
`;

export const OpponentCardBack = styled.img`
    width: 65px;
    aspect-ratio: 1 / 1.39;
    object-fit: cover;
    display: block;
    border-radius: 2px;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
`;
