# slicelist

[![AI Assisted](https://img.shields.io/badge/🤖_AI_Assisted-Project-8A2BE2.svg)](#)

Pegas una playlist pública de YouTube Music o Spotify y te dice qué canciones
tienen mapa de Beat Saber en [BeatSaver](https://beatsaver.com), con vista
previa, descarga y envío a un Quest conectado por cable.

## Qué hay dentro

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| Web | `src/` (Next.js 16, React 19, Tailwind 4, Motion) | Interfaz y rutas de servidor |
| Lector | `reader/server.py` (Python, ytmusicapi + Spotify) | Lee playlists y álbumes públicos. Solo escucha en `127.0.0.1` |
| Caché | `data/cache.db` (SQLite de Node) | Búsquedas 24 h, vacías 6 h, playlists 15 min |

Recorrido de una búsqueda:

1. `GET /api/playlist?link=…` valida el enlace y pide las canciones al lector.
2. El navegador llama a `POST /api/match` canción a canción, cuatro a la vez.
3. El servidor limpia el título, pregunta a BeatSaver (como mucho dos veces por
   canción) y se queda con los mapas cuyo título y artista coinciden.
   Remixes, covers y directos van a "otras versiones".
4. Las peticiones a BeatSaver pasan por una cola global (cuatro a la vez, con
   espera y reintento si pide frenar) y hay un tope por visitante.

No hace falta clave de YouTube Music, Spotify ni BeatSaver. En Spotify se leen
hasta 200 canciones por defecto (`READER_MAX_TRACKS`).

## Requisitos

- Node 24 o posterior (usa `node:sqlite` y ejecuta las pruebas en TypeScript tal cual)
- pnpm
- Python 3.10 o posterior

## Desarrollo

```bash
pnpm install

# lector de playlists
python3 -m venv reader/.venv
reader/.venv/bin/pip install -r reader/requirements.txt
reader/.venv/bin/python reader/server.py        # 127.0.0.1:4191

# web, en otra terminal
pnpm dev -p 4200
```

- `http://localhost:4200` — la web. "Probar con una de ejemplo" funciona sin el lector.
- `http://localhost:4200/design` — design system y piezas en cada estado.

```bash
pnpm test        # limpieza de títulos, coincidencia, cola, tope y archivos del visor
pnpm typecheck
```

`node scripts/make-sample.ts` regenera la playlist de ejemplo a partir de las
respuestas guardadas en `src/lib/match/fixtures`.

## Producción (PM2)

```bash
cp .env.example .env      # opcional: contacto para BeatSaver
pnpm install
python3 -m venv reader/.venv && reader/.venv/bin/pip install -r reader/requirements.txt
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
```

Arranca `slicelist` (web, puerto **4200**) y `slicelist-reader` (lector,
`127.0.0.1:4191`). El túnel de Cloudflare tiene que apuntar a
`http://127.0.0.1:4200`. El lector no se publica. No uses el 4190: Firefox y Zen
lo bloquean.

El envío al visor necesita que la web se sirva por HTTPS (el túnel ya lo da) o
desde `localhost`.

## Envío al visor

Funciona en Chrome y Edge (WebUSB), con un Quest en modo desarrollador,
conectado por cable y con Beat Saber ya modificado (por ejemplo con
[ModsBeforeFriday](https://github.com/Lauriethefish/ModsBeforeFriday)).

- El zip se baja de BeatSaver en el navegador, se descomprime ahí mismo y se
  escribe por ADB. El servidor no interviene.
- Solo se escribe dentro de
  `/sdcard/ModData/com.beatgames.beatsaber/Mods/SongCore/CustomLevels/<id> (…)`.
- Nunca se borra ni se renombra nada del visor.
- `Info.dat` se escribe el último: si el envío se corta, el juego no ve un mapa a medias.
- Un mapa cuenta como "en tu visor" si hay una carpeta cuyo nombre empieza por
  su id o contiene su hash.

Usa `@yume-chan/adb` y `fflate` (MIT). No contiene código de ModsBeforeFriday
(AGPL-3.0); solo se tomó la idea.

## Límites conocidos

- **ytmusicapi no es oficial.** Si YouTube Music cambia por dentro, el lector
  puede dejar de leer hasta que se actualice la librería
  (`reader/requirements.txt`).
- **Títulos en otro alfabeto.** Si los mapas de una canción solo usan el título
  romanizado o traducido (紅蓮華 → "Gurenge"), no se encuentran.
- **Como mucho 50 resultados por búsqueda.** En canciones con muchísimos mapas
  el número puede quedarse corto.
- **Mapas enviados a medias.** Si un envío se corta, la carpeta queda en el
  visor sin `Info.dat`; al reconectar aparecerá como "en tu visor" aunque el
  juego no la cargue. Se arregla borrando esa carpeta a mano.
- El tope por visitante se fía de las cabeceras del túnel; no es una defensa
  contra abuso deliberado.

## Diseño

`DESIGN.md` es la referencia (paleta, tipografía, espaciado, movimiento) y
`.cursor/rules/slicelist.mdc` recoge las reglas del proyecto.
