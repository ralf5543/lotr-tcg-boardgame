import styled, { css, keyframes } from 'styled-components';

// ----------------------------------------------------
// 🎬 KEYFRAMES D'ANIMATIONS
// ----------------------------------------------------

// 1. Bouclier : Apparition au centre à 50%
const shieldPop = keyframes`
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.2);
    }
    100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(0.5);
    }
`;

// 2. Épée Gauche : Glisse de loin et vient impacter le centre à -45°
const swordLeftSlash = keyframes`
    0% {
        opacity: 0;
        transform: translate(-170%, -85%) rotate(-10deg) scale(0.85);
    }
    100% {
        opacity: 1;
        transform: translate(-50%, -50%) rotate(-45deg) scale(1);
    }
`;

// 3. Épée Droite : Glisse de loin et vient impacter le centre à +45°
const swordRightSlash = keyframes`
    0% {
        opacity: 0;
        transform: translate(70%, -85%) rotate(10deg) scale(0.85);
    }
    100% {
        opacity: 1;
        transform: translate(-50%, -50%) rotate(45deg) scale(1);
    }
`;

// 4. Micro-Choc : Petit scale rapide lors de l'impact des épées
const clashImpact = keyframes`
    0%, 70% {
        transform: translateX(-50%) scale(1);
    }
    85% {
        transform: translateX(-50%) scale(1.15);
    }
    100% {
        transform: translateX(-50%) scale(1);
    }
`;

// ----------------------------------------------------
// 💅 STYLED COMPONENTS
// ----------------------------------------------------

export const ClashContainer = styled.div<{ $isOpponent?: boolean }>`
    position: absolute;
    width: 80px;
    height: 80px;
    z-index: 10;
    pointer-events: none;
    inset-inline-start: 50%;
    transform: translateX(-50%);

    ${({ $isOpponent }) =>
        $isOpponent
            ? css`
                  inset-block-start: 100%;
                  margin-block-start: -25px;
              `
            : css`
                  inset-block-end: 100%;
                  margin-block-end: -25px;
              `}

    /* 💥 Micro-snap de choc synchronisé sur la fin de frappe */
    animation: ${clashImpact} 0.45s ease-out forwards;
`;

export const BaseElement = styled.img`
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    object-fit: contain;
    will-change: transform, opacity;
`;

export const Shield = styled(BaseElement)`
    z-index: 1;
    filter: drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.6));
    animation: ${shieldPop} 0.4s ease-out forwards;
`;

export const SwordLeft = styled(BaseElement)`
    z-index: 2;
    filter: drop-shadow(-2px 4px 6px rgba(0, 0, 0, 0.5));
    animation: ${swordLeftSlash} 0.35s cubic-bezier(0.12, 0, 0.39, 0) forwards;
`;

export const SwordRight = styled(BaseElement)`
    z-index: 2;
    filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.5));
    animation: ${swordRightSlash} 0.35s cubic-bezier(0.12, 0, 0.39, 0) forwards;
`;

export const MinionWrapper = styled.div<{ $index: number }>`
    margin-left: ${(props) => props.$index * 20}px;
`;
