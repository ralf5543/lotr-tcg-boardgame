import type { Ability, AbilityTargetRef, CardKeyword, CardState, CostSelector, GameState } from '../../types';
import { TRANSLATIONS } from '../../translations';
import { forEachInPlayCard, resolveCostTarget } from './resolveCostTarget';

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

function exertTargetIsOtherCharacter(ability: Ability): boolean {
    const exert = ability.cost?.[0]?.exert?.[0];
    if (!exert) return false;
    return exert.target !== 'SELF' && exert.target !== 'BEARER';
}

export function abilityProjectsOnto(
    G: GameState,
    source: CardState,
    ability: Ability,
    host: CardState
): boolean {
    if (!exertTargetIsOtherCharacter(ability)) return false;
    if (
        source.type === 'COMPANION' ||
        source.type === 'ALLY' ||
        source.type === 'MINION'
    ) {
        return false;
    }
    const sourceId = source.instanceId || source.id;
    const hostId = host.instanceId || host.id;
    if (sourceId === hostId) return false;
    const exert = ability.cost[0]?.exert?.[0];
    if (!exert) return false;
    return resolveCostTarget(G, source, exert.target).some(
        (card) => (card.instanceId || card.id) === hostId
    );
}

export function collectProjectedAbilities(
    G: GameState,
    host: CardState
): { source: CardState; ability: Ability }[] {
    const rows: { source: CardState; ability: Ability }[] = [];
    forEachInPlayCard(G, (card) => {
        if ((card.instanceId || card.id) === (host.instanceId || host.id)) {
            return;
        }
        for (const ability of card.abilities || []) {
            if (abilityProjectsOnto(G, card, ability, host)) {
                rows.push({ source: card, ability });
            }
        }
    });
    return rows;
}

/** Capacités affichées sur cette carte : les siennes (sauf celles qui s’exercent sur un autre) + attachements + projections. */
export function collectVisibleAbilities(
    G: GameState | undefined,
    card: CardState
): { source: CardState; ability: Ability }[] {
    const own = collectCardAbilities(card).filter(
        ({ ability }) => ability.trigger?.type !== 'WHEN_PLAYED'
    );
    if (!G) return own;
    return [...own, ...collectProjectedAbilities(G, card)];
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
    if (typeLabel) return typeLabel;

    const raceLabel = TRANSLATIONS.race[upper as keyof typeof TRANSLATIONS.race];
    if (raceLabel) return raceLabel;

    const cultureLabel =
        TRANSLATIONS.culture[upper as keyof typeof TRANSLATIONS.culture];
    if (cultureLabel) return cultureLabel.toLowerCase();

    const keywordLabel =
        TRANSLATIONS.keyword[token as CardKeyword]?.label ||
        TRANSLATIONS.keyword[upper as CardKeyword]?.label;
    if (keywordLabel) return keywordLabel.toLowerCase();

    if (token !== token.toUpperCase()) return token;
    return token.toLowerCase();
}

function formatFilterList(tokens: string[]): string {
    const unbound = tokens.filter((token) => token.toUpperCase() === 'UNBOUND');
    const rest = tokens.filter((token) => token.toUpperCase() !== 'UNBOUND');
    return [...rest, ...unbound].map(translateCriterionToken).join(' ');
}

function formatTargetPhrase(target: AbilityTargetRef | undefined): string | null {
    if (!target || target === 'SELF' || target === 'BEARER' || target === 'WINNER') return null;
    if (target === 'SKIRMISHING') return 'un personnage au combat';
    if (Array.isArray(target)) {
        return `un ${formatFilterList(target.flat())}`;
    }
    return null;
}

function translateKeyword(keyword: CardKeyword | string): string {
    return (
        TRANSLATIONS.keyword[keyword as CardKeyword]?.label ||
        String(keyword)
    );
}

