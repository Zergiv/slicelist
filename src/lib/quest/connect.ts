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
  type AdbAuthenticator,
  type AdbSync,
} from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { AdbDaemonWebUsbDevice, AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import { unzip } from "fflate";
import type { BeatMap } from "../types";
import { MOD_DATA_DIR, SONGS_DIR, folderName, installedKeys } from "./installed";
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
      const folders = await listFolders(sync);
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

async function listFolders(sync: AdbSync): Promise<string[]> {
  if (!(await sync.isDirectory(SONGS_DIR))) return [];
  const names: string[] = [];
  for await (const entry of sync.opendir(SONGS_DIR)) {
    if (entry.name !== "." && entry.name !== "..") names.push(entry.name);
  }
  return names;
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
