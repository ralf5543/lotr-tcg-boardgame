/** startOfFellowship → fellowship. Un seul nom affiché pour le début et la phase. */
export function canonicalPhaseName(phase?: string | null): string {
    if (!phase) return '';
    return phase.replace(/^startOf/i, '').toLowerCase();
}
