// Conexión con el visor por cable (ADB sobre WebUSB) y envío de mapas.
// Este módulo se carga solo al pulsar "Conectar visor".
//
// Reglas que no se rompen:
// - solo se escribe dentro de SONGS_DIR;
// - nunca se borra ni se renombra nada del visor.

import {
  Adb,
  AdbDaemonTransport,
  AdbPublicKeyAuthenticator,
  AdbSignatureAuthenticator,
  LinuxFileType,
  type AdbAuthenticator,
  type AdbSync,
} from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { AdbDaemonWebUsbDevice, AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import { unzip } from "fflate";
import type { BeatMap } from "../types";
import { MOD_DATA_DIR, SONG_SCAN_DIRS, SONGS_DIR, folderName, installedKeys } from "./installed";
import { planFiles, totalBytes } from "./push";

export type QuestErrorCode = "cancelled" | "unsupported" | "busy" | "notModded" | "lost" | "failed";

export class QuestError extends Error {
  code: QuestErrorCode;
  constructor(code: QuestErrorCode, cause?: unknown) {
    super(code, { cause });
    this.name = "QuestError";
    this.code = code;
  }
}

export type QuestSession = {
  name: string;
  /** Ids y hashes de los mapas que ya están en el visor. Se va actualizando. */
  installed: Set<string>;
  /** Canciones que hay en la carpeta del juego, las haya puesto quien sea. */
  songCount: number;
  /** Manda un mapa. `onProgress` recibe de 0 a 1. */
  push(map: BeatMap, onProgress: (progress: number) => void): Promise<void>;
  close(): Promise<void>;
  /** Se resuelve cuando el visor se desconecta. */
  lost: Promise<void>;
};

const DOWNLOAD_SHARE = 0.55;

export async function openQuest(onAuthorizing: () => void): Promise<QuestSession> {
  const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
  if (!manager) throw new QuestError("unsupported");

  let device: AdbDaemonWebUsbDevice | undefined;
  try {
    device = await manager.requestDevice();
  } catch (err) {
    throw new QuestError("cancelled", err);
  }
  if (!device) throw new QuestError("cancelled");

  let adb: Adb;
  try {
    const connection = await device.connect();
    // Solo se llega al segundo paso cuando el visor aún no conoce este
    // navegador: es el momento en que aparece el aviso dentro del visor.
    const asking: AdbAuthenticator = async function* (store, next) {
      onAuthorizing();
      yield* AdbPublicKeyAuthenticator(store, next);
    };
    const transport = await AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection,
      credentialStore: new AdbWebCredentialStore("slicelist"),
      authenticators: [AdbSignatureAuthenticator, asking],
    });
    adb = new Adb(transport);
  } catch (err) {
    if (err instanceof AdbDaemonWebUsbDevice.DeviceBusyError) throw new QuestError("busy", err);
    throw new QuestError("failed", err);
  }

  let closed = false;
  const lost = adb.disconnected.then(
    () => undefined,
    () => undefined,
  );

  try {
    const sync = await adb.sync();
    try {
      if (!(await sync.isDirectory(MOD_DATA_DIR))) throw new QuestError("notModded");
      const folders = await listSongFolders(adb, sync);
      const installed = installedKeys(folders);
      const name = adb.banner.model?.replace(/_/g, " ") || device.name || "";

      const session: QuestSession = {
        name,
        installed,
        songCount: folders.length,
        lost,
        async push(map, onProgress) {
          if (closed) throw new QuestError("lost");
          await pushMap(adb, map, onProgress);
          installed.add(map.id.toLowerCase());
          session.songCount += 1;
        },
        async close() {
          closed = true;
          await adb.close().catch(() => undefined);
        },
      };
      return session;
    } finally {
      await sync.dispose().catch(() => undefined);
    }
  } catch (err) {
    await adb.close().catch(() => undefined);
    throw err instanceof QuestError ? err : new QuestError("failed", err);
  }
}

const LIST_TMP = "/data/local/tmp/slicelist-songs.txt";

/**
 * Lista las carpetas de canciones del visor.
 *
 * Con muchas canciones (las que mete SongDownloader), el sync LIST y a veces
 * incluso la salida directa de `ls` por ADB se cortan a unas pocas entradas.
 * Por eso: el shell escribe el listado a un fichero y lo leemos entero.
 */
