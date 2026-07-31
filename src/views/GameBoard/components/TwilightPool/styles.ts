import styled from 'styled-components';

export const PoolContainer = styled.div`
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const PoolHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    font-weight: bold;
    letter-spacing: 1px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 6px;
`;

export const CounterBadge = styled.span`
    background: radial-gradient(circle, grey, black);
    color: #fff;
    border: 1px solid #9b59b6;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    box-shadow: 0 0 8px #9b59b6;
`;

export const BowlArea = styled.div`
    position: relative;
    height: 120px;
`;

export const TwilightToken = styled.img<{ 
    $left: number; 
    $top: number; 
    $rotate: number; 
}>`
    position: absolute;
    width: 96px;
    height: 96px;
    user-select: none;
    pointer-events: none;

    left: ${props => props.$left}%;
    top: ${props => props.$top}%;

    transition: 
        opacity 0.5s ease, 
        transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);

    /* --- ÉTAT FINAL (Normal) --- */
    opacity: 1;
    transform: translate(-50%, -50%) rotate(${props => props.$rotate}deg) scale(1);

    /* --- ÉTAT INITIAL (Montage dans le DOM) --- */
    @starting-style {
        opacity: 0;
        transform: translate(-50%, -50%) rotate(${props => props.$rotate}deg) scale(0);
    }
`;

export const EmptyText = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.75rem;
    color: #566573;
    font-style: italic;
    text-align: center;
    width: 100%;
`;