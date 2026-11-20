// Estados del envío al visor, tal como los ve la interfaz.

export type QuestPhase =
  | "unsupported" // el navegador no puede hablar con el visor
  | "idle" // sin conectar
  | "connecting" // eligiendo el visor
  | "authorizing" // esperando que se acepte el aviso dentro del visor
  | "connected"
  | "notModded" // conectado, pero el juego no tiene mods
  | "busy" // otro programa tiene el visor cogido
  | "error"; // se soltó o falló la conexión

export type SendStatus = {
  state: "queued" | "sending" | "done" | "failed";
  /** De 0 a 1. */
  progress: number;
};

export type BatchStatus = {
  running: boolean;
  done: number;
  total: number;
  failed: number;
};

export type QuestView = {
  phase: QuestPhase;
  deviceName?: string;
  /** Canciones que ya hay en la carpeta del juego. */
  installedCount: number;
  batch: BatchStatus | null;
};
