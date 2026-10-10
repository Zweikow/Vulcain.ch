# Polices des visuels générés (next/og)

Satori, le moteur de `next/og`, n'utilise aucune police système et ne lit ni le
WOFF2 ni les axes des polices variables. Ces fichiers sont des instances
statiques tirées des polices variables officielles de Google Fonts
(`google/fonts`, dossier `ofl/`), avec fontTools (`varLib.instancer`).

| Fichier                                          | Source                                     | Axes figés                        |
| ------------------------------------------------ | ------------------------------------------ | --------------------------------- |
| `fraunces/Fraunces-SemiBold.ttf`                 | `Fraunces[SOFT,WONK,opsz,wght].ttf`        | wght 600, opsz 72, SOFT 0, WONK 1 |
| `fraunces/Fraunces-Italic.ttf`                   | `Fraunces-Italic[SOFT,WONK,opsz,wght].ttf` | wght 400, opsz 36, SOFT 0, WONK 1 |
| `plus-jakarta-sans/PlusJakartaSans-Regular.ttf`  | `PlusJakartaSans[wght].ttf`                | wght 400                          |
| `plus-jakarta-sans/PlusJakartaSans-SemiBold.ttf` | `PlusJakartaSans[wght].ttf`                | wght 600                          |

SOFT et WONK gardent les valeurs par défaut servies au site par l'API Google
Fonts, pour un dessin identique. Licence : SIL Open Font License 1.1 (`OFL.txt`
de chaque dossier), sans nom de police réservé.
