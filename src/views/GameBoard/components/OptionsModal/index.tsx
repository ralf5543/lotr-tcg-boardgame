import React, { useEffect, useState } from 'react';
import {
    enterFullscreen,
    exitFullscreen,
    isFullscreen,
} from '../../../../utils/fullscreen';
import * as S from './styles';

export type OptionsTabId = 'display' | 'audio' | 'language' | 'account';

export interface OptionsModalProps {
    onClose: () => void;
}

const TABS: { id: OptionsTabId; label: string }[] = [
    { id: 'display', label: 'Affichage' },
    { id: 'audio', label: 'Son' },
    { id: 'language', label: 'Langue' },
    { id: 'account', label: 'Compte' },
];

const UI_LANGUAGES = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
];

const CARD_LANGUAGES = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'es', label: 'Español' },
];

export const OptionsModal: React.FC<OptionsModalProps> = ({ onClose }) => {
    const [tab, setTab] = useState<OptionsTabId>('display');
    const [fullscreen, setFullscreen] = useState(() => isFullscreen());
    const [musicEnabled, setMusicEnabled] = useState(true);
    const [masterVolume, setMasterVolume] = useState(70);
    const [musicVolume, setMusicVolume] = useState(50);
    const [sfxVolume, setSfxVolume] = useState(80);
    const [uiLanguage, setUiLanguage] = useState('fr');
    const [cardLanguage, setCardLanguage] = useState('fr');
    const [quitConfirm, setQuitConfirm] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        };
        // Capture : ferme les options avant les annulations de ciblage.
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onClose]);

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

    return (
        <S.Backdrop
            role="dialog"
            aria-modal="true"
            aria-label="Options"
            onClick={onClose}
        >
            <S.Panel onClick={(event) => event.stopPropagation()}>
                <S.Header>
                    <S.Title>Options</S.Title>
                    <S.CloseButton
                        type="button"
                        aria-label="Fermer"
                        onClick={onClose}
                    >
                        ×
                    </S.CloseButton>
                </S.Header>

                <S.Body>
                    <S.TabList aria-label="Catégories">
                        {TABS.map((entry) => (
                            <S.TabButton
                                key={entry.id}
                                type="button"
                                $active={tab === entry.id}
                                onClick={() => {
                                    setTab(entry.id);
                                    setQuitConfirm(false);
                                }}
                            >
                                {entry.label}
                            </S.TabButton>
                        ))}
                    </S.TabList>

                    <S.Content>
                        {tab === 'display' && (
                            <>
                                <S.SectionTitle>Affichage</S.SectionTitle>
                                <S.SectionHint>
                                    Le plateau est déjà proportionnel : pas de
                                    choix de résolution pour l’instant.
                                </S.SectionHint>
                                <S.FieldGroup>
                                    <S.ToggleRow>
                                        <div>
                                            <S.Label htmlFor="options-fullscreen">
                                                Plein écran
                                            </S.Label>
                                            <div>
                                                <S.Hint>
                                                    Échap n’en sort plus —
                                                    décochez ici
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
                                    Plus tard : cadre décoratif autour du
                                    plateau (effet type Hearthstone sur grands
                                    écrans), sans toucher à l’échelle du jeu.
                                </S.PlaceholderNote>
                            </>
                        )}

                        {tab === 'audio' && (
                            <>
                                <S.SectionTitle>Son</S.SectionTitle>
                                <S.SectionHint>
                                    Réglages locaux — pas encore reliés au
                                    moteur audio.
                                </S.SectionHint>
                                <S.FieldGroup>
                                    <S.ToggleRow>
                                        <div>
                                            <S.Label htmlFor="options-music">
                                                Musique
                                            </S.Label>
                                            <div>
                                                <S.Hint>
                                                    Pas de piste pour l’instant
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
                                                Volume global
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
                                                Musique
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
                                                Effets sonores
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
                                <S.SectionTitle>Langue</S.SectionTitle>
                                <S.SectionHint>
                                    Interface et textes de cartes sont
                                    indépendants.
                                </S.SectionHint>
                                <S.FieldGroup>
                                    <S.Field>
                                        <S.Label htmlFor="options-ui-lang">
                                            Langue de l’interface
                                        </S.Label>
                                        <S.Select
                                            id="options-ui-lang"
                                            value={uiLanguage}
                                            onChange={(event) =>
                                                setUiLanguage(event.target.value)
                                            }
                                        >
                                            {UI_LANGUAGES.map((lang) => (
                                                <option
                                                    key={lang.value}
                                                    value={lang.value}
                                                >
                                                    {lang.label}
                                                </option>
                                            ))}
                                        </S.Select>
                                    </S.Field>
                                    <S.Field>
                                        <S.Label htmlFor="options-card-lang">
                                            Langue des cartes
                                        </S.Label>
                                        <S.Hint>
                                            Titres, lore et gametext affichés
                                        </S.Hint>
                                        <S.Select
                                            id="options-card-lang"
                                            value={cardLanguage}
                                            onChange={(event) =>
                                                setCardLanguage(
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {CARD_LANGUAGES.map((lang) => (
                                                <option
                                                    key={lang.value}
                                                    value={lang.value}
                                                >
                                                    {lang.label}
                                                </option>
                                            ))}
                                        </S.Select>
                                    </S.Field>
                                </S.FieldGroup>
                            </>
                        )}

                        {tab === 'account' && (
                            <>
                                <S.SectionTitle>Compte</S.SectionTitle>
                                <S.SectionHint>
                                    Données personnelles et listes — maquette
                                    pour l’instant.
                                </S.SectionHint>
                                <S.AccountList>
                                    <S.AccountItem type="button" disabled>
                                        <S.AccountItemTitle>
                                            Données personnelles
                                        </S.AccountItemTitle>
                                        <S.AccountItemHint>
                                            Pseudo, e-mail… — bientôt
                                        </S.AccountItemHint>
                                    </S.AccountItem>
                                    <S.AccountItem type="button" disabled>
                                        <S.AccountItemTitle>
                                            Avatar
                                        </S.AccountItemTitle>
                                        <S.AccountItemHint>
                                            Choisir ou changer — bientôt
                                        </S.AccountItemHint>
                                    </S.AccountItem>
                                    <S.AccountItem type="button" disabled>
                                        <S.AccountItemTitle>
                                            Contacts
                                        </S.AccountItemTitle>
                                        <S.AccountItemHint>
                                            Liste d’amis — bientôt
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
                                            Mes decks
                                        </S.AccountItemTitle>
                                        <S.AccountItemHint>
                                            Gérer la liste de decks
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
                            <S.GhostButton type="button" onClick={onClose}>
                                Fermer
                            </S.GhostButton>
                            <S.DangerButton
                                type="button"
                                onClick={() => setQuitConfirm(true)}
                            >
                                Quitter le jeu
                            </S.DangerButton>
                        </>
                    ) : (
                        <S.QuitConfirm>
                            <S.QuitPrompt>
                                Quitter ? (pas d’écran d’accueil pour l’instant)
                            </S.QuitPrompt>
                            <S.GhostButton
                                type="button"
                                onClick={() => setQuitConfirm(false)}
                            >
                                Annuler
                            </S.GhostButton>
                            <S.DangerButton type="button" disabled>
                                Confirmer
                            </S.DangerButton>
                        </S.QuitConfirm>
                    )}
                </S.Footer>
            </S.Panel>
        </S.Backdrop>
    );
};
