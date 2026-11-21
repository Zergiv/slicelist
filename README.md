<div align="center">

<img src="docs/logo.svg" alt="slicelist" width="72" height="72">

# slicelist

Paste a YouTube Music or Spotify playlist. Find Beat Saber maps on [BeatSaver](https://beatsaver.com), preview them, download, or send them to a Quest over USB.

**[slicelist.zergiv2.tech](https://slicelist.zergiv2.tech)**

[![AI Assisted](https://img.shields.io/badge/AI_Assisted-Project-b770ee?style=for-the-badge&labelColor=0c0b0a)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16-0c0b0a?style=for-the-badge&logo=next.js&logoColor=ebe4d8&labelColor=0c0b0a&color=17324f)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-0c0b0a?style=for-the-badge&logo=typescript&logoColor=ebe4d8&labelColor=0c0b0a&color=4aa3ff)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-0c0b0a?style=for-the-badge&labelColor=0c0b0a&color=ebe4d8)](LICENSE)

<img src="docs/preview.png" alt="slicelist preview" width="900">

</div>

## Usage

1. Paste a **public** playlist or album link (YouTube Music or Spotify).
2. Or look up a single song by name (with suggestions) or a track link.
3. Browse matches, preview audio, download maps.
4. In Chrome or Edge, connect a Quest over USB to send maps into Beat Saber (modded, e.g. [ModsBeforeFriday](https://github.com/Lauriethefish/ModsBeforeFriday)).

No API keys. Spotify playlists are capped at 200 tracks by default (`READER_MAX_TRACKS`).

## Install

Needs Node 24+, pnpm, and Python 3.10+.

```bash
pnpm install

python3 -m venv reader/.venv
reader/.venv/bin/pip install -r reader/requirements.txt
reader/.venv/bin/python reader/server.py   # 127.0.0.1:4191

pnpm dev -p 4200
```

Open `http://localhost:4200`. Sample playlist works without the reader.

### Production (PM2)

```bash
cp .env.example .env   # optional BeatSaver contact
pnpm install
python3 -m venv reader/.venv && reader/.venv/bin/pip install -r reader/requirements.txt
pnpm build
pm2 start ecosystem.config.cjs
```

Web on `:4200`. Reader stays on `127.0.0.1:4191` (not public). Quest send needs HTTPS or `localhost`.

```bash
pnpm test
pnpm typecheck
```

## Credits

| Piece | From |
| --- | --- |
| Maps | [BeatSaver](https://beatsaver.com) |
| YouTube Music playlists | [ytmusicapi](https://github.com/sigma67/ytmusicapi) |
| Quest ADB | [@yume-chan/adb](https://github.com/yume-chan/ya-webadb) |
| Zip in the browser | [fflate](https://github.com/101arrowz/fflate) |
| UI | [Next.js](https://nextjs.org), [React](https://react.dev), [Motion](https://motion.dev), [Tailwind](https://tailwindcss.com) |

Quest send path inspired by [ModsBeforeFriday](https://github.com/Lauriethefish/ModsBeforeFriday) (AGPL). This repo does not include their code.
