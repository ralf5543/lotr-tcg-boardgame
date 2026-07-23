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
}>`
    border: 2px solid ${({ $borderColor }) => $borderColor};
    background-color: #1a252f;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 10px;
    transition: all 0.2s ease-in-out;

    /* Surbrillance quand on survole la zone globale */
    ${({ $isTargeted }) =>
        $isTargeted &&
        css`
            border-color: #3498db;
            box-shadow: 0 0 16px rgba(52, 152, 219, 0.7), inset 0 0 10px rgba(52, 152, 219, 0.2);
            background-color: #203140;
        `}
`;

export const FellowshipCollapsed = styled.div<{ $borderColor?: string }>`
    border: 2px solid ${({ $borderColor }) => $borderColor || '#34495e'};
    background-color: #1a252f;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 10px;
`;

export const SupportArea = styled.div<{ 
    $borderColor: string; 
    $isOpponent?: boolean;
    $isTargeted?: boolean;
}>`
    border: 2px solid ${({ $borderColor }) => $borderColor};
    background-color: #1a252f;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 10px;
    transition: all 0.2s ease-in-out;

    ${({ $isTargeted }) =>
        $isTargeted &&
        css`
            border-color: #f39c12;
            box-shadow: 0 0 16px rgba(243, 156, 18, 0.7), inset 0 0 10px rgba(243, 156, 18, 0.2);
            background-color: #2a2218;
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
    container-type: inline-size;
    gap: 60px;
    min-height: 60px;
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

    /* Surbrillance spécifique quand on frôle ce compagnon précis (ex: attachement d'une possession) */
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
    transition: transform 0.2s, z-index 0.2s;

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