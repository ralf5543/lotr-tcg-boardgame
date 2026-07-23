import styled, { keyframes } from 'styled-components';

export const DockWrapper = styled.div`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1000;
    pointer-events: none; /* Laisse passer les clics au plateau autour */
`;

export const DrawerContainer = styled.div`
    pointer-events: auto;
    width: 100%;
    position: absolute;
    inset-block-end: 100px;
`;

export const DockBar = styled.div`
    pointer-events: auto;
    display: flex;
    gap: 8px;
    background: rgba(26, 29, 36, 0.9);
    padding: 6px 12px;
    border-radius: 20px 20px 0 0;
    border: 1px solid #444;
    border-bottom: none;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.4);
`;

export const DockButton = styled.button<{ $isActive?: boolean; $isClose?: boolean }>`
    background: ${(props) =>
        props.$isClose
            ? '#2d333b'
            : props.$isActive
            ? '#e2c044'
            : '#21262d'};
    color: ${(props) => (props.$isActive ? '#000' : '#fff')};
    border: 1px solid ${(props) => (props.$isActive ? '#e2c044' : '#444')};
    border-radius: 12px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${(props) => (props.$isActive ? '#f0cc4e' : '#30363d')};
        transform: translateY(-2px);
    }
`;

export const PlaceholderView = styled.div`
    color: #888;
    text-align: center;
    padding: 20px;
    font-style: italic;
`;

const tabFadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(60px) scale(0);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
`;

export const TabContentWrapper = styled.div`
    animation: ${tabFadeIn} .5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    width: 100%;
    height: 100%;
`;