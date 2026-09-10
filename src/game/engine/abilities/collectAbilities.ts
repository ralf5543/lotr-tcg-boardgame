import type { Ability, CardKeyword, CardState } from '../../types';
import { TRANSLATIONS } from '../../translations';

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

function translateCriterionToken(token: string): string {
    const upper = token.toUpperCase();
    const typeLabel = TRANSLATIONS.type[upper as keyof typeof TRANSLATIONS.type];
    if (typeLabel) return typeLabel.toLowerCase();

    const raceLabel = TRANSLATIONS.race[upper as keyof typeof TRANSLATIONS.race];
    if (raceLabel) return raceLabel.toLowerCase();

    const cultureLabel =
        TRANSLATIONS.culture[upper as keyof typeof TRANSLATIONS.culture];
    if (cultureLabel) return cultureLabel.toLowerCase();

    const keywordLabel =
        TRANSLATIONS.keyword[token as CardKeyword]?.label ||
        TRANSLATIONS.keyword[upper as CardKeyword]?.label;
    if (keywordLabel) return keywordLabel.toLowerCase();

    return token.toLowerCase();
}

function translateKeyword(keyword: CardKeyword | string): string {
    return (
        TRANSLATIONS.keyword[keyword as CardKeyword]?.label ||
        String(keyword)
    );
}

function formatEffectBit(effect: Ability['effects'][number]): string {
    if (effect.type === 'WOUND') {
        return `blesser un ${TRANSLATIONS.type.MINION.toLowerCase()}`;
    }
    if (effect.type === 'PREVENT_WOUND') {
        return 'empêcher cette blessure';
    }
    if (effect.type === 'WEAR_RING') {
        return 'mettre l’Anneau Unique';
    }
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
    if (effect.type === 'ADD_TEMP_KEYWORD') {
        return translateKeyword(effect.keyword);
    }
    return '';
}

function formatCostLabel(ability: Ability, source: CardState): string {
    const option = ability.cost[0];
    const parts: string[] = [];
    const exert = option?.exert?.[0];
    if (exert) {
        const count = exert.count || 1;
        const who = (() => {
            if (exert.target === 'BEARER') return 'le détenteur';
            if (Array.isArray(exert.target)) {
                const label = exert.target
                    .flat()
                    .map(translateCriterionToken)
                    .join(' ');
                if (exert.mode === 'DESIGNATION') {
                    return `un ${label}`;
                }
                return label;
            }
            return source.i18n?.fr?.title || source.title || 'cette carte';
        })();
        const times = count > 1 ? ` ${count} fois` : '';
        parts.push(`Affaiblir ${who}${times}`);
    }
    if (option?.addTwilight && option.addTwilight > 0) {
        parts.push(
            `ajouter <symbol>twilight${option.addTwilight}</symbol>`
        );
    }
    return parts.join(' et ');
}

export function formatAbilityLabelParts(
    ability: Ability,
    source: CardState
): { cost: string; effect: string } {
    return {
        cost: formatCostLabel(ability, source),
        effect: (ability.effects || [])
            .map(formatEffectBit)
            .filter(Boolean)
            .join(' et '),
    };
}
