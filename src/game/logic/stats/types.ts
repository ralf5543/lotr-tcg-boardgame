export type StatType = 'STRENGTH' | 'VITALITY' | 'RESISTANCE' | 'TWILIGHT_COST';

export type ModifierScope = 'SKIRMISH' | 'PHASE' | 'TURN' | 'PERMANENT';

export interface StatModifier {
    id: string;
    sourceCardTitle?: string; // ex: "Épée d'Elendil", "Attaque surprise"
    targetCardId: string;
    stat: StatType;
    value: number;
    scope: ModifierScope;
    expiresAtPhase?: 'REGROUP' | 'SKIRMISH' | 'TURN_END';
}