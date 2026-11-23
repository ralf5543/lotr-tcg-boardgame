import type { SupportedLanguage } from '../languages';
import { UI_MESSAGES, type UiMessages } from './messages';
import type { ChromeMessages } from './chrome';
import type { TargetingMessages } from './targeting';
import type { DeckBuilderMessages } from './deckBuilder';

export type {
    UiMessages,
    ChromeMessages,
    TargetingMessages,
    DeckBuilderMessages,
};
export {
    longPhaseLabel,
    shortPhaseLabel,
} from './chrome';

export function getUiMessages(lang: SupportedLanguage): UiMessages {
    return UI_MESSAGES[lang] ?? UI_MESSAGES.fr;
}
