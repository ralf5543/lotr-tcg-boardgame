import type { Ability, CardState } from '../../types';

export function abilityMatchesPhase(ability: Ability, rawPhase: string): boolean {
    const currentPhase = (rawPhase || '').toUpperCase();
    const normalizedPhase = (rawPhase || '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase();

    return ability.phases.some((phase) => {
        const upper = phase.toUpperCase();
        return upper === currentPhase || upper === normalizedPhase;
    });
}

export function collectCardAbilities(
    card: CardState
): { source: CardState; ability: Ability }[] {
    const rows: { source: CardState; ability: Ability }[] = [];

    for (const ability of card.abilities || []) {
        rows.push({ source: card, ability });
    }

    for (const attachment of card.attachments || []) {
        if (!attachment) continue;
        for (const ability of attachment.abilities || []) {
            rows.push({ source: attachment, ability });
        }
    }

    return rows;
}

export function cardOrAttachmentsHaveActionPhases(card: CardState): boolean {
    const hasOwn = Boolean(
        (card.actionPhases && card.actionPhases.length > 0) ||
            (card.abilities && card.abilities.length > 0)
    );
    if (hasOwn) return true;

    return Boolean(
        card.attachments?.some(
            (att) =>
                (att.actionPhases && att.actionPhases.length > 0) ||
                (att.abilities && att.abilities.length > 0)
        )
    );
}

export function formatAbilityLabel(
    ability: Ability,
    source: CardState
): string {
    const exert = ability.cost[0]?.exert?.[0];
    const count = exert?.count || 1;
    const who =
        exert?.target === 'BEARER'
            ? 'le détenteur'
            : Array.isArray(exert?.target)
              ? exert.target.flat().join(' ')
              : source.i18n?.fr?.title || source.title || 'cette carte';
    const times = count > 1 ? ` ${count} fois` : '';

    if (ability.effect.type === 'ADD_TEMP_STAT') {
        const statLabels: Record<string, string> = {
            STRENGTH: 'force',
            VITALITY: 'vitalité',
            RESISTANCE: 'résistance',
            TWILIGHT_COST: 'crépuscule',
        };
        const sign = ability.effect.value > 0 ? '+' : '';
        const stat =
            statLabels[ability.effect.stat] || ability.effect.stat.toLowerCase();
        return `Affaiblir ${who}${times} : ${stat} ${sign}${ability.effect.value}`;
    }

    const keyword = ability.effect.keyword
        ? ability.effect.keyword.toLowerCase()
        : '';
    return `Affaiblir ${who}${times} : ${keyword}`;
}
