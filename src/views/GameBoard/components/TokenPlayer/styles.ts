import styled from 'styled-components';

export const Token = styled.div<{ $value: string }>`
    position: absolute;
    z-index: 2;
    inset-block-start: ${(props) =>
        props.$value === "1"
            ? '-10px'
            : '30px'};
    inset-inline-start: ${(props) =>
        props.$value === "1"
            ? '-10px'
            : '30px'};
    width: 45px;
    aspect-ratio: 1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    &::before {
        content: '';
        position: absolute;
        background-image: url('interface/tokens/token_player_top.webp');
        background-size: contain;
        background-repeat: no-repeat;
        z-index: 2;
        width: 28px;
        aspect-ratio: 1;
        pointer-events: none; /* Laisse cliquer à travers */
    }
    &::after {
        content: '';
        background-image: url(${(props) => `interface/tokens/token_player_${props.$value}_base.webp`});
        position: absolute;
        inset: 0;
        background-position: 1px 2px;
        background-size: contain;
        background-repeat: no-repeat;
        pointer-events: none;
    }
`;

export const Avatar = styled.img`
    width: 23px;
    height: auto;
    border-radius: 50%;
    position: relative;
    z-index: 1;
`;