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

/** Coût « discard this » : le bouton reste sur la source, pas de projection. */
function abilityDiscardsSelf(ability: Ability): boolean {
    return (ability.cost?.[0]?.discardFromPlay || []).some(
        (req) => req.target === 'SELF'
    );
}

export function abilityProjectsOnto(
    G: GameState,
    source: CardState,
    ability: Ability,
    host: CardState
): boolean {
    if (!exertTargetIsOtherCharacter(ability)) return false;
    // Forests of Ithilien & co. : défausse self + affaiblir un autre → bouton sur la situation.
    if (abilityDiscardsSelf(ability)) return false;
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
        ({ ability }) =>
            ability.trigger?.type !== 'WHEN_PLAYED' &&
            ability.trigger?.type !== 'YOU_PLAY' &&
            ability.trigger?.type !== 'WHILE'
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

/** Cultures reconnues pour le rendu en `<symbol>…</symbol>` (FormattedText). */
const CULTURE_TOKENS = new Set([
    'DUNLAND',
    'DWARVEN',
    'ELVEN',
    'GANDALF',
    'GOLLUM',
    'GONDOR',
    'ISENGARD',
    'MEN',
    'MORIA',
    'ORC',
    'RAIDER',
    'WRAITH',
    'ROHAN',
    'SAURON',
    'SHIRE',
    'URUK-HAI',
]);

const TYPE_TOKENS = new Set(Object.keys(TRANSLATIONS.type));
const RACE_TOKENS = new Set(Object.keys(TRANSLATIONS.race));

/**
 * Jetons à la fois culture et race (ORC, WRAITH, URUK-HAI…).
 * Mot nu dans le gametext = race ; `<symbol>` = culture.
 * Au formatage on départage via le contexte des autres jetons.
 */
const AMBIGUOUS_CULTURE_RACE = new Set(
    [...CULTURE_TOKENS].filter((token) => RACE_TOKENS.has(token))
);

function cultureSymbol(token: string): string {
    return `<symbol>${token.toLowerCase()}</symbol>`;
}

function translateCriterionToken(token: string): string {
    const upper = token.toUpperCase();
    if (upper.startsWith('SIGNET_')) {
        const name = upper.slice('SIGNET_'.length);
        const pretty = name.charAt(0) + name.slice(1).toLowerCase();
        return `sceau ${pretty}`;
    }
    // Culture non ambiguë → symbole. Ambigu (ORC…) → race en priorité
    // (le symbole culture n’est émis que via cultureSymbol dans formatFilterList).
    if (CULTURE_TOKENS.has(upper) && !AMBIGUOUS_CULTURE_RACE.has(upper)) {
        return cultureSymbol(upper);
    }
    const typeLabel = TRANSLATIONS.type[upper as keyof typeof TRANSLATIONS.type];
    if (typeLabel) return typeLabel;

    const raceLabel = TRANSLATIONS.race[upper as keyof typeof TRANSLATIONS.race];
    if (raceLabel) return raceLabel;

    const cultureLabel =
        TRANSLATIONS.culture[upper as keyof typeof TRANSLATIONS.culture];
    if (cultureLabel) return cultureSymbol(upper);

    const keywordLabel =
        TRANSLATIONS.keyword[token as CardKeyword]?.label ||
        TRANSLATIONS.keyword[upper as CardKeyword]?.label;
    if (keywordLabel) return keywordLabel.toLowerCase();

    if (token !== token.toUpperCase()) return token;
    return token.toLowerCase();
}

/**
 * Sépare culture / race / type. Pour ORC / WRAITH / URUK-HAI :
 * - déjà une culture claire (SAURON…) → race (« sauron Orc »)
 * - type ou race claire (minion, Man…) → culture (« orc minion »)
 * - seul → race (mot nu, pas symbole)
 */
function partitionFilterTokens(tokens: string[]): {
    cultures: string[];
    races: string[];
    types: string[];
    other: string[];
} {
    const upper = tokens.map((token) => token.toUpperCase());
    const types = upper.filter((token) => TYPE_TOKENS.has(token));
    const unambiguousCultures = upper.filter(
        (token) => CULTURE_TOKENS.has(token) && !RACE_TOKENS.has(token)
    );
    const unambiguousRaces = upper.filter(
        (token) => RACE_TOKENS.has(token) && !CULTURE_TOKENS.has(token)
    );
    const ambiguous = upper.filter((token) =>
        AMBIGUOUS_CULTURE_RACE.has(token)
    );

    const cultures = [...unambiguousCultures];
    const races = [...unambiguousRaces];
    for (const token of ambiguous) {
        if (unambiguousCultures.length > 0) {
            races.push(token);
        } else if (types.length > 0 || unambiguousRaces.length > 0) {
            cultures.push(token);
        } else {
            races.push(token);
        }
    }

    const classified = new Set([...cultures, ...races, ...types]);
    const other = upper.filter((token) => !classified.has(token));
    return { cultures, races, types, other };
}

function formatFilterList(tokens: string[]): string {
    // Race / classe d’abord, mot-clé ring en suffixe (« Homme associé à l’Anneau »).
    const trailing = new Set(['UNBOUND', 'RING-BOUND']);
    const suffix = tokens.filter((token) =>
        trailing.has(token.toUpperCase())
    );
    const rest = tokens.filter(
        (token) => !trailing.has(token.toUpperCase())
    );

    const { cultures, races, types, other } = partitionFilterTokens(rest);

    // Culture + race|type → « orque <symbol>sauron</symbol> » / « séide <symbol>orc</symbol> »
    // (symbole = adjectif de culture, après le nom).
    if (
        cultures.length === 1 &&
        other.length === 0 &&
        ((races.length === 1 && types.length === 0) ||
            (types.length === 1 && races.length === 0))
    ) {
        const headToken = races[0] || types[0];
        const head = translateCriterionToken(headToken).toLowerCase();
        const kw = suffix.map(translateCriterionToken).join(' ');
        const core = `${head} ${cultureSymbol(cultures[0])}`;
        return kw ? `${core} ${kw}` : core;
    }

    // Garde l’ordre d’origine des jetons ; cultures ambiguës → symbole uniquement
    // si classées comme culture (ORC + MINION), sinon race (SAURON + ORC).
    return [...rest, ...suffix]
        .map((token) => {
            const upper = token.toUpperCase();
            if (cultures.includes(upper)) return cultureSymbol(upper);
            if (races.includes(upper) && AMBIGUOUS_CULTURE_RACE.has(upper)) {
                return (
                    TRANSLATIONS.race[
                        upper as keyof typeof TRANSLATIONS.race
                    ] ?? token
                );
            }
            return translateCriterionToken(token);
        })
        .join(' ');
}

function formatTargetPhrase(target: AbilityTargetRef | undefined): string | null {
    if (!target || target === 'SELF' || target === 'BEARER' || target === 'WINNER') return null;
    if (target === 'SKIRMISHING') return 'un personnage au combat';
    if (Array.isArray(target)) {
        if (
            target.length > 1 &&
            target.every((branch) => Array.isArray(branch))
        ) {
            return target
                .map((branch) => `un ${formatFilterList(branch)}`)
                .join(' ou ');
        }
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
    if (effect.type === 'EXERT') {
        const who = formatTargetPhrase(effect.target);
        return who ? `affaiblir ${who}` : 'affaiblir';
    }
    if (effect.type === 'ADD_TWILIGHT') {
        return `ajouter <symbol>twilight${effect.count}</symbol>`;
    }
    if (effect.type === 'DRAW') {
        return `piocher ${effect.count} carte${effect.count > 1 ? 's' : ''}`;
    }
    if (effect.type === 'DISCARD_FROM_HAND') {
        const n = effect.count;
        const cards = `${n} carte${n > 1 ? 's' : ''}`;
        return effect.upTo
            ? `défausser jusqu’à ${cards} de la main`
            : `défausser ${cards} de la main`;
    }
    if (effect.type === 'REMOVE_TWILIGHT') {
        return effect.countFromSpot
            ? 'retirer <symbol>twilightX</symbol>'
            : `retirer <symbol>twilight${effect.count || 0}</symbol>`;
    }
    if (effect.type === 'REMOVE_BURDENS') {
        if (effect.countFromSpot) return 'retirer X fardeaux';
        const n = effect.count || 0;
        return `retirer ${n} fardeau${n > 1 ? 'x' : ''}`;
    }
    if (effect.type === 'REMOVE_THREATS') {
        const n = effect.count || 0;
        return `retirer ${n} menace${n > 1 ? 's' : ''}`;
    }
    if (effect.type === 'CANCEL_SKIRMISH') {
        if (effect.involving === 'BEARER') {
            return 'annuler une escarmouche impliquant le détenteur';
        }
        if (effect.involving === 'SELF') {
            return 'annuler une escarmouche impliquant ce personnage';
        }
        const who = formatTargetPhrase(effect.involving);
        return who
            ? `annuler une escarmouche impliquant ${who}`
            : 'annuler une escarmouche';
    }
    if (effect.type === 'HEAL') {
        if (effect.multiFromSpot) {
            return 'guérir X compagnons';
        }
        if (effect.countFromSpot) {
            const who = formatTargetPhrase(effect.target);
            return who ? `guérir ${who} X fois` : 'guérir X fois';
        }
        const who = formatTargetPhrase(effect.target);
        return who ? `guérir ${who}` : 'guérir';
    }
    if (effect.type === 'DISCARD') {
        const who = formatTargetPhrase(effect.target);
        return who ? `défausser ${who}` : 'défausser';
    }
    if (effect.type === 'DISCARD_ALL') {
        return 'défausser toutes les situations';
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
        const stat = statLabels[effect.stat] || effect.stat.toLowerCase();
        const bit = effect.valueFromSourceStat
            ? `ajouter sa ${stat}`
            : (() => {
                  const sign = effect.value > 0 ? '+' : '';
                  return `${stat} ${sign}${effect.value}`;
              })();
        const who = formatTargetPhrase(effect.target);
        return who ? `${bit} à ${who}` : bit;
    }
    if (effect.type === 'ADD_TEMP_KEYWORD') {
        const bit = translateKeyword(effect.keyword);
        const who = formatTargetPhrase(effect.target);
        return who ? `${bit} à ${who}` : bit;
    }
    if (effect.type === 'REPLACE_SITE') {
        if (effect.from === 'SITES_DECK') {
            if (effect.scope === 'REGION') {
                if (effect.siteKeyword) {
                    const terrain = translateKeyword(
                        effect.siteKeyword
                    ).toLowerCase();
                    return `remplacer un site de la région actuelle par un site ${terrain} du deck d’aventure`;
                }
                return 'remplacer un site de la région actuelle par un site du deck d’aventure';
            }
            if (effect.scope === 'CURRENT') {
                if (effect.siteKeyword) {
                    const terrain = translateKeyword(
                        effect.siteKeyword
                    ).toLowerCase();
                    return `remplacer le site actuel par un site ${terrain} du deck d’aventure`;
                }
                return 'remplacer le site actuel par un site du deck d’aventure';
            }
        }
        return 'remplacer un site';
    }
    if (effect.type === 'EXCHANGE_SITE') {
        return 'échanger un de vos sites du chemin avec un site du deck d’aventure';
    }
    if (effect.type === 'TAKE_CONTROL_SITE') {
        return 'prendre le contrôle d’un site';
    }
    if (effect.type === 'FORCE_CHOOSE_MOVE_AGAIN') {
        return 'obliger les Peuples Libres à se déplacer à nouveau';
    }
    if (effect.type === 'LIBERATE_SITE') {
        return 'libérer un site';
    }
    if (effect.type === 'STACK_ON_CONTROLLED_SITE') {
        const who = Array.isArray(effect.target)
            ? formatTargetPhrase(effect.target)
            : null;
        return who
            ? `empiler ${who} sur un site que vous contrôlez`
            : 'empiler ce séide sur un site que vous contrôlez';
    }
    if (effect.type === 'PLAY_FROM_STACK') {
        const who = Array.isArray(effect.target)
            ? formatTargetPhrase(effect.target)
            : null;
        const reduce = effect.twilightReduce || 0;
        const reduceBit =
            reduce > 0 ? ` (−${reduce} crépuscule)` : '';
        const grants = (effect.grantsTempKeywords || [])
            .map((g) => translateKeyword(g.keyword))
            .filter(Boolean);
        const stats = (effect.grantsTempStats || []).map((g) => {
            const label =
                g.stat === 'STRENGTH'
                    ? 'force'
                    : g.stat === 'VITALITY'
                      ? 'vitalité'
                      : g.stat;
            return `${label} ${g.value > 0 ? '+' : ''}${g.value}`;
        });
        const grantBits = [...grants, ...stats];
        const grantBit =
            grantBits.length > 0
                ? ` (${grantBits.join(' et ')} jusqu’au ralliement)`
                : '';
        if (who) {
            return `jouer ${who} empilé sur un site que vous contrôlez${reduceBit}${grantBit}`;
        }
        return reduce > 0
            ? `jouer ce séide depuis la pile (−${reduce} crépuscule)`
            : 'jouer ce séide depuis la pile';
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
        const tokens = target.flat();
        if (tokens.includes('PIPEWEED')) {
            return asDesignation ? 'une herbe à pipe' : 'herbe à pipe';
        }
        const label = formatFilterList(tokens);
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
        const tokens = Array.isArray(spot.target) ? spot.target.flat() : [];
        if (tokens.includes('PIPE')) {
            parts.push('Désigner X pipes');
        } else {
            parts.push(
                `Désigner ${formatCostWho(spot.target, source, true)}`
            );
        }
    }
    if (option?.addTwilight && option.addTwilight > 0) {
        parts.push(
            `ajouter <symbol>twilight${option.addTwilight}</symbol>`
        );
    }
    if (option?.addBurdens && option.addBurdens > 0) {
        const n = option.addBurdens;
        parts.push(
            `ajouter ${n} fardeau${n > 1 ? 'x' : ''}`
        );
    }
    if (option?.removeThreats && option.removeThreats > 0) {
        const n = option.removeThreats;
        parts.push(`retirer ${n} menace${n > 1 ? 's' : ''}`);
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
        const discardTarget = option.discardFromPlay[0]?.target;
        if (discardTarget === 'SELF' || discardTarget === 'BEARER') {
            // « this / it » → nom de la carte (évite l’ambiguïté sur un porteur).
            const name =
                source.i18n?.fr?.title || source.title || 'cette carte';
            parts.push(`Défausser ${name}`);
        } else {
            parts.push(
                `Défausser ${formatCostWho(discardTarget, source, true)}`
            );
        }
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
    const cost = capitalizeLabel(formatCostLabel(ability, source));
    const effectRaw = (ability.effects || [])
        .map((effect) => formatEffectBit(effect, source))
        .filter(Boolean)
        .join(' et ');
    // Début de phrase (pas de coût) → majuscule ; après « : » on laisse minuscule.
    return {
        cost,
        effect: cost ? effectRaw : capitalizeLabel(effectRaw),
    };
}
