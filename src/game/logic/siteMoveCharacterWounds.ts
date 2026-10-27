import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { getEffectiveVitality } from '../../utils/cardStats';
import { requestWounds } from '../engine/responseWindow';
import { tryOpenFellowshipMoves } from '../engine/responseWindow';
import { getCurrentSite } from './sites';
import { beginOptionalSiteMoveAbility } from './siteMoveAbility';

type PhaseEvents = {
    setPhase?: (phase: string) => void;
};

function livingCharactersOwnedBy(
    G: GameState,
    playerId: string,
    companionsOnly = false
): CardState[] {
    const fpId = G.fpPlayerId || '0';
    if (playerId === fpId) {
        const fp = G.players[fpId];
        return (fp?.fellowshipArea || []).filter(
            (c) =>
                c &&
                !c.isDead &&
                (companionsOnly
                    ? c.type === 'COMPANION'
                    : c.type === 'COMPANION' ||
                      c.type === 'ALLY' ||
                      c.type === 'MINION') &&
                getEffectiveVitality(c) > 0
        );
    }
    return (G.battlefield || []).filter(
        (c) =>
            c &&
            c.kind === 'SHADOW' &&
            c.type === 'MINION' &&
            !c.isDead &&
            getEffectiveVitality(c) > 0
    );
}

/** Nombre d’alliés vivants en jeu (Westemnet : 1 blessure par allié). */
function livingAllyCount(G: GameState): number {
    let n = 0;
    for (const player of Object.values(G.players || {})) {
        for (const zone of [player?.fellowshipArea, player?.supportArea]) {
            for (const c of zone || []) {
                if (c && c.type === 'ALLY' && !c.isDead) n += 1;
            }
        }
    }
    return n;
}

function findSiteWoundAssignment(
    G: GameState,
    site: SiteCardState | null
): { ability: Ability; count: number; companionsOnly: boolean } | null {
    if (!site?.abilities?.length) return null;
    for (const ability of site.abilities) {
        if (ability.optional) continue;
        if (ability.trigger?.type !== 'MOVES_TO') continue;
        for (const effect of ability.effects || []) {
            if (effect.type !== 'WOUND') continue;
            if (effect.eachOwner && (effect.count || 0) > 0) {
                return {
                    ability,
                    count: effect.count || 0,
                    companionsOnly: false,
                };
            }
            if (effect.perAlly) {
                return {
                    ability,
                    count: livingAllyCount(G),
                    companionsOnly: true,
                };
            }
        }
    }
    return null;
}

function resumeAfterSiteCharacterWounds(
    G: GameState,
    events: PhaseEvents | undefined,
    nextPhase?: string
): void {
    if (beginOptionalSiteMoveAbility(G, nextPhase)) {
        return;
    }
    if (tryOpenFellowshipMoves(G) === 'WAITING') {
        if (nextPhase) G.pendingPhaseAfterResponse = nextPhase;
        return;
    }
    if (nextPhase) events?.setPhase?.(nextPhase);
}

/**
 * Doorway to Doom : ouvre l’assignation FP puis Ombre si le site l’exige.
 * Retourne true si une assignation est en cours (ne pas enchaîner la phase).
 */
export function beginSiteMoveCharacterWoundsIfNeeded(
    G: GameState,
    nextPhase?: string
): boolean {
    if (G.pendingSiteCharacterWounds) return true;
    const site = getCurrentSite(G);
    const found = findSiteWoundAssignment(G, site);
    if (!found) return false;

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    const fpLiving = livingCharactersOwnedBy(G, fpId, found.companionsOnly);
    const shLiving = livingCharactersOwnedBy(G, shadowId);
    const fpNeed = Math.min(found.count, fpLiving.length);
    // Westemnet (compagnons seuls) : l’Ombre n’assigne rien.
    const shNeed = found.companionsOnly
        ? 0
        : Math.min(found.count, shLiving.length);

    if (fpNeed <= 0 && shNeed <= 0) return false;

    if (fpNeed > 0) {
        const queue: string[] = [];
        if (shNeed > 0) queue.push(shadowId);
        G.pendingSiteCharacterWounds = {
            playerId: fpId,
            remaining: fpNeed,
            queue,
            pendingPhaseAfter: nextPhase,
            companionsOnly: found.companionsOnly || undefined,
        };
        G.statusMessage = found.companionsOnly
            ? `Site : Peuples Libres, assignez ${fpNeed} blessure(s) à vos compagnons (une par allié).`
            : `Site : Peuples Libres, assignez ${fpNeed} blessure(s) à vos personnages.`;
        return true;
    }

    G.pendingSiteCharacterWounds = {
        playerId: shadowId,
        remaining: shNeed,
        queue: [],
        pendingPhaseAfter: nextPhase,
    };
    G.statusMessage = `Site : Ombre, assignez ${shNeed} blessure(s) à vos séides.`;
    return true;
}

export function livingSiteWoundTargets(
    G: GameState,
    playerId: string
): CardState[] {
    return livingCharactersOwnedBy(
        G,
        playerId,
        Boolean(G.pendingSiteCharacterWounds?.companionsOnly)
    );
}

export function assignSiteCharacterWound(
    G: GameState,
    playerID: string,
    targetCardId: string,
    events?: PhaseEvents
): boolean {
    const pending = G.pendingSiteCharacterWounds;
    if (!pending || pending.playerId !== playerID) return false;
    if (pending.remaining <= 0) return false;

    const target = livingCharactersOwnedBy(
        G,
        playerID,
        Boolean(pending.companionsOnly)
    ).find((c) => c.instanceId === targetCardId || c.id === targetCardId);
    if (!target) return false;

    requestWounds(G, target, 1);
    pending.remaining -= 1;

    if (pending.remaining > 0) {
        const still = livingCharactersOwnedBy(
            G,
            playerID,
            Boolean(pending.companionsOnly)
        );
        if (still.length === 0) {
            pending.remaining = 0;
        } else {
            G.statusMessage = `Site : encore ${pending.remaining} blessure(s) à assigner.`;
            return true;
        }
    }

    // Joueur suivant ou reprise du flux.
    const nextId = pending.queue.shift();
    if (nextId) {
        const need = Math.min(
            findSiteWoundAssignment(G, getCurrentSite(G))?.count || 0,
            livingCharactersOwnedBy(G, nextId).length
        );
        if (need > 0) {
            pending.playerId = nextId;
            pending.remaining = need;
            G.statusMessage =
                nextId === (G.fpPlayerId || '0')
                    ? `Site : Peuples Libres, assignez ${need} blessure(s).`
                    : `Site : Ombre, assignez ${need} blessure(s) à vos séides.`;
            return true;
        }
    }

    const nextPhase = pending.pendingPhaseAfter;
    G.pendingSiteCharacterWounds = undefined;
    resumeAfterSiteCharacterWounds(G, events, nextPhase);
    return true;
}
