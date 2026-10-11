---
name: marinara-personas
description: Make, read, edit, copy and delete the user's personas in this Marinara Engine, change a persona's picture and choose which persona a chat uses, through the program's own API with app_request. Load it before any work on a persona here.
---

# Personas

## Every call

All of this is done with the `app_request` tool, with `id` set to this app's
id. The program must be running: if the tool says it is not, ask the user to
open the app's tab.

- Send `headers: { "x-marinara-csrf": "1" }` on every call that is not a GET.
- Bodies are JSON (`json`) unless said otherwise.
- Set `reload: true` on the last call of a job that added, renamed or removed
  a persona.

## What a persona is

Who the user plays. The routes live under `/api/characters/personas`, and
unlike a character, a persona's fields are at the top of the body:

```json
{
  "name": "Ash",
  "description": "A quiet cartographer.",
  "personality": "",
  "scenario": "",
  "backstory": "",
  "appearance": "",
  "tags": [],
  "creatorNotes": "",
  "nameColor": "",
  "dialogueColor": "",
  "boxColor": ""
}
```

Only `name` is required. The three colours take a CSS colour and are how the
persona's name, speech and message box are drawn.

## Find and read

- **Which exist:** GET `/api/characters/personas/list` answers the list.
- **Read one:** GET `/api/characters/personas/<id>`.

## Create, change, copy, delete

- **Create:** POST `/api/characters/personas` with the fields above. Keep the
  `id` from the answer.
- **Change:** PATCH `/api/characters/personas/<id>` with only the fields that
  change. `tags` is replaced whole.
- **Copy:** POST `/api/characters/personas/<id>/duplicate` with `json: {}`.
- **Delete:** DELETE `/api/characters/personas/<id>` answers `204`. Ask the
  user first.

## Picture

1. POST `/api/characters/personas/<id>/gallery/upload` as a form:
   `files: { "file": "<path to a png, jpg or webp>" }`. The path starts at
   the user's folder, so a file in this app is `apps/<this app's id>/...`.
   The answer holds the picture's `id`.
2. POST `/api/characters/personas/<id>/gallery/<that id>/avatar` with
   `json: {}`.

## Which persona is used

There is no persona that is on everywhere. Each chat names its own in
`personaId`: PATCH `/api/chats/<chat id>` with `{ "personaId": "<id>" }`, or
`null` for none. A new chat can be given one when it is made (see
`marinara-chats`). Messages already sent keep the persona they were sent as.

A lorebook that should switch on whenever this persona is used lists it in its
own `personaIds`: see `marinara-lorebooks`.
