// Tipos compartidos entre servidor y navegador.

/** Una canción tal como viene de la playlist. */
export type Track = {
  /** Identificador estable dentro de la playlist (id del vídeo + posición). */
  id: string;
  /** Posición en la playlist, empezando en 1. */
  position: number;
  title: string;
  artists: string[];
  album?: string;
  durationSeconds?: number;
  thumb?: string;
  /** Tipo de pista según YouTube Music; `MUSIC_VIDEO_TYPE_ATV` es audio oficial. */
  videoType?: string;
};

export type PlaylistData = {
  id: string;
  title: string;
  author?: string;
  thumb?: string;
  /** Canciones que dice tener la playlist. */
  trackCount: number;
  /** Verdadero si se cortó en el tope de canciones. */
  truncated: boolean;
  tracks: Track[];
};

export type MapDiff = {
  characteristic: string;
  difficulty: string;
};

/** Etiqueta de versión de un mapa que no es la grabación original. */
export type VersionTag =
  | "remix"
  | "cover"
  | "nightcore"
  | "live"
  | "acoustic"
  | "instrumental"
  | "speed"
  | "short"
  | "extended"
  | "mashup"
  | "other";

export type BeatMap = {
  /** Clave del mapa en BeatSaver (hexadecimal). */
  id: string;
  hash: string;
  name: string;
  songName: string;
  songSubName: string;
  songAuthor: string;
  mapper: string;
  durationSeconds: number;
  bpm: number;
  /** Puntuación de 0 a 1. */
  score: number;
  upvotes: number;
  downvotes: number;
  coverURL: string;
  previewURL: string;
  downloadURL: string;
  diffs: MapDiff[];
  curated: boolean;
  ranked: boolean;
  /** Solo en "otras versiones": qué tipo de versión es. */
  version?: VersionTag;
};

export type MatchResult = {
  /** Mapas de la grabación original: son los que cuenta el contador. */
  maps: BeatMap[];
  /** Remixes, covers, directos y demás: se enseñan aparte y no cuentan. */
  others: BeatMap[];
};

export type SongStatus = "pending" | "searching" | "found" | "none" | "error";

/** Una canción de la playlist con el estado de su búsqueda. */
export type Song = Track & {
  status: SongStatus;
  maps: BeatMap[];
  others: BeatMap[];
};

export type ApiErrorCode =
  | "bad_link"
  | "not_playlist"
  | "not_found"
  | "empty"
  | "busy"
  | "upstream"
  | "too_many";
