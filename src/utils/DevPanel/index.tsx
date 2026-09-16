import React, { useState } from 'react';
import * as S from './styles';
import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../../game/types';
import { getThreatLimit } from '../../game/logic/threats';

export interface DevMoves {
    devSetPhase: (phase: string) => void;
    devSetTwilight: (amount: number) => void;
    devSetBurdens?: (amount: number) => void;
    devSetThreats: (amount: number) => void;
    devSetArchery?: (amount: number) => void;
    devSetCurrentSite?: (siteIndex: number) => void;
    devLoadPreset: (presetName: string) => void;
    devForceEndPhase: () => void;
}

export interface DevPanelProps {
    moves: BoardProps<GameState>['moves'] & DevMoves;
    G: GameState;
    ctx: BoardProps<GameState>['ctx'];
    onDrawCard: () => void;
    deckCount: number;
}

// Map chaque phase vers sa sub-phase "startOf" correspondante
const PHASE_MAPPING: Record<string, { startPhase: string; label: string }> = {
    fellowship: { startPhase: 'startOfFellowship', label: 'fellowship' },
    shadow: { startPhase: 'startOfShadow', label: 'shadow' },
    maneuver: { startPhase: 'startOfManeuver', label: 'maneuver' },
    archery: { startPhase: 'startOfArchery', label: 'archery' },
    assignment: { startPhase: 'startOfAssignment', label: 'assignment' },
    skirmish: { startPhase: 'startOfSkirmish', label: 'skirmish' },
    regroup: { startPhase: 'startOfRegroup', label: 'regroup' },
};

export const DevPanel: React.FC<DevPanelProps> = ({
    moves,
    G,
    ctx,
    onDrawCard,
    deckCount,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    if (process.env.NODE_ENV === 'production') return null;

    const currentArchery =
        G.archeryWoundsToAssign ?? G.archeryState?.fpTotal ?? 0;
    const currentPhase = ctx.phase || '';
    const fpId = G.fpPlayerId || '0';
    const currentSiteIndex =
        G.players[fpId]?.currentSiteIndex ?? G.currentSiteIndex ?? 0;
    const currentSite = G.path?.[currentSiteIndex] ?? null;
    const currentSiteLabel =
        currentSite?.name ||
        (currentSite as { title?: string } | null)?.title ||
        (currentSite ? currentSite.id : 'vide');

    return (
        <S.PanelContainer>
            <S.ToggleButton onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '✕ Fermer Dev Tools' : '🛠️ Dev Tools'}
            </S.ToggleButton>

            {isOpen && (
                <S.PanelContent>
                    <S.Title>Panneau de Test</S.Title>

                    {/* Sauts de Phase (Lancement au début de la phase) */}
                    <S.Section>
                        <S.Label>Sauter au début de :</S.Label>
                        <S.PhaseGrid>
                            {Object.entries(PHASE_MAPPING).map(
                                ([key, config]) => {
                                    const isActive =
                                        currentPhase === key ||
                                        currentPhase === config.startPhase;

                                    return (
                                        <S.PhaseButton
                                            key={key}
                                            $isActive={isActive}
                                            onClick={() =>
                                                moves.devSetPhase(
                                                    config.startPhase
                                                )
                                            }
                                        >
                                            {config.label}
                                        </S.PhaseButton>
                                    );
                                }
                            )}
                        </S.PhaseGrid>
                    </S.Section>

                    {/* Site courant */}
                    <S.Section>
                        <S.Label>
                            Site courant :{' '}
                            <strong style={{ color: '#a3e635' }}>
                                {currentSiteIndex + 1}
                            </strong>
                            {' — '}
                            {currentSiteLabel}
                        </S.Label>
                        <S.SiteGrid>
                            {Array.from({ length: 9 }, (_, index) => {
                                const site = G.path?.[index] ?? null;
                                const occupied = Boolean(site);
                                const kwHint =
                                    index === 2 ||
                                    index === 5 ||
                                    site?.keywords?.includes('SANCTUARY')
                                        ? 'S'
                                        : site?.keywords?.[0]?.[0] || '';
                                return (
                                    <S.SiteButton
                                        key={index}
                                        $isActive={index === currentSiteIndex}
                                        $isEmpty={!occupied}
                                        onClick={() =>
                                            moves.devSetCurrentSite?.(index)
                                        }
                                        title={
                                            site
                                                ? `${site.name}${
                                                      index === 2 || index === 5
                                                          ? ' (sanctuaire)'
                                                          : ''
                                                  }${
                                                      site.keywords?.length
                                                          ? ` — ${site.keywords.join(', ')}`
                                                          : ''
                                                  }`
                                                : `Emplacement ${index + 1} vide`
                                        }
                                    >
                                        {index + 1}
                                        {kwHint ? (
                                            <S.SiteKwHint>{kwHint}</S.SiteKwHint>
                                        ) : null}
                                    </S.SiteButton>
                                );
                            })}
                        </S.SiteGrid>
                        <S.Hint>
                            Standard : sanctuaire = cases 3 et 6 (badge S). Y aller
                            puis « fellowship » pour le toaster de soins.
                        </S.Hint>
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
                        </S.ButtonGroup>
                    </S.Section>

                    {/* Burdens / Charges */}
                    <S.Section>
                        <S.Label>
                            Burdens (FP) :{' '}
                            <strong style={{ color: '#ef4444' }}>
                                {G.players[fpId]?.burdens ?? 0}
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

                    <S.Section>
                        <S.Label>
                            Menaces (FP) :{' '}
                            <strong style={{ color: '#f87171' }}>
                                {G.players[fpId]?.threats ?? 0}
                            </strong>
                            {' / '}
                            {getThreatLimit(G)}
                        </S.Label>
                        <S.ButtonGroup>
                            <S.ActionButton
                                onClick={() => moves.devSetThreats(-1)}
                            >
                                -1
                            </S.ActionButton>
                            <S.ActionButton
                                onClick={() => moves.devSetThreats(1)}
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
                                onClick={() =>
                                    moves.devSetArchery?.(currentArchery - 1)
                                }
                            >
                                -1
                            </S.ActionButton>
                            <S.ActionButton
                                onClick={() =>
                                    moves.devSetArchery?.(currentArchery + 1)
                                }
                            >
                                +1
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
                        <S.PresetButton
                            onClick={() => moves.devLoadPreset('SITES_TEST')}
                        >
                            Sites (chemin + mots-clés)
                        </S.PresetButton>
                        <S.GameButton $bgColor="#3498db" onClick={onDrawCard}>
                            🃏 Piocher ({deckCount})
                        </S.GameButton>
                    </S.Section>
                </S.PanelContent>
            )}
        </S.PanelContainer>
    );
};
