import styled, { css } from 'styled-components';

export const AreaContainer = styled.div<{ $isOpponent?: boolean }>`
    margin-bottom: 20px;
`;

export const MetaInfo = styled.span<{ $isOpponent?: boolean }>`
    display: block;
    font-size: 12px;
    color: ${({ $isOpponent }) => ($isOpponent ? '#e74c3c' : '#3498db')};
    margin-bottom: 8px;
`;

export const Fellowship = styled.div<{
    $borderColor: string;
    $isTargeted?: boolean;
    $isOpponent?: boolean;
}>`
    border: 2px solid ${({ $borderColor }) => $borderColor};
    background-color: rgba(26, 37, 47, 0.5);
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 10px;
    transition: all 0.2s ease-in-out;

    /* Surbrillance quand on survole la zone globale */
    ${({ $isTargeted }) =>
        $isTargeted &&
        css`
            border-color: #3498db;
            box-shadow:
                0 0 16px rgba(52, 152, 219, 0.7),
                inset 0 0 10px rgba(52, 152, 219, 0.2);
            background-color: rgba(26, 37, 47, 0.7);
        `}
`;

/* 💤 BANDEAU COMPAGNIE EN SOMMEIL */
export const DormantFellowshipBanner = styled.div<{ $isOpponent?: boolean }>`
    position: relative;
    height: 36px;
    border: 1px dashed #3498db;
    background-color: rgba(52, 152, 219, 0.1);
    border-radius: 6px;
    padding: 0 12px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: bold;
    color: #3498db;
    cursor: pointer;
    transition: all 0.2s ease-in-out;

    &:hover {
        background-color: rgba(52, 152, 219, 0.2);
        border-style: solid;
    }
`;

export const ExpandHint = styled.span`
    font-size: 11px;
    font-weight: normal;
    opacity: 0.8;
`;

export const DormantOverlay = styled.div`
    position: absolute;
    top: 42px;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid #3498db;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
`;

export const SupportArea = styled.div<{
    $borderColor: string;
    $isOpponent?: boolean;
    $isTargeted?: boolean;
}>`
    border: 2px solid ${({ $borderColor }) => $borderColor};
    background-color: rgba(26, 37, 47, 0.5);
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 10px;
    transition: all 0.2s ease-in-out;

    ${({ $isTargeted }) =>
        $isTargeted &&
        css`
            border-color: #f39c12;
            box-shadow:
                0 0 16px rgba(243, 156, 18, 0.7),
                inset 0 0 10px rgba(243, 156, 18, 0.2);
            background-color: rgba(26, 37, 47, 0.7);
        `}
`;

export const ZoneTitle = styled.span<{ color?: string }>`
    display: block;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
    color: ${({ color }) => color || '#fff'};
`;

export const CardRow = styled.div`
    display: flex;
    gap: 60px;
    min-height: 120px;
    padding-inline-start: 40px;
`;

export const CharacterStack = styled.div<{ $isBeingDragged?: boolean }>`
    display: flex;
    flex-direction: column;
    position: relative;
    align-items: center;
    opacity: ${({ $isBeingDragged }) => ($isBeingDragged ? 0.3 : 1)};
    transition: opacity 0.2s ease;
`;

export const CardDragTarget = styled.div<{
    $isOpponent?: boolean;
    $isTargeted?: boolean;
}>`
    cursor: ${({ $isOpponent }) => ($isOpponent ? 'default' : 'grab')};
    border-radius: 6px;
    transition: all 0.15s ease-in-out;
    z-index: 1;

    ${({ $isTargeted }) =>
        $isTargeted &&
        css`
            transform: translateY(-4px) scale(1.05);
            box-shadow: 0 0 14px #e2c044;
            filter: drop-shadow(0 0 8px #e2c044);
        `}
`;

export const AttachmentWrapper = styled.div<{ $index: number }>`
    position: absolute;
    top: ${({ $index }) => 45 + $index * 35}px;
    transform: translateX(${({ $index }) => -1 * ($index + 1)}em);
    z-index: ${({ $index }) => $index + 1};
    transition:
        transform 0.2s,
        z-index 0.2s;

    &:hover {
        transform: scale(1) translateY(5px);
        z-index: 999;
    }
`;

export const MaskedZonePlaceholder = styled.div`
    padding: 15px;
    background-color: #34495e;
    border-radius: 6px;
    text-align: center;
    color: #bdc3c7;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
`;

export const EmptyText = styled.p`
    color: #7f8c8d;
    font-style: italic;
    font-size: 12px;
    margin: 0;
`;

export const SupportSplitLayout = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    gap: 20px;
    overflow-x: auto;
    padding-bottom: 4px;

    &::-webkit-scrollbar {
        height: 6px;
    }
    &::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.4);
        border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb {
        background: #f39c12;
        border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb:hover {
        background: #e67e22;
    }
`;

export const SupportSubZone = styled.div<{ $align: 'left' | 'right' }>`
    display: flex;
    align-items: center;
    gap: 15px;
    min-height: 120px;
    flex: 1;

    /* Alignement à gauche pour FP, à droite pour Ombre */
    justify-content: ${({ $align }) =>
        $align === 'left' ? 'flex-start' : 'flex-end'};
`;
