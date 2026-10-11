---
name: marinara-chats
description: Make, read, rename, change and delete chats and their messages in this Marinara Engine, and set a chat's characters, persona, preset, connection and lorebooks, through the program's own API with app_request. Load it before reading or changing a chat here.
---

# Chats

## Every call

All of this is done with the `app_request` tool, with `id` set to this app's
id. The program must be running: if the tool says it is not, ask the user to
open the app's tab.

- Send `headers: { "x-marinara-csrf": "1" }` on every call that is not a GET.
- Bodies are JSON (`json`).
- Set `reload: true` on the last call of a job that added, renamed or removed
  a chat or changed its messages.

## What a chat is

A record that names who is in it, and a list of messages. Its `mode` decides
how the page shows it: `conversation` (a messenger), `roleplay` (a story) or
`game`.

## Find and read

- **Which exist:** GET `/api/chats` answers every chat without its messages:
  `{ "id", "name", "mode", "characterIds", "personaId", "promptPresetId", "connectionId", "metadata", "lastMessageAt", ... }`.
- **Read one:** GET `/api/chats/<id>`.
- **How long it is:** GET `/api/chats/<id>/message-count` answers
  `{ "count": 12 }`.
- **Its messages:** GET `/api/chats/<id>/messages?limit=20` answers the last
  20, oldest first. Without `limit` it answers all of them, which is cut for
  a long chat. For the ones before, add `&before=<createdAt>|<id>` of the
  oldest message you have, for example
  `&before=2026-10-11T16:09:12.577Z|PAZ5LoKCQQ9aRT54fZtE_`.

A message is
`{ "id", "chatId", "role", "characterId", "content", "activeSwipeIndex", "extra", "createdAt" }`.
`role` is `user`, `assistant`, `system` or `narrator`. `characterId` says
which character spoke, and is `null` for the user. `extra` is text that is
itself JSON and is the program's own bookkeeping: leave it alone.

## Create

POST `/api/chats` with

```json
{
  "name": "At the lamp",
  "mode": "roleplay",
  "characterIds": ["<character id>"],
  "personaId": "<persona id or null>",
  "promptPresetId": null,
  "connectionId": null
}
```

`name` and `mode` are required. With `connectionId` left out the chat is given
the default connection. A preset is not filled in the same way: a roleplay
chat with `promptPresetId` left `null` is sent without one. Give it the
default preset's id, from GET `/api/prompts/default` (see
`marinara-presets`). Keep the `id` from the answer.

A chat made this way is empty: the character's opening message is not added.
To start with it, post it yourself as the first message (below), with the
character's `first_mes` as `content`.

## Change

- **Name, characters, persona, preset, connection, mode:** PATCH
  `/api/chats/<id>` with only the fields that change, named as in "Create".
  `characterIds` is replaced whole.
- **Lorebooks for this chat only:** PATCH `/api/chats/<id>/metadata` with
  `{ "activeLorebookIds": ["<book id>"] }`. The list is replaced whole. Other
  keys of `metadata` not named in the body stay as they are.
- **Delete:** DELETE `/api/chats/<id>` answers `204`. Ask the user first.
- **Copy from a point on:** POST `/api/chats/<id>/branch` makes a new chat
  from this one. Read the route in
  `node_modules/marinara-engine/packages/server/src/routes/chats.routes.ts`
  for its body before using it.

## Messages

- **Add:** POST `/api/chats/<id>/messages` with
  `{ "role": "user", "content": "..." }` for the user, or
  `{ "role": "assistant", "characterId": "<character id>", "content": "..." }`
  for a character. It is added at the end. This only stores the message: no
  model is called.
- **Edit:** PATCH `/api/chats/<id>/messages/<message id>` with
  `{ "content": "new text" }`.
- **Delete:** DELETE `/api/chats/<id>/messages/<message id>`. Several: POST
  `/api/chats/<id>/messages/bulk-delete` with
  `{ "messageIds": ["...", "..."] }`. Ask the user first.

## Replies from the model

Leave those to the page: the user presses send or regenerate there. The route
behind it streams its answer and expects what the page keeps track of, so it
is not something to call from here.

## Import

A chat file from another program (a `.jsonl`): POST `/api/import/st-chat`.
Read the route in
`node_modules/marinara-engine/packages/server/src/routes/import.routes.ts` for
its form fields before using it.
