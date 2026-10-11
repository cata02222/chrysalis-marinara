---
name: marinara-settings
description: Read and change the connections to models, the regex scripts and the themes (custom CSS) of this Marinara Engine, through the program's own API with app_request. Load it before touching which model is used, how text is rewritten on the way in or out, or how the app looks.
---

# Connections, regex scripts, themes

## Every call

All of this is done with the `app_request` tool, with `id` set to this app's
id. The program must be running: if the tool says it is not, ask the user to
open the app's tab.

- Send `headers: { "x-marinara-csrf": "1" }` on every call that is not a GET.
- Bodies are JSON (`json`).
- Set `reload: true` on the last call of a job that added, renamed or removed
  something.
- In answers, switches are the words `"true"` and `"false"`, and lists are
  text that is itself JSON. Bodies you send take real booleans and lists.

## Connections

A connection is a model provider with its address and key. GET
`/api/connections` answers the list. Keys are stored locked and never come
back in an answer: do not ask the user to paste one into the chat, and never
read `data/.encryption-key`.

### The one this app made

The connection named `Chrysalis` points at the engine and uses the model the
user chose there. Its `model` is `default`, which means "whatever the engine
is set to". The start script sets its address and key again at every start,
so do not change those two. Its id is in `data/.chrysalis-connection`.

- **Which models it offers:** GET `/api/connections/<id>/models` answers
  `{ "models": [{ "id", "name" }, ...] }`, the engine's own list. Add
  `?refresh=true` to ask the engine again.
- **Pin it to one model:** PATCH `/api/connections/<id>` with
  `{ "model": "<a model id from that list>" }`. `default` follows the engine
  again.
- **Check it works:** POST `/api/connections/<id>/test` with `json: {}`
  answers `{ "success": true, "latencyMs": 28, ... }`.

When the user wants a different model, the simplest answer is usually to
change it in the engine's own model picker: every chat here follows.

### Others

- **Change:** PATCH `/api/connections/<id>` with only the fields that
  change: `name`, `model`, `maxContext` (the model's context size, 128000 by
  default), `isDefault` (used by chats with no connection of their own),
  `defaultForAgents` (used by the program's helper agents).
- **Copy:** POST `/api/connections/<id>/duplicate` with `json: {}`.
- **Delete:** DELETE `/api/connections/<id>` answers `204`. Ask the user
  first, and never delete `Chrysalis` without saying that the app then has
  no model until it is made again.
- **Add one to an outside provider:** leave this to the user, in the page's
  own Connections panel, because it takes a key.

Which connection a chat uses is the chat's `connectionId` (see
`marinara-chats`).

## Regex scripts

A regex script rewrites text: what the model sent before it is shown, what
the user typed, or what goes into the prompt.

- **Which exist:** GET `/api/regex-scripts`. A few ship with the program
  (their ids start with `default-`): leave those as they are.
- **Create:** POST `/api/regex-scripts` with

  ```json
  {
    "name": "No asterisks",
    "findRegex": "\\*",
    "replaceString": "",
    "placement": ["ai_output"],
    "flags": "g",
    "applyMode": "display",
    "enabled": true
  }
  ```

  `name`, `findRegex` and `placement` are required. `placement` holds
  `ai_output`, `user_input` or both. `flags` are regular expression flags
  (`gi` when left out). `replaceString` can use `$1`, `$2` for groups.
  `applyMode` is `display` (what is shown), `prompt` (what is sent to the
  model) or `both`.
- **Limit it:** `"targetCharacterIds": ["<character id>"]` runs it only for
  those characters, `"targetPromptPresetIds"` only with those presets.
  `minDepth` and `maxDepth` limit it to messages that far from the end.
- **Change:** PATCH `/api/regex-scripts/<id>` with only the fields that
  change. `{ "enabled": false }` switches one off.
- **Delete:** DELETE `/api/regex-scripts/<id>` answers `204`.
- **Order:** PUT `/api/regex-scripts/reorder` with
  `{ "scriptIds": ["...", "..."] }`, every id in the order they should run.

Test the expression on a sample of the real text before saving it: one that
matches too much silently eats messages.

## Themes

A theme is a stylesheet the program stores and applies to its own page. One
theme is active at a time.

- **Which exist:** GET `/api/themes` answers
  `[{ "id", "name", "css", "isActive" }, ...]`.
- **Create:** POST `/api/themes` with `{ "name": "Dim", "css": "..." }`.
- **Change:** PATCH `/api/themes/<id>` with `name`, `css` or both. `css` is
  replaced whole, so read the theme first and send the full stylesheet back.
- **Switch on:** PUT `/api/themes/active` with `{ "id": "<id>" }`.
  `{ "id": null }` goes back to the built-in look.
- **Delete:** DELETE `/api/themes/<id>` answers `204`.

The page's colours are CSS variables on `:root`. To find the names, read
`node_modules/marinara-engine/packages/client/src/styles/globals.css` rather than
guessing, then override them in the theme:

```css
:root {
  --background: #101014;
}
```

Use `reload: true` on the call that activates or changes the active theme so
the open page picks it up.

## Everything else

Other settings of the page (language, layout, sounds, the helper agents) are
kept by the page itself and by routes no skill here covers. Before changing
one, read its routes file under
`node_modules/marinara-engine/packages/server/src/routes/` and its schema
under `node_modules/marinara-engine/packages/shared/src/schemas/`.
