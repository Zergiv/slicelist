// Forma de la respuesta de BeatSaver (solo los campos que se usan).
// Fuente: definición oficial en https://api.beatsaver.com/docs/swagger.json

export type BsDiff = {
  characteristic: string;
  difficulty: string;
};

export type BsVersion = {
  hash: string;
  state: string;
  coverURL: string;
  previewURL: string;
  downloadURL: string;
  diffs: BsDiff[];
};

export type BsMap = {
  id: string;
  name: string;
  automapper?: boolean;
  ranked?: boolean;
  blRanked?: boolean;
  curatedAt?: string;
  tags?: string[];
  metadata: {
    bpm: number;
    duration: number;
    songName: string;
    songSubName: string;
    songAuthorName: string;
    levelAuthorName: string;
  };
  stats: {
    upvotes: number;
    downvotes: number;
    score: number;
  };
  versions: BsVersion[];
};

export type BsSearchResponse = {
  docs: BsMap[];
};
