// Fetches the version of the program pinned in marinara.json and builds it
// into node_modules/marinara-engine. Runs before the first start and again
// when the pin changes.
// Every step uses the runtime that runs this file, so nothing else has to be
// installed on the computer.
import fs from "node:fs";
import path from "node:path";

const here = import.meta.dirname;
const pin = JSON.parse(fs.readFileSync(path.join(here, "marinara.json"), "utf8"));
// node_modules is the one folder the engine neither watches, exports nor
// replaces on an update, which is what a built copy of the program needs
export const program = path.join(here, "node_modules", "marinara-engine");
// raised when the steps below change, so an existing build is made again
const RECIPE = 1;
const wanted = `${pin.version}#${RECIPE}`;

const installed = () => {
  try { return fs.readFileSync(path.join(program, ".installed"), "utf8").trim(); } catch { return ""; }
};

/** True when the pinned version is there, built by these steps. */
export const isInstalled = () => installed() === wanted;

const say = (line) => console.log(`[setup] ${line}`);

// The page is built with the program's own settings, less two things. Its
// grouping of packages into files goes by the folder names one package manager
// gives them; under any other layout the groups end up needing each other in a
// circle and the page stops at a blank screen. The size check that goes with
// that grouping is dropped along with it.
const PAGE_CONFIG = "wrapper.vite.config.mjs";
const pageConfig = `import base from "./vite.config.ts";

const config = typeof base === "function" ? await base({ command: "build", mode: "production" }) : await base;
const output = { ...config.build?.rollupOptions?.output };
delete output.manualChunks;

export default {
  ...config,
  plugins: (config.plugins ?? []).flat(Infinity).filter((p) => p && p.name !== "bundle-budget"),
  build: { ...config.build, rollupOptions: { ...config.build?.rollupOptions, output } },
};
`;

// The build steps list every file they write: only what they report as wrong
// is passed on.
async function run(cwd, args, env = {}) {
  const proc = Bun.spawn([process.execPath, ...args], {
    cwd,
    // the runtime may be a program that only acts as one when told to
    env: { ...process.env, BUN_BE_BUN: "1", ...env },
    stdin: "ignore",
    stdout: "ignore",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`"${args.join(" ")}" ended with code ${code}`);
}

async function download(url, file) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`the download answered ${res.status}`);
  const out = Bun.file(file).writer();
  let got = 0;
  let told = 0;
  for await (const chunk of res.body) {
    out.write(chunk);
    got += chunk.byteLength;
    // the size is not announced, so progress is what arrived so far
    if (got - told >= 20 * 1024 * 1024) {
      await out.flush();
      told = got;
      say(`${Math.round(got / 1024 / 1024)} MB downloaded`);
    }
  }
  await out.end();
  return got;
}

export async function install() {
  if (isInstalled()) return;
  // built outside node_modules: the program's own build treats anything under
  // a folder of that name as somebody else's package and leaves its styles out
  const work = path.join(here, ".marinara-build");
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  const url = pin.source.replaceAll("{version}", pin.version);
  say(`downloading Marinara Engine ${pin.version} (about 110 MB)`);
  const archive = path.join(work, "source.tar.gz");
  const size = await download(url, archive);
  say(`unpacking ${Math.round(size / 1024 / 1024)} MB`);
  const unpacked = path.join(work, "unpacked");
  await new Bun.Archive(await Bun.file(archive).bytes()).extract(unpacked);
  fs.rmSync(archive);
  // the archive holds one folder named after the version
  const [top, ...more] = fs.readdirSync(unpacked);
  if (!top || more.length) throw new Error("the downloaded archive is not laid out as expected");
  const tree = path.join(work, "tree");
  fs.renameSync(path.join(unpacked, top), tree);
  fs.rmdirSync(unpacked);
  if (!fs.existsSync(path.join(tree, "packages", "server", "package.json"))) throw new Error("the downloaded archive has no server in it");

  say("installing its packages");
  // its own install scripts call a package manager this computer may not have
  await run(tree, ["install", "--ignore-scripts"]);

  // the lighter build: the same program, without the type check and without
  // the offline copy a browser would keep of the page
  say("building (1 of 3)");
  const shared = path.join(tree, "packages", "shared");
  await run(shared, ["scripts/generate-feature-registries.mjs"]);
  await run(shared, [Bun.resolveSync("typescript/bin/tsc", shared)]);
  say("building (2 of 3)");
  await run(path.join(tree, "packages", "server"), ["scripts/build.mjs"], { MARINARA_LOW_MEMORY_BUILD: "1" });
  say("building (3 of 3), the longest step");
  const client = path.join(tree, "packages", "client");
  fs.writeFileSync(path.join(client, PAGE_CONFIG), pageConfig);
  const vite = path.join(path.dirname(Bun.resolveSync("vite/package.json", client)), "bin", "vite.js");
  await run(client, [vite, "build", "--config", PAGE_CONFIG], { SKIP_PWA: "1", MARINARA_CLIENT_BUILD_SCRIPT: "1", NODE_ENV: "production" });
  await run(client, ["scripts/build-multiplayer-guest.mjs"]);

  fs.writeFileSync(path.join(tree, ".installed"), wanted + "\n");
  fs.rmSync(program, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(program), { recursive: true });
  fs.renameSync(tree, program);
  fs.rmSync(work, { recursive: true, force: true });
  say(`Marinara Engine ${pin.version} is ready`);
}

if (import.meta.main) {
  try {
    await install();
  } catch (err) {
    console.error(`[setup] failed: ${err?.message ?? err}`);
    process.exit(1);
  }
}
