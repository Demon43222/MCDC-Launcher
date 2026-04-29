# MCDC.pl Launcher

Repozytorium launchera Minecraft przygotowanego pod serwer `MCDC.pl`.

## Status

Aktualny etap: `v0.1`

## Co zawiera

- logowanie Microsoft,
- logowanie offline z wyborem nicku,
- wybór paczek/modpacków,
- integrację z Discordem,
- automatyczne pobieranie wymaganych plików i Javy.

## Development

Wymagany Node.js `22.x`.

Instalacja zależności:

```bash
npm install
```

Uruchomienie:

```bash
npm start
```

Budowanie:

```bash
npm run dist
```

Budowanie dla konkretnej platformy:

```bash
npm run dist:win
npm run dist:mac
npm run dist:linux
```

## Do podmiany przed publikacją

- branding `MCDC.pl` w razie dalszych zmian,
- linki w `app/assets/lang/_custom.toml`,
- metadane w `package.json`,
- metadane buildu w `electron-builder.yml`.
