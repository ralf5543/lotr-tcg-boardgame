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
    playerId: string
): CardState[] {
    const fpId = G.fpPlayerId || '0';
    if (playerId === fpId) {
        const fp = G.players[fpId];
        return (fp?.fellowshipArea || []).filter(
            (c) =>
                c &&
                !c.isDead &&
                (c.type === 'COMPANION' ||
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

function findDoorwayWoundAbility(
    site: SiteCardState | null
): { ability: Ability; count: number } | null {
    if (!site?.abilities?.length) return null;
    for (const ability of site.abilities) {
        if (ability.optional) continue;
        if (ability.trigger?.type !== 'MOVES_TO') continue;
        for (const effect of ability.effects || []) {
            if (
                effect.type === 'WOUND' &&
                effect.eachOwner &&
                (effect.count || 0) > 0
            ) {
                return { ability, count: effect.count || 0 };
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
    const found = findDoorwayWoundAbility(site);
    if (!found) return false;

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    const fpLiving = livingCharactersOwnedBy(G, fpId);
    const shLiving = livingCharactersOwnedBy(G, shadowId);
    const fpNeed = Math.min(found.count, fpLiving.length);
    const shNeed = Math.min(found.count, shLiving.length);

    if (fpNeed <= 0 && shNeed <= 0) return false;

    if (fpNeed > 0) {
        const queue: string[] = [];
        if (shNeed > 0) queue.push(shadowId);
        G.pendingSiteCharacterWounds = {
            playerId: fpId,
            remaining: fpNeed,
            queue,
            pendingPhaseAfter: nextPhase,
        };
        G.statusMessage = `Site : Peuples Libres, assignez ${fpNeed} blessure(s) à vos personnages.`;
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
    return livingCharactersOwnedBy(G, playerId);
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

    const target = livingCharactersOwnedBy(G, playerID).find(
        (c) => c.instanceId === targetCardId || c.id === targetCardId
    );
    if (!target) return false;

    requestWounds(G, target, 1);
    pending.remaining -= 1;

    if (pending.remaining > 0) {
        const still = livingCharactersOwnedBy(G, playerID);
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
            findDoorwayWoundAbility(getCurrentSite(G))?.count || 0,
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
