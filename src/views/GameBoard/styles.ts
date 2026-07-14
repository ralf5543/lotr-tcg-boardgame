import styled from 'styled-components';

export const BoardContainer = styled.div`
  padding: 20px;
  font-family: sans-serif;
  background-color: #1a252f;
  color: #fff;
  min-height: 100vh;
  padding-bottom: 180px; /* Évite que la main fixe ne cache le plateau */
`;

export const OpponentSection = styled.div`
  opacity: 0.7;
  margin-bottom: 20px;
`;

export const OpponentMeta = styled.span`
  font-size: 12px;
  color: #e74c3c;
`;

export const CentralBlock = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  height: 280px;
`;

export const BattlefieldContainer = styled.div`
  flex: 0 0 80%;
  background-color: #2c3e50;
  border-radius: 8px;
  border: 2px solid #7f8c8d;
  padding: 15px;
  position: relative; /* Requis pour la réserve de jetons absolue */
  display: flex;
  flex-direction: column;
`;

export const TokenReserve = styled.div`
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: #34495e;
  border: 2px dashed #f1c40f;
  border-radius: 6px;
  padding: 8px;
  font-size: 11px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
`;

export const TokenGrid = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 5px;
`;

export const TokenPile = styled.div<{ color?: string }>`
  background-color: ${props => props.color || '#c0392b'};
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 10px;
  cursor: pointer;
`;

export const PlayerSection = styled.div`
  margin-bottom: 20px;
`;

export const PlayerMeta = styled.span`
  font-size: 12px;
  color: #3498db;
`;

export const GameZone = styled.div<{ $borderColor: string }>`
  border: 2px solid ${props => props.$borderColor};
  background-color: #1a252f;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
`;

export const ZoneTitle = styled.span<{ color?: string }>`
  display: block;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 5px;
  color: ${props => props.color || '#fff'};
`;

export const CardRow = styled.div`
  display: flex;
  gap: 10px;
  min-height: 80px;
  align-items: center;
`;

export const GameCard = styled.div<{ $borderColor?: string; isShadow?: boolean }>`
  width: 90px;
  height: 120px;
  background-color: ${props => (props.isShadow ? '#111' : '#fff')};
  color: ${props => (props.isShadow ? '#fff' : '#333')};
  border-radius: 4px;
  padding: 6px;
  border: 3px solid ${props => props.$borderColor || '#ccc'};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: ${props => (props.onClick ? 'pointer' : 'default')};
`;

export const FixedHandContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 140px;
  background-color: #2c3e50;
  border-top: 3px solid #34495e;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.5);
  z-index: 1000;
`;

export const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

export const GameButton = styled.button<{ $bgColor?: string }>`
  padding: 6px 12px;
  color: #fff;
  background-color: ${props => props.$bgColor || '#7f8c8d'};
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 11px;
`;

export const InfoText = styled.p`
  color: #7f8c8d;
  font-style: italic;
  font-size: 12px;
  margin: 0;
`;