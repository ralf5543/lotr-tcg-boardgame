import styled, { css } from 'styled-components';

export type SiteCardSize = 'sm' | 'md' | 'lg';

const sizeStyles = {
    sm: css`
        width: 100%;
        height: 100%;
        padding: 4px 6px;
        font-size: 10px;
        border-radius: 4px;
        background-image: none;
    `,
    md: css`
        width: 180px;
        aspect-ratio: 1.39/1;
        padding: 6px 8px;
        font-size: 12px;
        border-radius: 6px;
    `,
    lg: css`
        width: 100%;
        aspect-ratio: 1.39/1;
        padding: 12px 16px;
        font-size: 14px;
        border-radius: 10px;
    `,
};

export const Container = styled.div<{ $size: SiteCardSize }>`
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: black;
    color: black;
    user-select: none;

    &::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url('interface/cards_backgrounds/site_standard.webp');
        background-size: cover;
        background-repeat: no-repeat;
    }

    ${({ $size }) => sizeStyles[$size]}

    ${(props) =>
        props.$size === 'sm' &&
        `&::after {
            content: none;
        }
    `}
`;

export const Title = styled.p<{
    $size?: 'sm' | 'md' | 'lg';
}>`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    position: absolute;
    inset: 8px 19px 108px 20px;
    color: black;
    font-size: 8px;
    font-weight: bold;
    font-variant: small-caps;
    z-index: 1;

    ${(props) =>
        props.$size === 'sm' &&
        `
        inset: 0px 0px 49px;
        font-size: 9px;
        color: white;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1;
    `}

    ${(props) =>
        props.$size === 'lg' &&
        `
        inset: 23px 110px 260px 110px;
        font-size: 12px;
    `}
`;

export const TwilightBadge = styled.span<{
    $size?: 'sm' | 'md' | 'lg';
}>`
    position: absolute;
    inset-block-start: 10px;
    inset-inline-end: 7px;
    width: 26px;
    aspect-ratio: 1 / 1;
    background-image: url(interface/icons/site_value.webp);
    background-repeat: no-repeat;
    background-size: contain;
    color: white;
    font-family: LOTRIcons;
    font-size: 14px;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-position: 1px;

    ${(props) =>
        props.$size === 'lg' &&
        `
        inset-block-start: 18px;
        inset-inline-end: 14px;
        width: 45px;
        font-size: 22px;
        background-position: 4px 3px;
    `}
`;

export const VisualContainer = styled.div<{
    $size?: 'sm' | 'md' | 'lg';
}>`
    position: absolute;
    overflow: hidden;
    inset: 17px 19px 31px 20px;
    object-fit: cover; 
    container-type: size;

    ${(props) =>
        props.$size === 'sm' &&
        `
        inset: 0;
    `}

    ${(props) =>
        props.$size === 'lg' &&
        `
        inset: 41px 47px 78px 49px;
    `}
`;

export const Visual = styled.img`
    position: absolute;
    top: 50%;
    left: 50%;

    width: 100cqh; /* Utilise la hauteur du conteneur comme largeur */
    height: 100cqw; /* Utilise la largeur du conteneur comme hauteur */

    object-fit: cover;
    transform-origin: center center;
    transform: translate(-50%, -50%) rotate(90deg);
`;

export const Text = styled.p<{
    $size?: 'sm' | 'md' | 'lg';
}>`
    position: absolute;
    inset: 100px 22px 15px 23px;
    line-height: 0.9;
    font-size: 6px;
    z-index: 1;

    ${(props) =>
        props.$size === 'lg' &&
        `
        inset: 235px 52px 40px 52px;
        font-size: 12px;
    `}
`;

export const Footer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8em;
`;

export const SiteKeywordsContainer = styled.div`
    position: absolute;
    z-index: 1;
    inset-block-end: 2px;
    inset-inline-end: 2px;
    display: flex;
    gap: 5px;
`;