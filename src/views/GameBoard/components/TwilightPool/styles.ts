import styled from 'styled-components';

export const PoolContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    height: 110px;
    padding: 0;
    overflow: hidden;
`;

export const CompactLabel = styled.span`
    position: absolute;
    z-index: 0;
    top: 10px;
    left: 10px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(226, 192, 68, 0.7);
    pointer-events: none;
`;

export const CounterBadge = styled.span`
    background: radial-gradient(circle, grey, black);
    color: #fff;
    border: 1px solid #ffbf00;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    box-shadow: 0 0 8px #ffbf00;
    flex-shrink: 0;
    position: absolute;
    z-index: 2;
    top: 8px;
    right: 8px;
`;

export const BowlArea = styled.div`
    position: absolute;
    inset: 0;
    height: auto;
    z-index: 1;
`;

export const TwilightToken = styled.img<{
    $left: number;
    $top: number;
    $rotate: number;
}>`
    position: absolute;
    width: 48px;
    height: 48px;
    user-select: none;
    pointer-events: none;

    left: ${(props) => props.$left}%;
    top: ${(props) => props.$top}%;

    transition:
        opacity 0.5s ease,
        transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);

    opacity: 1;
    transform: translate(-50%, -50%) rotate(${(props) => props.$rotate}deg)
        scale(1);

    @starting-style {
        opacity: 0;
        transform: translate(-50%, -50%) rotate(${(props) => props.$rotate}deg)
            scale(0);
    }
`;
