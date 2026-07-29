import styled from 'styled-components';

export const MinionStackOverlay = styled.div`
    position: absolute;
    top: -40px; /* Décalage vers le haut */
    left: 20px;  /* Décalage en quinconce */
    display: flex;
    flex-direction: column;
    pointer-events: none; /* Laisse passer le hover si besoin */
    z-index: 10;
`;

export const StackedMinionCard = styled.div<{ $index: number }>`
    position: absolute;
    top: ${props => props.$index * 35}px;  /* Décalage vertical léger par séide supplémentaire */
    left: ${props => props.$index * 25}px; /* Décalage horizontal léger pour l'effet quinconce */
    transform: scale(0.9);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7);
`;