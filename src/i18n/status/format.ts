import type { SupportedLanguage } from '../languages';
import { localizeGameTerms } from '../terms';
import { STATUS_CATALOG } from './catalog';
import type { StatusKey, StatusNotice, StatusParams } from './types';

export function formatStatusNotice(
    lang: SupportedLanguage,
    key: StatusKey,
    params: StatusParams = {}
): string {
    const template = STATUS_CATALOG[lang]?.[key] ?? STATUS_CATALOG.fr[key];
    if (!template) return '';
    return typeof template === 'function' ? template(params) : template;
}

export function formatStoredStatus(
    lang: SupportedLanguage,
    notice: StatusNotice | null | undefined,
    fallbackMessage: string | undefined | null
): string {
    if (notice?.key) {
        return formatStatusNotice(lang, notice.key, notice.params || {});
    }
    return localizeGameTerms(fallbackMessage || '', lang);
}
