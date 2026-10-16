import type { Ability, AbilityEffect, CardState, GameState } from '../../types';
import { findTargetCard } from '../../../utils/cardUtils';

function currentSite(G: GameState): CardState | null {
    const fpId = G.fpPlayerId || '0';
    const idx =
        G.players[fpId]?.currentSiteIndex ?? G.currentSiteIndex ?? 0;
    const site = G.path?.[idx];
    if (!site) return null;
    return site as unknown as CardState;
}

function abilityHasChooseOne(ability: Ability): boolean {
    return (ability.effects || []).some((e) => e.type === 'CHOOSE_ONE');
}

/**
 * Capacités de site « At the start of the maneuver phase… » (Pelennor Flat…).
 * Ouvre un `pendingForcedChoice` pour le chooser (souvent Peuples Libres).
 */
export function applyStartOfManeuverSiteTriggers(G: GameState): boolean {
    if (G.pendingForcedChoice) return true;
    const site = currentSite(G);
    if (!site?.abilities?.length) return false;

    for (const ability of site.abilities) {
        if (!ability.phases?.includes('START_OF_MANEUVER')) continue;
        if (!abilityHasChooseOne(ability)) continue;

        const choose = (ability.effects || []).find(
            (e) => e.type === 'CHOOSE_ONE'
        );
        if (!choose || choose.type !== 'CHOOSE_ONE') continue;

        const sourceId = site.instanceId || site.id;
        if (!sourceId) continue;

        const fpId = G.fpPlayerId || '0';
        const shadowId = fpId === '0' ? '1' : '0';
        let chooserId = fpId;
        if (choose.chooser === 'OPPONENT') {
            // Site : « adversaire » du site = Ombre (rare).
            chooserId = shadowId;
        } else if (choose.chooser === 'OWNER') {
            chooserId = fpId;
        }

        const title =
            (site as CardState).i18n?.fr?.title ||
            (site as CardState).title ||
            'Site';

        G.pendingForcedChoice = {
            playerId: chooserId,
            sourceInstanceId: sourceId,
            abilityId: ability.id,
            title: title.toUpperCase(),
            message:
                'Au début de la Manœuvre : choisissez une option.',
            options: choose.options.map((o) => ({
                label: o.label,
                effects: o.effects as AbilityEffect[],
            })),
        };
        G.statusMessage =
            `${title} : les Peuples Libres doivent choisir une option.`;
        return true;
    }
    return false;
}

/** Retrouve la source d’un choix forcé (en jeu, chemin, ou défausse). */
export function findForcedChoiceSource(
    G: GameState,
    sourceInstanceId: string
): CardState | null {
    const inPlay = findTargetCard(G, sourceInstanceId) as CardState | null;
    if (inPlay) return inPlay;
    for (const player of Object.values(G.players || {})) {
        const fromDiscard = (player.discard || []).find(
            (c) =>
                c &&
                (c.instanceId === sourceInstanceId || c.id === sourceInstanceId)
        );
        if (fromDiscard) return fromDiscard;
    }
    return null;
}
