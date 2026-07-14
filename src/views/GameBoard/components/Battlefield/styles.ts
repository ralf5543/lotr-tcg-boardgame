import styled from 'styled-components';

export const Container = styled.div`
  flex: 0 0 80%;
  background-color: #2c3e50;
  border-radius: 8px;
  border: 2px solid #7f8c8d;
  padding: 15px;
  position: relative; /* Pour caler la coupelle de jetons */
  display: flex;
  flex-direction: column;
`;

export const Title = styled.span`
  display: block;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #e74c3c;
  margin-bottom: 5px;
`;

export const CardRow = styled.div`
  display: flex;
  gap: 10px;
  min-height: 80px;
  align-items: center;
`;

export const GameCard = styled.div`
  width: 90px;
  height: 120px;
  background-color: #111;
  color: #fff;
  border-radius: 4px;
  padding: 6px;
  border: 3px solid #e74c3c;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transform: rotate(3deg); /* Effet jeté en bazar */
`;

export const CardTitle = styled.span`
  font-size: 11px;
  font-weight: bold;
`;

export const CardCost = styled.span`
  font-size: 11px;
  color: #e74c3c;
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

export const InfoText = styled.p`
  color: #7f8c8d;
  font-style: italic;
  font-size: 12px;
  margin: 0;
`;