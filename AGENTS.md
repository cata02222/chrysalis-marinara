# Marinara Engine, as a Chrysalis service app

This app is a thin wrapper. The program itself is a release of Marinara
Engine, pinned in `marinara.json`, downloaded and built into
`node_modules/marinara-engine/` by the manifest's setup step. The engine starts
`start.js`, which prepares a few things and then hands over to the server.

## What is where

- `manifest.json`: how the engine runs it. A change to `command`, `setup` or
  `env` needs the admin to allow the program again, so say so before editing
  those.
- `marinara.json`: the one file that decides which release runs.
- `setup.js`: downloads the release, installs its packages and builds it. It
  holds the few places where the build differs from the program's own, each
  with its reason. Raise `RECIPE` there when you change a step, so an existing
  build is made again.
- `start.js`: runs before the server on every start. It makes the connection
  named `Chrysalis` once and from then on keeps only its address and key
  current.
- `data/`: everything the user made. Never delete or rewrite it wholesale. It
  is not kept in git, so there is nothing to commit after changing it.
  - `data/storage/`: characters, chats, lorebooks, presets and settings, one
    file per item. Do not read, edit or add files there: the running program
    holds them in memory and writes them back, and their names are encoded.
    Use the API.
  - `data/avatars/`, `data/backgrounds/`, `data/gallery/`, `data/fonts/`:
    pictures and other uploads.
  - `data/.encryption-key`: unlocks the stored keys. Never read it out, print
    it or copy it.
  - `data/.chrysalis-connection`: the id of the connection `start.js` made.
- `node_modules/marinara-engine/`: the program. Read it to learn how something
  works. Do not edit it: the next release replaces it. The shell and `grep` do
  not see this folder. Only `read_file` with an exact path does (it also lists
  a folder), so do not search for it, open it:
  - `node_modules/marinara-engine/packages/server/src/routes/<area>.routes.ts`:
    the routes under `/api/<area>/`. Areas: `characters` (personas are in the
    same file), `chats`, `lorebooks`, `prompts`, `connections`,
    `regex-scripts`, `themes`, `import`, `backgrounds`, `agents`,
    `app-settings`.
  - `node_modules/marinara-engine/packages/shared/src/schemas/<area>.schema.ts`:
    what a body may hold, field by field.
  - `node_modules/marinara-engine/packages/client/src/`: what the page does.

## Changing what the app holds

What the user made is read and changed through the program's own API with the
`app_request` tool. Load the skill for the job before the first call. Each has
the routes and the bodies, so nothing has to be worked out from the source:

- `marinara-characters`: make, edit, copy, import, export, delete a character,
  change its picture.
- `marinara-personas`: the user's personas.
- `marinara-lorebooks`: make and edit a lorebook and its entries, and decide
  where a book applies: everywhere, for a character, a persona or one chat.
- `marinara-presets`: prompt presets, their sections, groups, variables and
  generation settings.
- `marinara-chats`: make, read, change and delete chats and their messages.
- `marinara-settings`: connections to models, regex scripts and themes.

What holds for every call:

- Send `headers: { "x-marinara-csrf": "1" }` on every call that is not a GET.
- A body is JSON (`json`) unless a skill says it is a form.
- An id is a short random word (`mRFkURx2Du3YW8dJ1Ib21`). It is in the answer
  to the call that made the item: keep it, and use it rather than the name.
- A successful DELETE answers `204` with nothing in it.
- Some answers hold their switches as the words `"true"` and `"false"`, and
  some lists and objects as text that is itself JSON (a character's `data`, a
  preset's `sectionOrder`). Bodies you send take real booleans, lists and
  objects.
- The open page keeps what it loaded. Set `reload: true` on the last call of a
  job that added, renamed or removed something. With no page open there is
  nothing to refresh, and the change shows the next time the user opens the
  tab.
- The tool cuts a long answer. Ask for one item, or for a page of a list
  (`?limit=`), not for everything at once.
- Do not guess a route or a body. One that no skill lists is read from its
  routes file and its schema file first.
- Ask before deleting anything the user made.

## The models

`start.js` makes one connection, `Chrysalis`, that points at the engine and
uses whatever model the user chose there (the model name `default`). Leave its
address and key alone: they are set again at every start. If the user deletes
that connection it is not made again; to get it back, delete
`data/.chrysalis-connection` and ask them to press Restart.

The program's log shows a `[cors] Rejected cross-origin request` line for the
address the tab is opened from. That is expected here and breaks nothing: the
engine sits in front of the program, and the page does not need the answer
that line is about.

## Changing how the app looks or behaves

Looks are changed with a theme, which is a stylesheet the program stores and
applies itself: see `marinara-settings`. There is no place in this wrapper for
code that changes the page, and `node_modules/marinara-engine/` must not be
edited.

## Moving to a new release

Change `version` in `marinara.json` and the `version` in `manifest.json` to
match, then ask the user to press Restart. Setup downloads and builds the new
release before the program starts again, which takes a few minutes. `data/`
is untouched.

Three things here lean on how the program is built and run, so they are where
to look when a new release does not come up:

- `setup.js` builds the page with the program's own settings less its grouping
  of packages into files. If the page stays blank, look at the build settings
  of `packages/client` in the new release.
- `start.js` adds two methods the runtime's stand-in for the program's
  connection pool lacks. If model replies fail with a message about a missing
  function, look there.
- `start.js` makes the `Chrysalis` connection through `/api/connections`. If a
  new release stops connecting to the models by itself, check that route's
  body in `connection.schema.ts`.
