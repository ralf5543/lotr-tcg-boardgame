import type { LotrMoveContext } from '../types';
import { applyGameEndIfNeeded } from '../logic/gameEnd';

type MoveFn = (context: LotrMoveContext, ...args: unknown[]) => unknown;

const ALLOW_WHILE_ENDED = new Set([
    'dismissGameEndOverlay',
    'devLoadPreset',
    'devSetPhase',
    'devSetTwilight',
    'devSetBurdens',
    'devSetThreats',
    'devAdjustWounds',
    'devAdjustSiteTwilight',
    'devAdjustCultureTokens',
    'devSetArchery',
    'devSetCurrentSite',
    'devForceEndPhase',
]);

/**
 * Gèle les coups dès qu’il y a un `gameResult`, et réévalue corruption / mort
 * après chaque coup réussi.
 */
export function wrapMovesAgainstGameEnd<T extends Record<string, MoveFn>>(
    moves: T
): T {
    const wrapped = {} as T;
    for (const key of Object.keys(moves) as (keyof T)[]) {
        const fn = moves[key];
        if (typeof fn !== 'function') {
            wrapped[key] = fn;
            continue;
        }
        wrapped[key] = ((context: LotrMoveContext, ...args: unknown[]) => {
            if (
                context?.G?.gameResult &&
                !ALLOW_WHILE_ENDED.has(String(key))
            ) {
                return 'INVALID_MOVE';
            }
            const result = fn(context, ...args);
            if (result !== 'INVALID_MOVE' && context?.G) {
                applyGameEndIfNeeded(context.G);
            }
            return result;
        }) as T[keyof T];
    }
    return wrapped;
}
