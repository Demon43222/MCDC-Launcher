# Roadmap

## 0.3.0

- Add encrypted storage for Microsoft login data. Tokens currently stored in `config.json` under `authenticationDatabase` should be protected before writing to disk, preferably with Electron `safeStorage`/OS-backed encryption. Cover Minecraft access tokens plus Microsoft `access_token` and `refresh_token`, and keep a migration path for existing plain JSON configs.
