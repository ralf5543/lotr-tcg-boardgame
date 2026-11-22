/**
 * Plein écran JS + verrouillage d’Échap (Keyboard Lock API).
 * Sans ça, le navigateur quitte le plein écran dès Escape — avant nos menus.
 * Secours navigateur : maintien prolongé d’Échap (≈2 s) pour forcer la sortie.
 */

type KeyboardLockNavigator = Navigator & {
    keyboard?: {
        lock: (keyCodes?: string[]) => Promise<void>;
        unlock: () => void;
    };
};

function supportsKeyboardLock(): boolean {
    const keyboard = (navigator as KeyboardLockNavigator).keyboard;
    return Boolean(keyboard && typeof keyboard.lock === 'function');
}

async function lockEscapeKey(): Promise<void> {
    if (!supportsKeyboardLock()) return;
    try {
        await (navigator as KeyboardLockNavigator).keyboard!.lock(['Escape']);
    } catch {
        /* Permission refusée / API indisponible — Escape quittera encore le plein écran. */
    }
}

function unlockKeyboard(): void {
    if (!supportsKeyboardLock()) return;
    try {
        (navigator as KeyboardLockNavigator).keyboard!.unlock();
    } catch {
        /* ignore */
    }
}

let listenerAttached = false;

/** À appeler une fois (ex. au boot App) pour resynchroniser le verrou. */
export function initFullscreenEscapeLock(): void {
    if (typeof document === 'undefined' || listenerAttached) return;
    listenerAttached = true;

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            void lockEscapeKey();
        } else {
            unlockKeyboard();
        }
    });
}

export function isFullscreen(): boolean {
    return Boolean(document.fullscreenElement);
}

export async function enterFullscreen(
    element: Element = document.documentElement
): Promise<void> {
    if (document.fullscreenElement) {
        await lockEscapeKey();
        return;
    }
    // Spec : verrouiller Escape avant requestFullscreen pour un seul message UX navigateur.
    await lockEscapeKey();
    await element.requestFullscreen();
}

export async function exitFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
        unlockKeyboard();
        return;
    }
    await document.exitFullscreen();
    unlockKeyboard();
}

export async function toggleFullscreen(
    element: Element = document.documentElement
): Promise<boolean> {
    if (document.fullscreenElement) {
        await exitFullscreen();
        return false;
    }
    await enterFullscreen(element);
    return true;
}
