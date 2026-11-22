import { usePreferencesOptional } from '../../contexts/PreferencesContext';
import type { SupportedLanguage } from '../languages';
import { getUiMessages, type UiMessages } from './index';

export function useUiMessages(
    langOverride?: SupportedLanguage
): UiMessages {
    const prefs = usePreferencesOptional();
    const lang = langOverride ?? prefs?.uiLanguage ?? 'fr';
    return getUiMessages(lang);
}
