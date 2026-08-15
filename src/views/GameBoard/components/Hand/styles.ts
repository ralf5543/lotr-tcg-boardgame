import styled, { css, keyframes } from 'styled-components';

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

// 💨 Animation PFFFFTT d'envol et d'évanouissement
const discardFlyUp = (angle: number, translateY: number) => keyframes`
    0% {
        transform: rotate(${angle}deg) translateY(${translateY}px) scale(1);
        opacity: 1;
    }
    100% {
        transform: rotate(${angle}deg) translateY(${translateY - 180}px) scale(0.7);
        opacity: 0;
    }
`;

export const CardWrapper = styled.div<{
    $angle: number;
    $translateY: number;
    $zIndex: number;
    $isRoaming?: boolean;
    $isDiscardPhase?: boolean;
    $isDiscarding?: boolean; // 🟢 Prop d'animation
}>`
    position: relative;
    margin: 0 -15px;
    transition:
        transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1),
        z-index 0.1s ease,
        box-shadow 0.2s ease,
        opacity 0.3s ease;
    transform: rotate(${(props) => props.$angle}deg)
        translateY(${(props) => props.$translateY}px);
    transform-origin: bottom center;
    z-index: ${(props) => props.$zIndex};
    box-shadow: 0 4px 6px rgba(0, 0, 0, 1);
    cursor: ${(props) => (props.$isDiscardPhase ? 'pointer' : 'grab')};

    &:hover {
        transform: rotate(${(props) => props.$angle}deg)
            translateY(${(props) => props.$translateY}px) scale(1.1);
        z-index: 100 !important;

        ${(props) =>
            props.$isDiscardPhase &&
            !props.$isDiscarding &&
            css`
                box-shadow: 0 0 15px 4px rgba(231, 76, 60, 0.85);
            `}
    }

    /* 🟢 Application de l'animation d'envol */
    ${(props) =>
        props.$isDiscarding &&
        css`
            animation: ${discardFlyUp(props.$angle, props.$translateY)} 0.45s
                cubic-bezier(0.11, 0, 0.5, 0) forwards;
            pointer-events: none !important;
            z-index: 150 !important;
        `}
`;

export const CardRow = styled.div`
    flex: 1;
    display: flex;
    position: fixed;
    justify-content: center;
    inset-inline-start: 50%;
    transform: translateX(-50%);
`;