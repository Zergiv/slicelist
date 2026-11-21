// Textos en español. Es la referencia: `en.ts` tiene que cumplir este mismo tipo.
// Voz: cercana, con humor, sin explicar cómo funciona por dentro.

import type { ApiErrorCode, VersionTag } from "../types";

export const es = {
  code: "es" as "es" | "en",
  locale: "es-ES",

  top: {
    language: "Idioma",
    localTime: "tu hora",
    source: "código",
    star: "estrella",
  },

  input: {
    lead: "Pega una playlist de YouTube Music o Spotify y te digo qué canciones puedes cortar en Beat Saber.",
    label: "Enlace de la playlist",
    placeholder: "Pega aquí el enlace de tu playlist",
    submit: "Buscar mapas",
    stop: "Parar",
    hint: "Tiene que ser pública. Valen YouTube Music y Spotify, playlists y álbumes.",
    example: "Probar con una de ejemplo",
    lookupLabel: "o una canción suelta",
    lookupPlaceholder: "nombre o enlace de una pista",
    lookupSubmit: "buscar",
    lookupHint: "extra: escribe un título (te sugiero artistas) o pega un enlace de YouTube o Spotify.",
    lookupEmpty: "no encuentro esa canción. prueba otro nombre.",
  },

  errors: {
    bad_link: "Eso no parece un enlace de playlist. Cópialo desde Compartir, en YouTube Music o Spotify.",
    not_playlist: "Ese enlace es de una canción suelta o de una mezcla automática. Pega el de una playlist.",
    not_found: "Esa playlist es privada o no existe. Hazla pública y vuelve a pegarla.",
    empty: "Esa playlist está vacía. Métele canciones y vuelve.",
    busy: "Ahora mismo no llego a leer esa playlist. Prueba otra vez en un minuto.",
    upstream: "No me han dejado leer esa playlist. Prueba otra vez en un minuto.",
    too_many: "Vas muy rápido. Espera un minuto y seguimos.",
  } satisfies Record<ApiErrorCode, string>,

  status: {
    you: "tú",
    playlist: "playlist",
    songs: "canciones",
    withMap: "con mapa",
    withoutMap: "sin mapa",
    maps: "mapas",
    took: "tardó",
    headset: "visor",
    nothing: "ninguna todavía",
    reading: "leyendo",
    seconds: (s: string) => `${s} s`,
    truncated: (n: number) => `solo las primeras ${n}`,
    blockLabel: (done: number, total: number) => `Progreso: ${done} de ${total} canciones`,
  },

  headsetStatus: {
    unsupported: "no disponible",
    idle: "sin conectar",
    connecting: "conectando",
    authorizing: "esperando permiso",
    connected: "conectado",
    notModded: "sin mods",
    busy: "ocupado",
    error: "desconectado",
  },

  marquee: {
    title: "portadas",
    label: "Portadas de tu playlist",
    pause: "Pausar",
    resume: "Seguir",
    empty: "Las portadas de tu playlist pasarán por aquí.",
    open: (title: string) => `Ir a ${title}`,
  },

  filters: {
    label: "Qué canciones ver",
    withMap: "con mapa",
    withoutMap: "sin mapa",
  },

  list: {
    emptyTitle: "Aquí aparecerán tus canciones. De momento, silencio.",
    reading: "Leyendo la playlist",
    noneWithMap: "Ninguna de estas tiene mapa. Mapeadores, a trabajar.",
    noneWithMapScanning: "Todavía ninguna. Sigo buscando.",
    allHaveMap: "Todas tienen mapa. Hoy no te libras de sudar.",
    withoutMapLead: "Nadie las ha mapeado. Todavía.",
    retry: "Volver a intentarlo",
    scanning: (done: number, total: number) => `Buscando: ${done} de ${total}`,
    pendingLeft: (n: number) => (n === 1 ? "Queda 1 sin buscar." : `Quedan ${n} sin buscar.`),
    resume: "Seguir buscando",
    failedLead: (n: number) =>
      n === 1 ? "Con esta no he podido." : `Con estas ${n} no he podido.`,
    retryAll: "Reintentar todas",
    position: (n: number) => `Canción ${n}`,
  },

  song: {
    searching: "buscando",
    failed: "no pude buscarla",
    retry: "Reintentar",
    noMap: "sin mapa",
    maps: (n: number) => (n === 1 ? "1 mapa" : `${n} mapas`),
    versions: (n: number) => (n === 1 ? "1 versión distinta" : `${n} versiones distintas`),
    others: (n: number): string => (n === 1 ? "otra versión" : "otras versiones"),
    othersHint: "Remixes, covers y directos. No cuentan como mapa de la canción.",
    searchElsewhere: "Buscarla a mano en BeatSaver",
    markerFound: "Con mapa",
    markerNone: "Sin mapa",
    markerSearching: "Buscando",
    markerError: "Fallo",
  },

  map: {
    by: "mapeó",
    score: "puntuación",
    upvotes: "votos a favor",
    downvotes: "votos en contra",
    curated: "curado",
    ranked: "con ranking",
    listen: "Escuchar",
    pause: "Pausar",
    view: "Ver mapa",
    download: "Descargar",
    difficulties: "Dificultades",
  },

  version: {
    remix: "remix",
    cover: "cover",
    nightcore: "nightcore",
    live: "en directo",
    acoustic: "acústica",
    instrumental: "instrumental",
    speed: "otra velocidad",
    short: "versión corta",
    extended: "versión larga",
    mashup: "mashup",
    other: "otra versión",
  } satisfies Record<VersionTag, string>,

  nowPlaying: {
    title: "ahora suena",
    empty: "Nada suena. Dale a una vista previa.",
    play: "Seguir escuchando",
    pause: "Pausar",
    by: "mapeó",
    volume: "Volumen",
  },

  quest: {
    title: "visor",
    idle: "Conecta tu Quest con el cable y lo mando directo al juego.",
    connect: "Conectar visor",
    disconnect: "Desconectar",
    authorizing: "Ponte el visor y acepta el aviso.",
    connecting: "Buscando tu visor.",
    connected: (name: string, n: number) =>
      n === 0
        ? `${name} conectado. Aún no tiene canciones añadidas.`
        : n === 1
          ? `${name} conectado. Tiene 1 canción añadida.`
          : `${name} conectado. Tiene ${n} canciones añadidas.`,
    fallbackName: "Tu Quest",
    unsupported: "Este navegador no puede hablar con el visor. Abre slicelist en Chrome o Edge.",
    notModded:
      "No encuentro Beat Saber con mods en este visor. Pásalo antes por ModsBeforeFriday y vuelve.",
    busy: "Otro programa está usando el visor. Ciérralo y vuelve a intentarlo.",
    lost: "Se ha soltado el visor. Revisa el cable y vuelve a conectar.",
    retry: "Reintentar",
    sendBest: "Añadir el mejor de cada canción",
    nothingToSend: "Las que tienen mapa ya están en tu visor.",
    batchProgress: (done: number, total: number) => `${done} de ${total}`,
    stop: "Parar",
    done: "Listo. Reinicia Beat Saber y a cortar.",
    doneWithFailures: (n: number) =>
      n === 1
        ? "Listo, menos 1 que no ha entrado. Reinicia Beat Saber y a cortar."
        : `Listo, menos ${n} que no han entrado. Reinicia Beat Saber y a cortar.`,
  },

  send: {
    idle: "Añadir al visor",
    queued: "En cola",
    sending: (percent: number) => `Enviando ${percent} %`,
    done: "En tu visor",
    failed: "No ha entrado. Reintentar",
  },

  footer: {
    credit: "Los mapas los hace la gente de BeatSaver. slicelist solo te los encuentra.",
  },
};

export type Dict = typeof es;
