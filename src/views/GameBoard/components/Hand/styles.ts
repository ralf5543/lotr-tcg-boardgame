import styled from 'styled-components';

export const FixedHandContainer = styled.div`
  position: fixed;
  inset-block-end: 100px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
`;

// Le conteneur individuel de chaque carte pour gérer son inclinaison physique
export const CardWrapper = styled.div<{ $angle: number; $translateY: number; $zIndex: number }>`
  position: relative;
  margin: 0 -15px; /* Marge négative pour forcer le chevauchement d'éventail */
  transition: transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), z-index 0.1s ease;
  transform: rotate(${props => props.$angle}deg) translateY(${props => props.$translateY}px);
  transform-origin: bottom center;
  z-index: ${props => props.$zIndex};
  box-shadow: 0 4px 6px rgba(0, 0, 0, 1);

  &:hover {
    transform: rotate(${props => props.$angle}deg) translateY(${props => props.$translateY}px) scale(1.1);
    z-index: 100 !important; /* Passe au-dessus de TOUTES les autres cartes */
  }
`;

export const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 150px;
`;

export const GameButton = styled.button<{ $bgColor: string }>`
  background-color: ${props => props.$bgColor};
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  font-size: 13px;
  transition: transform 0.1s, filter 0.1s;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
  }
`;

export const CardRow = styled.div`
  flex: 1;
  display: flex;
  position: fixed;
  justify-content: center;
  inset-inline-start: 50%;
  transform: translateX(-50%);
`;
