import React, { useState } from 'react';
import styled from 'styled-components';

interface DevPanelProps {
    moves: any;
    G: any;
    ctx: any;
}

const PanelContainer = styled.div`
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
`;

const ToggleButton = styled.button`
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

const PanelContent = styled.div`
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

const Title = styled.h3`
    margin: 0;
    color: #fbbf24;
    text-transform: uppercase;
    border-bottom: 1px solid #334155;
    padding-bottom: 4px;
    letter-spacing: 0.05em;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.label`
    color: #94a3b8;
    font-weight: 600;
`;

const PhaseGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
`;

const PhaseButton = styled.button<{ $isActive: boolean }>`
    padding: 4px 6px;
    border-radius: 4px;
    text-align: left;
    border: 1px solid #334155;
    background-color: ${(props) => (props.$isActive ? '#d97706' : '#1e293b')};
    color: #ffffff;
    cursor: pointer;
    font-weight: ${(props) => (props.$isActive ? 'bold' : 'normal')};

    &:hover {
        background-color: ${(props) => (props.$isActive ? '#d97706' : '#334155')};
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 6px;
`;

const ActionButton = styled.button`
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

const PresetButton = styled.button`
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

const ALL_PHASES = [
    'fellowship',
    'shadow',
    'maneuver',
    'archery',
    'assignment',
    'skirmish',
    'regroup',
];

export const DevPanel: React.FC<DevPanelProps> = ({ moves, G, ctx }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (process.env.NODE_ENV === 'production') return null;

    return (
        <PanelContainer>
            <ToggleButton onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '✕ Fermer Dev Tools' : '🛠️ Dev Tools'}
            </ToggleButton>

            {isOpen && (
                <PanelContent>
                    <Title>Panneau de Test</Title>

                    {/* Sauts de Phase */}
                    <Section>
                        <Label>Sauter à la phase :</Label>
                        <PhaseGrid>
                            {ALL_PHASES.map((phase) => (
                                <PhaseButton
                                    key={phase}
                                    $isActive={ctx.phase === phase}
                                    onClick={() => {
        console.log("--> Dispatch devSetPhase:", phase, moves);
        if (moves && moves.devSetPhase) {
            moves.devSetPhase(phase);
        } else {
            console.error("❌ L'objet 'moves' n'est pas connecté à boardgame.io !");
        }
    }}
                                >
                                    {phase}
                                </PhaseButton>
                            ))}
                        </PhaseGrid>
                    </Section>

                    {/* Twilight Pool */}
                    <Section>
                        <Label>
                            Twilight Pool : <strong style={{ color: '#fbbf24' }}>{G.twilightPool}</strong>
                        </Label>
                        <ButtonGroup>
                            <ActionButton onClick={() => moves.devSetTwilight(G.twilightPool - 1)}>-1</ActionButton>
                            <ActionButton onClick={() => moves.devSetTwilight(G.twilightPool + 1)}>+1</ActionButton>
                            <ActionButton
                                style={{ backgroundColor: '#451a03', color: '#fcd34d', borderColor: '#78350f' }}
                                onClick={() => moves.devSetTwilight(10)}
                            >
                                Force 10
                            </ActionButton>
                        </ButtonGroup>
                    </Section>

                    {/* Preset de cartes */}
                    <Section>
                        <Label>Presets cartes & Déblocage :</Label>
                        <PresetButton onClick={() => moves.devLoadPreset('ARCHERY_TEST')}>
                            🏹 Charger Legolas vs Nazgûl
                        </PresetButton>
                        <ActionButton
                            style={{ marginTop: '4px', backgroundColor: '#3b0764', borderColor: '#6b21a8' }}
                            onClick={() => moves.devForceEndPhase()}
                        >
                            ⏩ Force End Phase
                        </ActionButton>
                    </Section>
                </PanelContent>
            )}
        </PanelContainer>
    );
};