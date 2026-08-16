![HorizonUI](https://github.com/nokarin-dev/horizonui/blob/main/assets/HorizonUI_Banner.png?raw=true)

Minecraft launcher for [HorizonUI](https://modrinth.com/mod/horizonui).

## Install

Get a build from [Releases](https://github.com/nokarin-dev/HorizonUI-Launcher/releases).

| | Installer | Portable |
| --- | --- | --- |
| Windows | `*-setup.exe` | `*-portable.zip` |
| Linux | `.deb` or `.rpm` | `.AppImage` |
| macOS | `.dmg` | |

Java 17, 21, or 25 depending on the Minecraft version.

## Build

[Node.js](https://nodejs.org/) 20+, Rust stable, and the [Tauri dependencies](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
pnpm install
pnpm run tauri dev
```

Copy `.env.example` to `.env` and fill in keys if you need CurseForge search, Microsoft login, or Ely.by OAuth.

```bash
pnpm run tauri build
```

Bundles land in `src-tauri/target/release/bundle/`.

## Data

```
~/.horizonui-launcher/
├── launcher.json
├── accounts.json
├── profiles.json
├── logs/
└── instances/<id>/
    └── .minecraft/
```

## License

[GPL-3.0-or-later](LICENSE). Copyright (C) 2026 nokarin.
