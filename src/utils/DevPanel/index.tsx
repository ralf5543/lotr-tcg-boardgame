import React, { useState } from 'react';
import * as S from './styles';
import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../../game/types';

export interface DevMoves {
    devSetPhase: (phase: string) => void;
    devSetTwilight: (amount: number) => void;
    devSetBurdens?: (amount: number) => void;
    devSetArchery?: (amount: number) => void; // 🏹 Nouveau move pour l'archerie
    devLoadPreset: (presetName: string) => void;
    devForceEndPhase: () => void;
}

export interface DevPanelProps {
    moves: BoardProps<GameState>['moves'] & DevMoves;
    G: GameState;
    ctx: BoardProps<GameState>['ctx'];
}

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

    const currentArchery = G.archeryWoundsToAssign ?? G.archeryState?.fpTotal ?? 0;

    return (
        <S.PanelContainer>
            <S.ToggleButton onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '✕ Fermer Dev Tools' : '🛠️ Dev Tools'}
            </S.ToggleButton>

            {isOpen && (
                <S.PanelContent>
                    <S.Title>Panneau de Test</S.Title>

                    {/* Sauts de Phase */}
                    <S.Section>
                        <S.Label>Sauter à la phase :</S.Label>
                        <S.PhaseGrid>
                            {ALL_PHASES.map((phase) => (
                                <S.PhaseButton
                                    key={phase}
                                    $isActive={ctx.phase === phase}
                                    onClick={() => moves.devSetPhase(phase)}
                                >
                                    {phase}
                                </S.PhaseButton>
                            ))}
                        </S.PhaseGrid>
                    </S.Section>

                    {/* Twilight Pool */}
                    <S.Section>
                        <S.Label>
                            Twilight Pool :{' '}
                            <strong style={{ color: '#fbbf24' }}>
                                {G.twilightPool}
                            </strong>
                        </S.Label>
                        <S.ButtonGroup>
                            <S.ActionButton
                                onClick={() =>
                                    moves.devSetTwilight(G.twilightPool - 1)
                                }
                            >
                                -1
                            </S.ActionButton>
                            <S.ActionButton
                                onClick={() =>
                                    moves.devSetTwilight(G.twilightPool + 1)
                                }
                            >
                                +1
                            </S.ActionButton>
                            <S.ActionButton
                                style={{
                                    backgroundColor: '#451a03',
                                    color: '#fcd34d',
                                    borderColor: '#78350f',
                                }}
                                onClick={() => moves.devSetTwilight(10)}
                            >
                                Force 10
                            </S.ActionButton>
                        </S.ButtonGroup>
                    </S.Section>

                    {/* Burdens / Charges */}
                    <S.Section>
                        <S.Label>
                            Burdens (FP) :{' '}
                            <strong style={{ color: '#ef4444' }}>
                                {G.players[G.fpPlayerId || '0']?.burdens ?? 0}
                            </strong>
                        </S.Label>
                        <S.ButtonGroup>
                            <S.ActionButton
                                onClick={() => moves.devSetBurdens?.(-1)}
                            >
                                -1
                            </S.ActionButton>
                            <S.ActionButton
                                onClick={() => moves.devSetBurdens?.(1)}
                            >
                                +1
                            </S.ActionButton>
                        </S.ButtonGroup>
                    </S.Section>

                    {/* 🏹 Archerie Dev Tool */}
                    <S.Section>
                        <S.Label>
                            Blessures d'Archerie :{' '}
                            <strong style={{ color: '#38bdf8' }}>
                                {currentArchery}
                            </strong>
                        </S.Label>
                        <S.ButtonGroup>
                            <S.ActionButton
                                onClick={() => moves.devSetArchery?.(currentArchery - 1)}
                            >
                                -1
                            </S.ActionButton>
                            <S.ActionButton
                                onClick={() => moves.devSetArchery?.(currentArchery + 1)}
                            >
                                +1
                            </S.ActionButton>
                            <S.ActionButton
                                style={{
                                    backgroundColor: '#0c4a6e',
                                    color: '#7dd3fc',
                                    borderColor: '#0284c7',
                                }}
                                onClick={() => moves.devSetArchery?.(5)}
                            >
                                Force 5
                            </S.ActionButton>
                        </S.ButtonGroup>
                    </S.Section>

                    {/* Preset de cartes */}
                    <S.Section>
                        <S.Label>Presets cartes & Déblocage :</S.Label>
                        <S.PresetButton
                            onClick={() => moves.devLoadPreset('ARCHERY_TEST')}
                        >
                            🏹 Charger Legolas vs Nazgûl
                        </S.PresetButton>
                        <S.ActionButton
                            style={{
                                marginTop: '4px',
                                backgroundColor: '#3b0764',
                                borderColor: '#6b21a8',
                            }}
                            onClick={() => moves.devForceEndPhase()}
                        >
                            ⏩ Force End Phase
                        </S.ActionButton>
                    </S.Section>
                </S.PanelContent>
            )}
        </S.PanelContainer>
    );
};