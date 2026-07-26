import styled, { keyframes } from 'styled-components';

export const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translate(-50%, -95%);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -100%);
    }
`;

export const BadgeContainer = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: help;
`;

export const BadgeImage = styled.img`
    object-fit: contain;
`;

export const TooltipPortalContainer = styled.div<{ $top: number; $left: number }>`
    position: fixed;
    top: ${(props) => props.$top}px;
    left: ${(props) => props.$left}px;
    z-index: 999999; /* Au-dessus de toutes les cartes et éléments du jeu */
    
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 200px;
    padding: 8px 10px;
    
    background-color: rgba(18, 18, 20, 0.95);
    border: 1px solid #e2c044;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
    
    pointer-events: none;
    animation: ${fadeIn} 0.15s ease-out forwards;

    /* Flèche pointant vers le bas */
    &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #e2c044 transparent transparent transparent;
    }
`;

export const TooltipHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #e2c044;
    font-weight: bold;
    border-bottom: 1px solid rgba(226, 192, 68, 0.2);
    padding-bottom: 4px;

    img {
        object-fit: contain;
    }
`;

export const TooltipText = styled.p`
    margin: 0;
    font-size: 11px;
    line-height: 1.35;
    color: #e0e0e0;
    font-weight: normal;
`;