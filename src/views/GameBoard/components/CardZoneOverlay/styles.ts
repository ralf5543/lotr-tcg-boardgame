import styled from 'styled-components';

export const Backdrop = styled.div`
    position: absolute;
    inset: 0;
    z-index: 1500;
    display: flex;
    flex-direction: column;
    padding: 20px 24px 28px;
    background: rgba(8, 10, 14, 0.6);
    backdrop-filter: blur(5px);
    animation: zoneOverlayIn 0.22s ease-out;

    @keyframes zoneOverlayIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;

export const Header = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-shrink: 0;
    margin-bottom: 12px;
`;

export const TitleBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const Title = styled.h2`
    margin: 0;
    font-family: 'DecipherTitle', serif;
    font-size: 28px;
    font-weight: 400;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #e2c044;
`;

export const Subtitle = styled.p`
    margin: 0;
    font-size: 13px;
    color: rgba(243, 230, 196, 0.72);
`;

export const CloseButton = styled.button`
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid rgba(226, 192, 68, 0.45);
    background: rgba(26, 29, 36, 0.85);
    color: #f3e6c4;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition:
        background 0.15s ease,
        border-color 0.15s ease;

    &:hover {
        background: rgba(226, 192, 68, 0.15);
        border-color: #e2c044;
    }
`;

export const GridScroll = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 2px 16px;
`;

export const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    gap: 16px 12px;
    align-content: start;
`;

export const GridCell = styled.div`
    position: relative;
    display: flex;
    justify-content: center;
`;

export const CountBadge = styled.span`
    position: absolute;
    top: 2px;
    right: 2px;
    z-index: 2;
    min-width: 22px;
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.92);
    border: 1px solid rgba(226, 192, 68, 0.65);
    color: #e2c044;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
    pointer-events: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.55);
`;

export const EmptyState = styled.p`
    margin: auto;
    font-size: 15px;
    font-style: italic;
    color: rgba(148, 163, 184, 0.9);
    text-align: center;
`;
