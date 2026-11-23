import type { SupportedLanguage } from '../languages';
import { UI_MESSAGES, type UiMessages } from './messages';
import type { ChromeMessages } from './chrome';
import type { TargetingMessages } from './targeting';

export type { UiMessages, ChromeMessages, TargetingMessages };
export {
    longPhaseLabel,
    shortPhaseLabel,
} from './chrome';

export function getUiMessages(lang: SupportedLanguage): UiMessages {
    return UI_MESSAGES[lang] ?? UI_MESSAGES.fr;
}
