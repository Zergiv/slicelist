// PM2: la web y el lector de playlists.
//   pnpm build && pm2 start ecosystem.config.cjs && pm2 save
//
// La web en 4200 (4190 lo bloquean Firefox/Zen: ManageSieve). Escucha en
// todas las interfaces para la LAN; el túnel de Cloudflare puede apuntar a
// http://127.0.0.1:4200. El lector solo en 127.0.0.1 y no se publica.

const path = require("node:path");

const root = __dirname;

module.exports = {
  apps: [
    {
      name: "slicelist",
      cwd: root,
      script: path.join(root, "node_modules/next/dist/bin/next"),
      args: "start -p 4200 -H 0.0.0.0",
      env: {
        NODE_ENV: "production",
        READER_URL: "http://127.0.0.1:4191",
      },
      max_memory_restart: "600M",
    },
    {
      name: "slicelist-reader",
      cwd: root,
      script: path.join(root, "reader/server.py"),
      interpreter: path.join(root, "reader/.venv/bin/python"),
      env: {
        READER_PORT: "4191",
        PYTHONUNBUFFERED: "1",
      },
      max_memory_restart: "300M",
    },
  ],
};
