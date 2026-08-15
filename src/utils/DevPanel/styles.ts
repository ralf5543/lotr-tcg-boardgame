import styled from 'styled-components';

export const PanelContainer = styled.div`
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 10000;
    font-family:
        system-ui,
        -apple-system,
        sans-serif;
    font-size: 12px;
`;

export const ToggleButton = styled.button`
    background-color: #7f1d1d;
    color: #ffffff;
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #991b1b;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);

    &:hover {
        background-color: #991b1b;
    }
`;

export const PanelContent = styled.div`
    margin-top: 8px;
    width: 320px;
    background-color: #0f172a;
    color: #f8fafc;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    border: 1px solid #334155;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const Title = styled.h3`
    margin: 0;
    color: #fbbf24;
    text-transform: uppercase;
    border-bottom: 1px solid #334155;
    padding-bottom: 4px;
    letter-spacing: 0.05em;
`;

export const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const Label = styled.label`
    color: #94a3b8;
    font-weight: 600;
`;

export const PhaseGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
`;

export const PhaseButton = styled.button<{ $isActive: boolean }>`
    padding: 4px 6px;
    border-radius: 4px;
    text-align: left;
    border: 1px solid #334155;
    background-color: ${(props) => (props.$isActive ? '#d97706' : '#1e293b')};
    color: #ffffff;
    cursor: pointer;
    font-weight: ${(props) => (props.$isActive ? 'bold' : 'normal')};

    &:hover {
        background-color: ${(props) =>
            props.$isActive ? '#d97706' : '#334155'};
    }
`;

export const ButtonGroup = styled.div`
    display: flex;
    gap: 6px;
`;

export const ActionButton = styled.button`
    padding: 4px 8px;
    background-color: #1e293b;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background-color: #334155;
    }
`;

export const PresetButton = styled.button`
    width: 100%;
    padding: 6px;
    background-color: #1e1b4b;
    color: #c7d2fe;
    border: 1px solid #3730a3;
    border-radius: 4px;
    cursor: pointer;
    text-align: left;

    &:hover {
        background-color: #312e81;
    }
`;

export const GameButton = styled.button<{ $bgColor: string }>`
    background-color: ${(props) => props.$bgColor};
    color: white;
    border: none;
    padding: 10px 14px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    font-size: 13px;
    transition: filter 0.1s;

    &:hover {
        filter: brightness(1.1);
    }
`;