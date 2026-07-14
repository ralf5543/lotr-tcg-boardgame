import styled from 'styled-components';

export const AreaContainer = styled.div<{ $isOpponent?: boolean }>`
  margin-bottom: 20px;
  opacity: ${props => (props.$isOpponent ? 0.7 : 1)};
`;

export const MetaInfo = styled.span<{ $isOpponent?: boolean }>`
  display: block;
  font-size: 12px;
  color: ${props => (props.$isOpponent ? '#e74c3c' : '#3498db')};
  margin-bottom: 8px;
`;

export const Zone = styled.div<{ $borderColor: string }>`
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
  margin-bottom: 8px;
  color: ${props => props.color || '#fff'};
`;

export const CardRow = styled.div`
  display: flex;
  gap: 10px;
  min-height: 80px;
  align-items: center;
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