async function listSongFolders(adb: Adb, sync: AdbSync): Promise<string[]> {
  const names = new Set<string>();

  for (const dir of SONG_SCAN_DIRS) {
    if (!/^[\w./-]+$/.test(dir)) continue;

    const fromFile = await listViaTempFile(adb, sync, dir);
    if (fromFile !== null) {
      for (const name of fromFile) names.add(name);
      continue;
    }

    const fromShell = await listViaShell(adb, dir);
    if (fromShell !== null && fromShell.length > 0) {
      for (const name of fromShell) names.add(name);
      continue;
    }

    for (const name of await listViaSync(sync, dir)) names.add(name);
  }

  return [...names];
}

/** Escribe `ls` en un fichero del visor y lo lee por sync (sin límite de pipe). */
async function listViaTempFile(adb: Adb, sync: AdbSync, dir: string): Promise<string[] | null> {
  try {
    // Si la carpeta no existe, dejamos el fichero vacío y seguimos.
    // `find -type d`: SongDownloader deja una carpeta por mapa (a menudo solo
    // el hash). Evitamos ficheros sueltos y no nos fiamos del pipe de ADB.
    const code = (
      await adb.subprocess.noneProtocol.spawnWaitText(
        `if [ -d "${dir}" ]; then find "${dir}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \\; > "${LIST_TMP}"; echo ok; else echo missing; fi`,
      )
    ).trim();
    if (code !== "ok") return code === "missing" ? [] : null;

    const text = await readTextFile(sync, LIST_TMP);
    return parseNameList(text);
  } catch {
    return null;
  } finally {
    await adb.subprocess.noneProtocol
      .spawnWaitText(`rm -f "${LIST_TMP}"`)
      .catch(() => undefined);
  }
}

async function listViaShell(adb: Adb, dir: string): Promise<string[] | null> {
  try {
    const out = await adb.subprocess.noneProtocol.spawnWaitText(
      `ls -1 "${dir}" 2>/dev/null || true`,
    );
    return parseNameList(out);
  } catch {
    return null;
  }
}

async function listViaSync(sync: AdbSync, dir: string): Promise<string[]> {
  if (!(await sync.isDirectory(dir))) return [];
  const names: string[] = [];
  for await (const entry of sync.opendir(dir)) {
    if (entry.name === "." || entry.name === "..") continue;
    if (entry.type !== undefined && entry.type !== LinuxFileType.Directory) continue;
    names.push(entry.name);
  }
  return names;
}

function parseNameList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((name) => name && name !== "." && name !== "..");
}

async function readTextFile(sync: AdbSync, path: string): Promise<string> {
  const stream = sync.read(path);
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    total += value.byteLength;
    // Tope de seguridad: ~8 MB de nombres de carpeta.
    if (total > 8 * 1024 * 1024) break;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder().decode(out);
}

async function pushMap(adb: Adb, map: BeatMap, onProgress: (p: number) => void) {
  const folder = folderName(map);
  const dir = `${SONGS_DIR}/${folder}`;
  onProgress(0);

  const zip = await download(map.downloadURL, (p) => onProgress(p * DOWNLOAD_SHARE));
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(zip, (err, data) => (err ? reject(err) : resolve(data)));
  });
  const files = planFiles(entries, folder);
  const total = Math.max(1, totalBytes(files));

  const sync = await adb.sync();
  try {
    let written = 0;
    for (const file of files) {
      // Cinturón y tirantes: nada sale de la carpeta de este mapa.
      if (!file.path.startsWith(`${dir}/`)) throw new QuestError("failed");
      const before = written;
      await sync.write({
        filename: file.path,
        file: chunked(file.data, (sent) => {
          onProgress(DOWNLOAD_SHARE + ((before + sent) / total) * (1 - DOWNLOAD_SHARE));
        }) as never,
      });
      written += file.data.byteLength;
    }
  } finally {
    await sync.dispose().catch(() => undefined);
  }
  onProgress(1);
}

async function download(url: string, onProgress: (p: number) => void): Promise<Uint8Array> {
  const host = new URL(url).hostname;
  if (!host.endsWith(".beatsaver.com")) throw new QuestError("failed");

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new QuestError("failed");
  const expected = Number(res.headers.get("content-length")) || 0;

  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    received += value.byteLength;
    if (expected) onProgress(Math.min(1, received / expected));
  }

  const out = new Uint8Array(received);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  onProgress(1);
  return out;
}

/** Trocea un archivo para poder contar lo que ya ha salido hacia el visor. */
function chunked(data: Uint8Array, onSent: (bytes: number) => void): ReadableStream<Uint8Array> {
  const SIZE = 64 * 1024;
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= data.byteLength) {
        controller.close();
        return;
      }
      const end = Math.min(offset + SIZE, data.byteLength);
      controller.enqueue(data.subarray(offset, end));
      offset = end;
      onSent(offset);
    },
  });
}
