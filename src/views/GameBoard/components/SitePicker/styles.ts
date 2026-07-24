import styled from 'styled-components';

export const PickerContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const Title = styled.h4`
    margin: 0;
    color: #e2c044;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
`;

export const Grid = styled.div`
    display: flex;
    gap: 12px;
    justify-content: center;
`;

export const EmptyText = styled.div`
    color: #666;
    font-style: italic;
    font-size: 12px;
    text-align: center;
    padding: 10px;
`;