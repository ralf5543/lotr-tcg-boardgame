import React, { useEffect, useState } from 'react';
import {
    enterFullscreen,
    exitFullscreen,
    isFullscreen,
} from '../../../../utils/fullscreen';
import { usePreferences } from '../../../../contexts/PreferencesContext';
import {
    LANGUAGE_NATIVE_LABELS,
    SUPPORTED_LANGUAGES,
    type SupportedLanguage,
    isSupportedLanguage,
} from '../../../../i18n/languages';
import { getUiMessages } from '../../../../i18n/ui';
import {
    loadSessionProfile,
    MAX_DISPLAY_NAME_LENGTH,
    normalizeDisplayName,
    saveSessionProfile,
    SESSION_AVATARS,
    type SessionAvatarId,
    type SessionProfile,
} from '../../../../session/playerProfile';
import * as S from './styles';

export type OptionsTabId = 'display' | 'audio' | 'language' | 'account';

export interface OptionsModalProps {
    onClose: () => void;
    /** Affiche « retour à l’accueil » (masqué sur l’écran d’accueil lui‑même). */
    showQuitToHome?: boolean;
}

const TAB_IDS: OptionsTabId[] = [
    'display',
    'audio',
    'language',
    'account',
];

function goToWelcome() {
    const url = new URL(window.location.href);
    url.search = '';
    window.location.href = url.toString();
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
    onClose,
    showQuitToHome = true,
}) => {
    const {
        uiLanguage,
        cardLanguage,
        setUiLanguage,
        setCardLanguage,
    } = usePreferences();
    const t = getUiMessages(uiLanguage);

    const [tab, setTab] = useState<OptionsTabId>('display');
    const [fullscreen, setFullscreen] = useState(() => isFullscreen());
    const [musicEnabled, setMusicEnabled] = useState(true);
    const [masterVolume, setMasterVolume] = useState(70);
    const [musicVolume, setMusicVolume] = useState(50);
    const [sfxVolume, setSfxVolume] = useState(80);
    const [quitConfirm, setQuitConfirm] = useState(false);
    const [sessionProfile, setSessionProfile] = useState<SessionProfile>(() =>
        loadSessionProfile()
    );
    const [displayNameDraft, setDisplayNameDraft] = useState(
        () => loadSessionProfile().name
    );

    const persistSessionProfile = (next: SessionProfile) => {
        const saved = saveSessionProfile(next);
        setSessionProfile(saved);
        return saved;
    };

    const commitDisplayName = (raw: string = displayNameDraft) => {
        const saved = persistSessionProfile({
            ...sessionProfile,
            name: normalizeDisplayName(raw),
        });
        setDisplayNameDraft(saved.name);
        return saved;
    };

    const closeOptions = () => {
        commitDisplayName(displayNameDraft);
        onClose();
    };

    const onAvatarPick = (avatarId: SessionAvatarId) => {
        const saved = persistSessionProfile({
            ...sessionProfile,
            name: normalizeDisplayName(displayNameDraft),
            avatarId,
        });
        setDisplayNameDraft(saved.name);
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            commitDisplayName(displayNameDraft);
            onClose();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [displayNameDraft, sessionProfile, onClose]);

    useEffect(() => {
        const syncFullscreen = () => {
            setFullscreen(isFullscreen());
        };
        document.addEventListener('fullscreenchange', syncFullscreen);
        return () =>
            document.removeEventListener('fullscreenchange', syncFullscreen);
    }, []);

    const handleFullscreenChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const wantFullscreen = event.target.checked;
        try {
            if (wantFullscreen) {
                await enterFullscreen();
            } else {
                await exitFullscreen();
            }
        } catch {
            setFullscreen(isFullscreen());
        }
    };

    const onSelectLanguage = (
        which: 'ui' | 'cards',
        value: string
    ) => {
        if (!isSupportedLanguage(value)) return;
        if (which === 'ui') setUiLanguage(value);
        else setCardLanguage(value);
    };

    return (
        <S.Backdrop
            role="dialog"
            aria-modal="true"
            aria-label={t.options.title}
            onClick={closeOptions}
        >
            <S.Panel onClick={(event) => event.stopPropagation()}>
                <S.Header>
                    <S.Title>{t.options.title}</S.Title>
                    <S.CloseButton
                        type="button"
                        aria-label={t.options.closeAria}
                        onClick={closeOptions}
                    >
                        ×
                    </S.CloseButton>
                </S.Header>

                <S.Body>
                    <S.TabList aria-label={t.options.categoriesAria}>
                        {TAB_IDS.map((id) => (
                            <S.TabButton
                                key={id}
                                type="button"
                                $active={tab === id}
                                onClick={() => {
                                    setTab(id);
                                    setQuitConfirm(false);
                                }}
                            >
                                {t.options.tabs[id]}
                            </S.TabButton>
                        ))}
                    </S.TabList>

                    <S.Content>
                        {tab === 'display' && (
                            <>
                                <S.SectionTitle>
                                    {t.options.display.title}
                                </S.SectionTitle>
                                <S.SectionHint>
                                    {t.options.display.hint}
                                </S.SectionHint>
                                <S.FieldGroup>
                                    <S.ToggleRow>
                                        <div>
                                            <S.Label htmlFor="options-fullscreen">
                                                {t.options.display.fullscreen}
                                            </S.Label>
                                            <div>
                                                <S.Hint>
                                                    {
                                                        t.options.display
                                                            .fullscreenHint
                                                    }
                                                </S.Hint>
                                            </div>
                                        </div>
                                        <S.Checkbox
                                            id="options-fullscreen"
                                            checked={fullscreen}
                                            onChange={handleFullscreenChange}
                                        />
                                    </S.ToggleRow>
                                </S.FieldGroup>
                                <S.PlaceholderNote>
                                    {t.options.display.laterNote}
                                </S.PlaceholderNote>
                            </>
                        )}

                        {tab === 'audio' && (
                            <>
                                <S.SectionTitle>
                                    {t.options.audio.title}
                                </S.SectionTitle>
                                <S.SectionHint>
                                    {t.options.audio.hint}
                                </S.SectionHint>
                                <S.FieldGroup>
                                    <S.ToggleRow>
                                        <div>
                                            <S.Label htmlFor="options-music">
                                                {t.options.audio.music}
                                            </S.Label>
                                            <div>
                                                <S.Hint>
                                                    {t.options.audio.musicHint}
                                                </S.Hint>
                                            </div>
                                        </div>
                                        <S.Checkbox
                                            id="options-music"
                                            checked={musicEnabled}
                                            onChange={(event) =>
                                                setMusicEnabled(
                                                    event.target.checked
                                                )
                                            }
                                        />
                                    </S.ToggleRow>

                                    <S.Field>
                                        <S.SliderRow>
                                            <S.Label htmlFor="options-master">
                                                {t.options.audio.master}
                                            </S.Label>
                                            <S.Slider
                                                id="options-master"
                                                value={masterVolume}
                                                onChange={(event) =>
                                                    setMasterVolume(
                                                        Number(
                                                            event.target.value
                                                        )
                                                    )
                                                }
                                            />
                                            <S.SliderValue>
                                                {masterVolume}%
                                            </S.SliderValue>
                                        </S.SliderRow>
                                    </S.Field>

                                    <S.Field>
                                        <S.SliderRow>
                                            <S.Label htmlFor="options-music-vol">
                                                {t.options.audio.musicVolume}
                                            </S.Label>
                                            <S.Slider
                                                id="options-music-vol"
                                                value={musicVolume}
                                                disabled={!musicEnabled}
                                                onChange={(event) =>
                                                    setMusicVolume(
                                                        Number(
                                                            event.target.value
                                                        )
                                                    )
                                                }
                                            />
                                            <S.SliderValue>
                                                {musicVolume}%
                                            </S.SliderValue>
                                        </S.SliderRow>
                                    </S.Field>

                                    <S.Field>
                                        <S.SliderRow>
                                            <S.Label htmlFor="options-sfx">
                                                {t.options.audio.sfx}
                                            </S.Label>
                                            <S.Slider
                                                id="options-sfx"
                                                value={sfxVolume}
                                                onChange={(event) =>
                                                    setSfxVolume(
                                                        Number(
                                                            event.target.value
                                                        )
                                                    )
                                                }
                                            />
                                            <S.SliderValue>
                                                {sfxVolume}%
                                            </S.SliderValue>
                                        </S.SliderRow>
                                    </S.Field>
                                </S.FieldGroup>
                            </>
                        )}

                        {tab === 'language' && (
                            <>
                                <S.SectionTitle>
                                    {t.options.language.title}
                                </S.SectionTitle>
                                <S.SectionHint>
                                    {t.options.language.hint}
                                </S.SectionHint>
                                <S.FieldGroup>
                                    <S.Field>
                                        <S.Label htmlFor="options-ui-lang">
                                            {t.options.language.ui}
                                        </S.Label>
                                        <S.Select
                                            id="options-ui-lang"
                                            value={uiLanguage}
                                            onChange={(event) =>
                                                onSelectLanguage(
                                                    'ui',
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {SUPPORTED_LANGUAGES.map(
                                                (lang: SupportedLanguage) => (
                                                    <option
                                                        key={lang}
                                                        value={lang}
                                                    >
                                                        {
                                                            LANGUAGE_NATIVE_LABELS[
                                                                lang
                                                            ]
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </S.Select>
                                    </S.Field>
                                    <S.Field>
                                        <S.Label htmlFor="options-card-lang">
                                            {t.options.language.cards}
                                        </S.Label>
                                        <S.Hint>
                                            {t.options.language.cardsHint}
                                        </S.Hint>
                                        <S.Select
                                            id="options-card-lang"
                                            value={cardLanguage}
                                            onChange={(event) =>
                                                onSelectLanguage(
                                                    'cards',
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {SUPPORTED_LANGUAGES.map(
                                                (lang: SupportedLanguage) => (
                                                    <option
                                                        key={lang}
                                                        value={lang}
                                                    >
                                                        {
                                                            LANGUAGE_NATIVE_LABELS[
                                                                lang
                                                            ]
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </S.Select>
                                    </S.Field>
                                </S.FieldGroup>
                            </>
                        )}

                        {tab === 'account' && (
                            <>
                                <S.SectionTitle>
                                    {t.options.account.title}
                                </S.SectionTitle>
                                <S.SectionHint>
                                    {t.options.account.hint}
                                </S.SectionHint>
                                <S.FieldGroup>
                                    <S.Field>
                                        <S.Label htmlFor="session-display-name">
                                            {t.options.account.displayName}
                                        </S.Label>
                                        <S.Hint>
                                            {t.options.account.displayNameHint}
                                        </S.Hint>
                                        <S.TextInput
                                            id="session-display-name"
                                            type="text"
                                            value={displayNameDraft}
                                            maxLength={MAX_DISPLAY_NAME_LENGTH}
                                            placeholder={
                                                t.options.account
                                                    .displayNamePlaceholder
                                            }
                                            autoComplete="nickname"
                                            onChange={(event) =>
                                                setDisplayNameDraft(
                                                    event.target.value.slice(
                                                        0,
                                                        MAX_DISPLAY_NAME_LENGTH
                                                    )
                                                )
                                            }
                                            onBlur={() =>
                                                commitDisplayName(
                                                    displayNameDraft
                                                )
                                            }
                                        />
                                    </S.Field>
                                    <S.Field>
                                        <S.Label>
                                            {t.options.account.avatar}
                                        </S.Label>
                                        <S.Hint>
                                            {t.options.account.avatarHint}
                                        </S.Hint>
                                        <S.AvatarGrid
                                            role="listbox"
                                            aria-label={
                                                t.options.account.avatar
                                            }
                                        >
                                            {SESSION_AVATARS.map((avatar) => {
                                                const selected =
                                                    sessionProfile.avatarId ===
                                                    avatar.id;
                                                return (
                                                    <S.AvatarOption
                                                        key={avatar.id}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={
                                                            selected
                                                        }
                                                        $selected={selected}
                                                        title={avatar.id}
                                                        onClick={() =>
                                                            onAvatarPick(
                                                                avatar.id
                                                            )
                                                        }
                                                    >
                                                        <S.AvatarImage
                                                            src={`/${avatar.path}`}
                                                            alt=""
                                                            loading="lazy"
                                                        />
                                                    </S.AvatarOption>
                                                );
                                            })}
                                        </S.AvatarGrid>
                                    </S.Field>
                                </S.FieldGroup>
                                <S.AccountList>
                                    <S.AccountItem type="button" disabled>
                                        <S.AccountItemTitle>
                                            {t.options.account.contacts}
                                        </S.AccountItemTitle>
                                        <S.AccountItemHint>
                                            {t.options.account.contactsHint}
                                        </S.AccountItemHint>
                                    </S.AccountItem>
                                    <S.AccountItem
                                        type="button"
                                        onClick={() => {
                                            const url = new URL(
                                                window.location.href
                                            );
                                            url.searchParams.set(
                                                'view',
                                                'decks'
                                            );
                                            window.location.href =
                                                url.toString();
                                        }}
                                    >
                                        <S.AccountItemTitle>
                                            {t.options.account.decks}
                                        </S.AccountItemTitle>
                                        <S.AccountItemHint>
                                            {t.options.account.decksHint}
                                        </S.AccountItemHint>
                                    </S.AccountItem>
                                </S.AccountList>
                            </>
                        )}
                    </S.Content>
                </S.Body>

                <S.Footer>
                    {!quitConfirm ? (
                        <>
                            <S.GhostButton
                                type="button"
                                onClick={closeOptions}
                            >
                                {t.options.close}
                            </S.GhostButton>
                            {showQuitToHome && (
                                <S.DangerButton
                                    type="button"
                                    onClick={() => setQuitConfirm(true)}
                                >
                                    {t.options.quit}
                                </S.DangerButton>
                            )}
                        </>
                    ) : (
                        <S.QuitConfirm>
                            <S.QuitPrompt>
                                {t.options.quitPrompt}
                            </S.QuitPrompt>
                            <S.GhostButton
                                type="button"
                                onClick={() => setQuitConfirm(false)}
                            >
                                {t.options.cancel}
                            </S.GhostButton>
                            <S.DangerButton
                                type="button"
                                onClick={() => {
                                    commitDisplayName(displayNameDraft);
                                    goToWelcome();
                                }}
                            >
                                {t.options.confirm}
                            </S.DangerButton>
                        </S.QuitConfirm>
                    )}
                </S.Footer>
            </S.Panel>
        </S.Backdrop>
    );
};
