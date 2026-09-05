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

function formatEffectBit(effect: Ability['effects'][number]): string {
    if (effect.type === 'ADD_TEMP_STAT') {
        const statLabels: Record<string, string> = {
            STRENGTH: 'force',
            VITALITY: 'vitalité',
            RESISTANCE: 'résistance',
            TWILIGHT_COST: 'crépuscule',
        };
        const sign = effect.value > 0 ? '+' : '';
        const stat = statLabels[effect.stat] || effect.stat.toLowerCase();
        return `${stat} ${sign}${effect.value}`;
    }
    return effect.keyword ? effect.keyword.toLowerCase() : '';
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
    const bits = (ability.effects || [])
        .map(formatEffectBit)
        .filter(Boolean)
        .join(' et ');
    return `Affaiblir ${who}${times} : ${bits}`;
}
