import type { CardState, SiteCardState, GameState } from '../../types';
import type { StatusKey } from '../../../i18n/status';
import { canAddThreats } from '../../logic/threats';
import { isFollowerTransferForbidden } from '../../logic/sites';

export interface AidValidationResult {
    valid: boolean;
    reasonKey?: StatusKey;
    reasonParams?: Record<string, string | number>;
}

export function canTransferAid(
    follower: CardState,
    targetCard: CardState | SiteCardState,
    G: GameState,
    playerID: string
): AidValidationResult {
    if (!follower || follower.type !== 'FOLLOWER') {
        return { valid: false, reasonKey: 'AID_NOT_FOLLOWER' };
    }

    if (isFollowerTransferForbidden(G)) {
        return { valid: false, reasonKey: 'AID_SITE_FORBIDDEN' };
    }

    if (!follower.aidCost) {
        return { valid: false, reasonKey: 'AID_NO_COST' };
    }

    const fpPlayerId = G.fpPlayerId || '0';
    const isFP = playerID === fpPlayerId;

    const { type, amount } = follower.aidCost;

    if (type === 'TWILIGHT' && !isFP) {
        if ((G.twilightPool || 0) < amount) {
            return {
                valid: false,
                reasonKey: 'AID_TWILIGHT_SHORT',
                reasonParams: {
                    have: G.twilightPool || 0,
                    need: amount,
                },
            };
        }
    }

    if (type === 'THREAT' && !canAddThreats(G)) {
        return { valid: false, reasonKey: 'AID_THREATS_AT_LIMIT' };
    }

    const isTargetValid =
        follower.kind === 'FREE_PEOPLE'
            ? targetCard.type === 'COMPANION'
            : targetCard.type === 'MINION';

    if (!isTargetValid) {
        return {
            valid: false,
            reasonKey:
                follower.kind === 'FREE_PEOPLE'
                    ? 'AID_TARGET_COMPANION'
                    : 'AID_TARGET_MINION',
        };
    }

    return { valid: true };
}
