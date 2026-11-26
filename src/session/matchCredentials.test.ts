import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearMatchCredentials,
    loadMatchCredentials,
    saveMatchCredentials,
} from './matchCredentials';

function installMemoryLocalStorage() {
    const map = new Map<string, string>();
    const storage = {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
        removeItem: (key: string) => {
            map.delete(key);
        },
        clear: () => {
            map.clear();
        },
    };
    Object.defineProperty(globalThis, 'localStorage', {
        value: storage,
        configurable: true,
    });
}

describe('matchCredentials', () => {
    beforeEach(() => {
        installMemoryLocalStorage();
    });

    it('stocke et relit par match + siège', () => {
        saveMatchCredentials('abc', '0', 'cred-0');
        saveMatchCredentials('abc', '1', 'cred-1');
        expect(loadMatchCredentials('abc', '0')).toBe('cred-0');
        expect(loadMatchCredentials('abc', '1')).toBe('cred-1');
        expect(loadMatchCredentials('other', '0')).toBeNull();
    });

    it('efface un siège ou tout le match', () => {
        saveMatchCredentials('m1', '0', 'a');
        saveMatchCredentials('m1', '1', 'b');
        clearMatchCredentials('m1', '0');
        expect(loadMatchCredentials('m1', '0')).toBeNull();
        expect(loadMatchCredentials('m1', '1')).toBe('b');
        clearMatchCredentials('m1');
        expect(loadMatchCredentials('m1', '1')).toBeNull();
    });
});
