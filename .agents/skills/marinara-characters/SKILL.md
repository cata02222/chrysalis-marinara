---
name: marinara-characters
description: Make, read, edit, copy, import, export and delete characters in this Marinara Engine and change a character's picture, through the program's own API with app_request. Load it before any work on a character card here.
---

# Characters

## Every call

All of this is done with the `app_request` tool, with `id` set to this app's
id. The program must be running: if the tool says it is not, ask the user to
open the app's tab.

- Send `headers: { "x-marinara-csrf": "1" }` on every call that is not a GET.
- Bodies are JSON (`json`) unless said otherwise.
- The open page keeps what it loaded. Set `reload: true` on the last call of a
  job that added, renamed or removed a character.
- Do not touch the files in `data/storage/`: the running program owns them.

## What a character is

One record with an `id` (a short random word) and a card under `data`. The
card uses the usual card field names:

```json
{
  "name": "Mira",
  "summary": "One line shown in lists, 500 characters at most.",
  "description": "Who they are, as the model reads it.",
  "personality": "",
  "scenario": "",
  "first_mes": "Their opening message.",
  "mes_example": "",
  "creator_notes": "",
  "system_prompt": "",
  "post_history_instructions": "",
  "tags": ["tag"],
  "creator": "",
  "character_version": "1.0",
  "alternate_greetings": [],
  "extensions": {
    "talkativeness": 0.5,
    "fav": false,
    "backstory": "",
    "appearance": "",
    "depth_prompt": { "prompt": "", "depth": 4, "role": "system" }
  },
  "character_book": null
}
```

Only `name` is required. `{{char}}` and `{{user}}` in any text stand for the
two names. `mes_example` is example dialogue, each exchange started by a line
holding only `<START>`.

In an answer, `data` is text that is itself JSON: parse it before reading a
field.

## Find and read

- **Which exist:** GET `/api/characters/catalog?limit=50&offset=0`. Add
  `&search=<text>` to narrow it. The answer is
  `{ "items": [{ "id", "name", "tags", "favorite", "summary", ... }], "hasMore" }`,
  short enough not to be cut. Do not call `/api/characters` without `limit`:
  it returns every card in full.
- **Read one:** GET `/api/characters/<id>` answers
  `{ "id", "data": "<the card as text>", "avatarPath", "comment", ... }`.

## Create

POST `/api/characters` with `{ "data": { ...the card... } }`. The answer is the
new record: keep its `id`. Fields left out get their defaults.

## Change

PATCH `/api/characters/<id>` with `{ "data": { ... } }` holding only the fields
that change. Fields under `extensions` are merged one by one, so
`{ "data": { "extensions": { "fav": true } } }` leaves the rest alone. A list
(`tags`, `alternate_greetings`) is replaced whole, so send every item, not
only the new one.

Each change is kept as a version of the card and the visible version number
goes up by itself. GET `/api/characters/<id>/versions` lists them; POST
`/api/characters/<id>/versions/<versionId>/restore` goes back to one.

## Picture

Upload the file, then make it the picture:

1. POST `/api/characters/<id>/gallery/upload` as a form:
   `files: { "file": "<path to a png, jpg or webp>" }`. The path starts at
   the user's folder, so a file in this app is `apps/<this app's id>/...`.
   The answer holds the picture's `id`.
2. POST `/api/characters/<id>/gallery/<that id>/avatar` with `json: {}`. The
   answer is the character, with its new `avatarPath`.

The uploaded file stays in the character's gallery. DELETE
`/api/characters/<id>/avatar` takes the picture off again.

## Copy and delete

- **Copy:** POST `/api/characters/<id>/duplicate` with `json: {}` answers the
  copy, named `<name> (Copy)`.
- **Delete:** DELETE `/api/characters/<id>` answers `204`. Ask the user first.

## Import a card file

A card the user put in the workspace (a png with the card inside, or a json
in the `chara_card_v2` shape): POST `/api/import/st-character` as a form,
`files: { "file": "<path to the file>" }`. The answer is
`{ "success": true, "characterId": "...", "name": "..." }`. Add
`form: { "importEmbeddedLorebook": "true" }` to also bring in a lorebook the
card carries.

A file this program exported itself (it starts with
`"type": "marinara_character"`) goes to POST `/api/import/marinara` instead,
its content sent as the JSON body.

## Export

GET `/api/characters/<id>/export` answers
`{ "type": "marinara_character", "data": { "spec": "chara_card_v2", "data": { ...the card... } } }`.
It is also the easiest way to read a card with every field already parsed.
GET `/api/characters/<id>/export-png` answers the picture with the card
inside, which is a file for the user, not something to read here.

## Where a character is used

- A chat lists its characters in `characterIds`: see `marinara-chats`.
- A lorebook that should switch on whenever this character talks lists the
  character in its own `characterIds`: see `marinara-lorebooks`.