function formatEffectBit(
    effect: Ability['effects'][number],
    source: CardState
): string {
    if (effect.type === 'WOUND') {
        if (effect.target === 'SKIRMISHING') {
            return 'blesser un personnage au combat';
        }
        if (Array.isArray(effect.target)) {
            return `blesser un ${formatFilterList(effect.target.flat())}`;
        }
        return 'blesser';
    }
    if (effect.type === 'ADD_TWILIGHT') {
        return `ajouter <symbol>twilight${effect.count}</symbol>`;
    }
    if (effect.type === 'DRAW') {
        return `piocher ${effect.count} carte${effect.count > 1 ? 's' : ''}`;
    }
    if (effect.type === 'HEAL') {
        const who = formatTargetPhrase(effect.target);
        return who ? `guérir ${who}` : 'guérir';
    }
    if (effect.type === 'DISCARD') {
        const who = formatTargetPhrase(effect.target);
        return who ? `défausser ${who}` : 'défausser';
    }
    if (effect.type === 'PREVENT_WOUND') {
        return 'empêcher cette blessure';
    }
    if (effect.type === 'WEAR_RING') {
        return 'mettre l’Anneau Unique';
    }
    if (effect.type === 'MAKE_RING_BEARER') {
        return `devenir Porteur de l’Anneau (résistance ${effect.resistance})`;
    }
    if (effect.type === 'ALLOW_SKIRMISH') {
        const who = source.i18n?.fr?.title || source.title || 'ce personnage';
        return `permettre à ${who} de combattre`;
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
        const bit = `${stat} ${sign}${effect.value}`;
        const who = formatTargetPhrase(effect.target);
        return who ? `${bit} à ${who}` : bit;
    }
    if (effect.type === 'ADD_TEMP_KEYWORD') {
        const bit = translateKeyword(effect.keyword);
        const who = formatTargetPhrase(effect.target);
        return who ? `${bit} à ${who}` : bit;
    }
    return '';
}

function formatCostWho(
    target: CostSelector['target'] | undefined,
    source: CardState,
    asDesignation: boolean
): string {
    if (target === 'BEARER') return 'le détenteur';
    if (Array.isArray(target)) {
        const label = formatFilterList(target.flat());
        if (asDesignation) return `un ${label}`;
        return label;
    }
    return source.i18n?.fr?.title || source.title || 'cette carte';
}

function formatCostLabel(ability: Ability, source: CardState): string {
    const option = ability.cost[0];
    const parts: string[] = [];
    const exert = option?.exert?.[0];
    if (exert) {
        const count = exert.count || 1;
        const who = formatCostWho(
            exert.target,
            source,
            exert.mode === 'DESIGNATION'
        );
        const times = count > 1 ? ` ${count} fois` : '';
        parts.push(`Affaiblir ${who}${times}`);
    }
    const spot = option?.spot?.[0];
    if (spot) {
        parts.push(`Désigner ${formatCostWho(spot.target, source, false)}`);
    }
    if (option?.addTwilight && option.addTwilight > 0) {
        parts.push(
            `ajouter <symbol>twilight${option.addTwilight}</symbol>`
        );
    }
    if (option?.removeTwilight && option.removeTwilight > 0) {
        parts.push(
            `retirer <symbol>twilight${option.removeTwilight}</symbol>`
        );
    }
    if (option?.spotTwilight && option.spotTwilight > 0) {
        parts.push(
            `désigner <symbol>twilight${option.spotTwilight}</symbol>`
        );
    }
    if (option?.discardFromPlay?.length) {
        parts.push('Défausser cette carte');
    }
    if (option?.discardFromHand && option.discardFromHand > 0) {
        const n = option.discardFromHand;
        parts.push(
            `Défausser ${n} carte${n > 1 ? 's' : ''} de la main`
        );
    }
    return parts.join(' et ');
}

function capitalizeLabel(text: string): string {
    if (!text) return text;
    if (text.startsWith('<')) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatAbilityLabelParts(
    ability: Ability,
    source: CardState
): { cost: string; effect: string } {
    return {
        cost: capitalizeLabel(formatCostLabel(ability, source)),
        effect: (ability.effects || [])
            .map((effect) => formatEffectBit(effect, source))
            .filter(Boolean)
            .join(' et '),
    };
}
