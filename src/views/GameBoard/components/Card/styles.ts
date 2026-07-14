// src/views/GameBoard/components/Card/styles.ts
import styled from 'styled-components';

const getCultureColor = (culture: string): string => {
    switch (culture) {
        case 'gondor':
            return '#1a365d'; // Bleu Gondor
        case 'shire':
            return '#2f855a'; // Vert Comté
        case 'isengard':
            return '#4a5568'; // Gris fer Isengard
        case 'wraith':
            return '#1a202c'; // Noir Nazgûl
        case 'elven':
            return '#319795'; // Turquoise Elfes
        case 'dwarven':
            return '#744210'; // Marron Nains
        case 'moria':
            return '#2d3748'; // Gris sombre Moria
        case 'sauron':
            return '#742a2a'; // Rouge sang Sauron
        default:
            return '#718096';
    }
};

export const CardContainer = styled.div<{
    $culture: string;
    $imageUrl?: string;
    $isShadow?: boolean;
}>`
    width: 100px;
    height: 140px;
    border-radius: 6px;
    border: 3px solid ${(props) => getCultureColor(props.$culture)};
    background-color: ${(props) => (props.$isShadow ? '#111' : '#1a202c')};
    background-image: ${(props) =>
        `linear-gradient(to bottom, #2d3748, ${getCultureColor(props.$culture)})`};

    background-size: cover;
    background-position: center;

    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    cursor: ${(props) => (props.onClick ? 'pointer' : 'default')};
    transition: transform 0.2s ease;

    &:hover {
        transform: ${(props) =>
            props.onClick ? 'translateY(-5px) scale(1.05)' : 'none'};
        z-index: 10;
    }
`;

export const CardHeader = styled.div`
    background: rgba(0, 0, 0, 0.7);
    padding: 4px 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

export const CardTitle = styled.span`
    font-size: 10px;
    color: #fff;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const VisualContainer = styled.figure`
    width: 100%;
    margin: 0;
`;

export const Visual = styled.img`
    width: 100%;
    object-fit: cover;
`;

export const TwilightBadge = styled.span`
    background: #f1c40f;
    color: #111;
    font-weight: bold;
    font-size: 9px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

export const StatsRow = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-block-start: auto;
`;

export const StatBadge = styled.span<{ $isStrength?: boolean }>`
    background-color: ${(props) => (props.$isStrength ? '#e53e3e' : '#3182ce')};
    color: #fff;
    font-weight: bold;
    font-size: 10px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
`;
