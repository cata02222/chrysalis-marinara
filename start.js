// Runs on every start. It makes sure the pinned version of the program is
// built, starts the server, then keeps a connection to the engine's models in
// it, so nothing has to be typed in.
import fs from "node:fs";
import path from "node:path";
import { install, isInstalled, program } from "./setup.js";

const url = process.env.MODELS_URL;
const key = process.env.MODELS_KEY;
const data = process.env.DATA_DIR;
const port = process.env.PORT;
const NAME = "Chrysalis";

// setup did this before the first start; a build that went missing since
// (a cleared folder) is made again here
if (!isInstalled()) await install();

// the server answers its switches as the words "true" and "false"
const on = (v) => v === true || v === "true";

// The server makes one connection pool per request to another computer and
// closes it afterwards. This runtime's own fetch needs no such pool and hands
// out an empty stand-in, which has nothing to close: without these two the
// server fails every request it makes, model replies included.
const { Agent } = await import("undici");
Agent.prototype.close ??= async function close() {};
Agent.prototype.destroy ??= async function destroy() {};

async function linkModels() {
  const api = `http://127.0.0.1:${port}/api/connections`;
  const json = { "content-type": "application/json" };
  let list = null;
  for (let i = 0; i < 600 && !list; i++) {
    try {
      const res = await fetch(api);
      if (res.ok) list = await res.json();
    } catch { /* not listening yet */ }
    if (!list) await Bun.sleep(500);
  }
  if (!Array.isArray(list)) return;

  // Which connection is this app's own is remembered by its id. Made once;
  // after that it is the user's to rename, change or delete, and a deleted
  // one is not made again.
  const marker = path.join(data, ".chrysalis-connection");
  let id = "";
  try { id = fs.readFileSync(marker, "utf8").trim(); } catch { /* first start */ }
  if (!id) {
    const res = await fetch(api, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        name: NAME,
        provider: "custom",
        baseUrl: url,
        apiKey: key,
        model: "default",
        isDefault: !list.some((c) => on(c.isDefault)),
        defaultForAgents: !list.some((c) => on(c.defaultForAgents)),
      }),
    });
    if (!res.ok) throw new Error(`the server answered ${res.status} to the new connection`);
    fs.writeFileSync(marker, (await res.json()).id + "\n");
    console.log(`[start] connected to the models of ${NAME}`);
    return;
  }
  // the key changes with a new approval and the address with the engine's
  // port: both are kept current, everything else on it is left alone
  if (list.some((c) => c.id === id)) {
    const res = await fetch(`${api}/${id}`, { method: "PATCH", headers: json, body: JSON.stringify({ baseUrl: url, apiKey: key }) });
    if (!res.ok) throw new Error(`the server answered ${res.status} to the connection update`);
  }
}

if (url && key && data && port) {
  void linkModels().catch((err) => console.error(`[start] could not connect the models: ${err?.message ?? err}`));
}

await import(path.join(program, "packages", "server", "dist", "index.js"));
