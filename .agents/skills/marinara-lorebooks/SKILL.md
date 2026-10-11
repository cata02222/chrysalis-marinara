---
name: marinara-lorebooks
description: Make, read, edit, import, export and delete lorebooks and their entries in this Marinara Engine, and decide where a book applies (everywhere, for a character, for a persona or for one chat), through the program's own API with app_request. Load it before any work on a lorebook or world info here.
---

# Lorebooks

## Every call

All of this is done with the `app_request` tool, with `id` set to this app's
id. The program must be running: if the tool says it is not, ask the user to
open the app's tab.

- Send `headers: { "x-marinara-csrf": "1" }` on every call that is not a GET.
- Bodies are JSON (`json`).
- Set `reload: true` on the last call of a job that added, renamed or removed
  a book or an entry.

## What a lorebook is

A book with settings, and entries inside it. An entry is a piece of text that
is put into the prompt when one of its keys shows up in the last messages, or
always when it is `constant`.

## Books

- **Which exist:** GET `/api/lorebooks` answers the list, without entries.
- **Read one:** GET `/api/lorebooks/<id>`.
- **Create:** POST `/api/lorebooks` with

  ```json
  {
    "name": "Harbor",
    "description": "The town and its people.",
    "category": "world",
    "scanDepth": 2,
    "tokenBudget": 2048,
    "recursiveScanning": false,
    "tags": []
  }
  ```

  Only `name` is required. `category` is one of `world`, `character`, `npc`,
  `spellbook`, `uncategorized`. `scanDepth` is how many of the last messages
  are searched for keys, `tokenBudget` the most its entries may add to one
  prompt. Keep the `id` from the answer.
- **Change:** PATCH `/api/lorebooks/<id>` with only the fields that change.
- **Delete:** DELETE `/api/lorebooks/<id>` answers `204` and takes the entries
  with it. Ask the user first.

## Where a book applies

A new book applies nowhere. It is used in a chat when it is `enabled` and one
of these holds:

| To use it | Do this |
| --- | --- |
| everywhere | PATCH the book with `{ "isGlobal": true }` |
| whenever a character is in the chat | PATCH the book with `{ "characterIds": ["<character id>"] }` |
| whenever a persona is used | PATCH the book with `{ "personaIds": ["<persona id>"] }` |
| in one chat | PATCH `/api/chats/<chat id>/metadata` with `{ "activeLorebookIds": ["<book id>"] }` |

The lists are replaced whole: to add a second character, send both ids. For a
chat, read its current `metadata.activeLorebookIds` first (GET
`/api/chats/<chat id>`) and send the old ids along with the new one.

Emptying `characterIds` or `personaIds` also switches the book off
(`"enabled": false` in the answer). When it should stay on for another
reason, send `"enabled": true` in the same or the next call.

To check the result, GET `/api/lorebooks/scan/<chat id>` answers the entries
that would go into that chat's next prompt, as
`{ "entries": [...], "totalEntries", "totalTokens" }`.

## Entries

- **Which exist:** GET `/api/lorebooks/<book id>/entries` answers every entry
  in full. For a large book, search instead: GET
  `/api/lorebooks/search/entries?q=<text>` looks through all books.
- **Read one:** GET `/api/lorebooks/<book id>/entries/<entry id>`.
- **Create one:** POST `/api/lorebooks/<book id>/entries` with

  ```json
  {
    "name": "The lighthouse",
    "keys": ["lighthouse", "lamp"],
    "content": "The lighthouse has stood for two hundred years.",
    "constant": false,
    "order": 100
  }
  ```

  Only `name` is required, but an entry with no `keys` that is not `constant`
  never comes up.
- **Create several:** POST `/api/lorebooks/<book id>/entries/bulk` with
  `{ "entries": [ {...}, {...} ] }`. The answer is the list of new entries.
  Use this for a whole book: one call instead of one per entry.
- **Change:** PATCH `/api/lorebooks/<book id>/entries/<entry id>` with only
  the fields that change. `keys` is replaced whole.
- **Delete:** DELETE `/api/lorebooks/<book id>/entries/<entry id>` answers
  `204`. Several at once: POST `/api/lorebooks/<book id>/entries/bulk-delete`
  with `{ "entryIds": ["...", "..."] }`.

Fields of an entry worth knowing, with their defaults:

| Field | What it does |
| --- | --- |
| `keys` | words or phrases that bring the entry up |
| `secondaryKeys`, `selective`, `selectiveLogic` | with `selective: true` the secondary keys are checked too: `and` or `or` (at least one of them), `and_all` (every one), `not` (none of them), `not_all` (not every one) |
| `constant` (`false`) | always in the prompt, keys ignored |
| `enabled` (`true`) | off without deleting it |
| `position` (`0`) | `0` before the character, `1` after it, `2` at a depth in the chat, `7` into a named outlet |
| `depth` (`4`), `role` (`system`) | for position `2`: how many messages from the end, and as which role |
| `order` (`100`) | lower comes first among the entries that came up |
| `probability` (`null`) | a number from 0 to 100: the chance it comes up when a key matched |
| `matchWholeWords`, `caseSensitive`, `useRegex` (all `false`) | how keys are matched; with `useRegex` a key is a regular expression |
| `sticky`, `cooldown`, `delay` (`null`) | stay on for that many messages, stay off for that many, or wait for that many before the first time |
| `preventRecursion` (`true`) | its text does not bring up other entries |

Every field is in
`node_modules/marinara-engine/packages/shared/src/schemas/lorebook.schema.ts`.

## Import and export

- **Export:** GET `/api/lorebooks/<id>/export` answers the book and its
  entries in one object, which is also a quick way to read a whole book.
- **Import a world info file** from another program (a json with `entries`
  inside): read the file, then POST `/api/import/st-lorebook` with its content
  as the JSON body. Add `"__filename": "<name>"` to the body to name the book
  when the file carries no name.
- A file this program exported (it starts with `"type": "marinara_lorebook"`)
  goes to POST `/api/import/marinara`, its content sent as the JSON body.
