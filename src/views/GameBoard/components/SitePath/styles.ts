import styled from 'styled-components';

export const Container = styled.div`
  flex: 0 0 20%;
  background-color: #2c3e50;
  border-radius: 8px;
  border: 2px solid #34495e;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const Title = styled.span`
  display: block;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #2ecc71;
  text-align: center;
  margin-bottom: 5px;
`;

export const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  width: 100%;
  align-items: center;
`;

export const SiteCard = styled.div<{ $active?: boolean }>`
  width: 130px;
  height: 75px;
  background-color: #8e44ad;
  color: #fff;
  border: 2px solid #9b59b6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  opacity: ${props => (props.$active ? 1 : 0.4)};
`;