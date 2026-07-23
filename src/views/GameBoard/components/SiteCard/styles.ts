import styled, { css } from 'styled-components';

export type SiteCardSize = 'sm' | 'md' | 'lg';

const sizeStyles = {
    sm: css`
        width: 120px;
        height: 70px;
        padding: 4px 6px;
        font-size: 10px;
        border-radius: 4px;
    `,
    md: css`
        width: 180px;
        height: 110px;
        padding: 6px 8px;
        font-size: 12px;
        border-radius: 6px;
    `,
    lg: css`
        width: 380px;
        height: 240px;
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
    background: #1a1a2e;
    border: 1px solid #e2c044;
    color: #fff;
    box-sizing: border-box;
    overflow: hidden;
    user-select: none;
    aspect-ratio: 1.39 / 1;

    ${({ $size }) => sizeStyles[$size]}
`;

export const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
    gap: 4px;
`;

export const Title = styled.span`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const TwilightBadge = styled.span`
    color: #e2c044;
    font-weight: bold;
    flex-shrink: 0;
`;

export const VisualContainer = styled.div`
    flex: 1;
    margin: 4px 0;
    overflow: hidden;
    border-radius: 4px;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const Visual = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const Text = styled.p`
    margin: 0;
    font-size: 0.85em;
    line-height: 1.2;
    opacity: 0.9;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

export const Footer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8em;
    opacity: 0.8;
`;