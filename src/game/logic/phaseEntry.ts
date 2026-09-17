/**
 * Entrée dans une phase jouable : toujours via startOfXXX.
 *
 * startOfXXX n’est jamais zappée. Si rien n’est jouable, son onBegin
 * enchaîne tout de suite vers la phase réelle (passage transparent).
 */

export const PLAY_PHASES = [
    'fellowship',
    'shadow',
    'maneuver',
    'archery',
    'assignment',
    'skirmish',
    'regroup',
] as const;

export type PlayPhase = (typeof PLAY_PHASES)[number];

export type StartOfPlayPhase =
    | 'startOfFellowship'
    | 'startOfShadow'
    | 'startOfManeuver'
    | 'startOfArchery'
    | 'startOfAssignment'
    | 'startOfSkirmish'
    | 'startOfRegroup';

const ENTRY: Record<PlayPhase, StartOfPlayPhase> = {
    fellowship: 'startOfFellowship',
    shadow: 'startOfShadow',
    maneuver: 'startOfManeuver',
    archery: 'startOfArchery',
    assignment: 'startOfAssignment',
    skirmish: 'startOfSkirmish',
    regroup: 'startOfRegroup',
};

type PhaseEvents = { setPhase?: (phase: string) => void };

/** Phase d’entrée obligatoire pour une phase jouable. */
export function enterPhase(phase: PlayPhase): StartOfPlayPhase {
    return ENTRY[phase];
}

/**
 * Sortie transparente de startOfXXX → phase réelle.
 * Seul point autorisé à setPhase vers une phase jouable.
 */
export function exitStartOf(
    events: PhaseEvents | undefined,
    phase: PlayPhase
): void {
    events?.setPhase?.(phase);
}

export function isPlayPhase(phase: string): phase is PlayPhase {
    return (PLAY_PHASES as readonly string[]).includes(phase);
}

export function isStartOfPlayPhase(phase: string): phase is StartOfPlayPhase {
    return (Object.values(ENTRY) as string[]).includes(phase);
}
