/**
 * URL du serveur boardgame.io (création de partie + SocketIO).
 *
 * - `VITE_GAME_SERVER_URL` si défini (prod / override)
 * - DEV : `http://<hostname>:8000` (Wi‑Fi local)
 * - sinon : même origine (nginx reverse-proxy devant front + API)
 */
export function getGameServerUrl(): string {
    const fromEnv = String(import.meta.env.VITE_GAME_SERVER_URL || '').trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');

    if (import.meta.env.DEV && typeof window !== 'undefined') {
        return `http://${window.location.hostname}:8000`;
    }

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return 'http://localhost:8000';
}
