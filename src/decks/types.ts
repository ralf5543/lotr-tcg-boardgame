/** Configuration de deck (même forme que les JSON / deckLoader). */
export interface DeckConfig {
    id: string;
    name: string;
    ringBearerId: string;
    oneRingId: string;
    startingCompanionIds: string[];
    freePeople: string[];
    shadow: string[];
    siteIds: string[];
}

export type DeckIssueSeverity = 'error' | 'warning';

export interface DeckIssue {
    code: string;
    severity: DeckIssueSeverity;
    message: string;
}

export interface DeckValidationResult {
    ok: boolean;
    errors: DeckIssue[];
    warnings: DeckIssue[];
}

export interface SelectedDecks {
    '0': string;
    '1': string;
}
