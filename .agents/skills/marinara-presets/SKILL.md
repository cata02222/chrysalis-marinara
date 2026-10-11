---
name: marinara-presets
description: Make, read, edit, copy and delete prompt presets in this Marinara Engine, with their sections, groups, variables and generation settings (temperature, max tokens and the rest), and choose the default preset or the preset of one chat, through the program's own API with app_request. Load it before any work on a preset, a system prompt or sampler settings here.
---

# Presets

## Every call

All of this is done with the `app_request` tool, with `id` set to this app's
id. The program must be running: if the tool says it is not, ask the user to
open the app's tab.

- Send `headers: { "x-marinara-csrf": "1" }` on every call that is not a GET.
- Bodies are JSON (`json`).
- Set `reload: true` on the last call of a job that changed a preset.

## What a preset is

What is sent to the model around the chat, and with which settings. It has
four parts:

- the **preset** itself: name, generation settings (`parameters`), and two
  whole prompts used as they are in conversation chats (`conversationPrompt`)
  and game chats (`gamePrompt`);
- **sections**: the pieces of the roleplay prompt, in order. A section is
  either text you write, or a marker that stands for something the program
  fills in (the characters, the chat so far, the lorebook entries);
- **groups**: folders for sections, which can be switched off together;
- **variables**: questions with a fixed set of answers. The chosen answer
  replaces `{{<variable name>}}` in the text of the sections.

The preset that ships with the program is called `Marinara's Universal
Preset`. Do not rewrite it: copy it and change the copy, so the user can go
back.

## Find and read

- **Which exist:** GET `/api/prompts`. Each one comes with its two whole
  prompts, so the answer is long: read the `id` and `name` of each and ask
  for one.
- **The default:** GET `/api/prompts/default`.
- **One, with all its parts:** GET `/api/prompts/<id>/full` answers
  `{ "preset": {...}, "sections": [...], "groups": [...], "choiceBlocks": [...] }`
  (`choiceBlocks` are the variables). In it `parameters`, `sectionOrder` and
  `groupOrder` are text that is itself JSON, and switches are the words
  `"true"` and `"false"`.
- **Only the sections:** GET `/api/prompts/<id>/sections`.

## Create, copy, delete

- **Copy:** POST `/api/prompts/<id>/duplicate` with `json: {}` answers the
  copy, with all its sections, named `<name> (Copy)`. This is the usual way
  to start.
- **Create empty:** POST `/api/prompts` with `{ "name": "...", "description": "" }`.
  An empty preset has no sections at all, not even the chat: add them (below)
  or it sends nothing useful.
- **Delete:** DELETE `/api/prompts/<id>` answers `204`. Ask the user first.

## Change the preset

PATCH `/api/prompts/<id>` with only the fields that change:

```json
{
  "name": "Quiet preset",
  "description": "",
  "conversationPrompt": "...",
  "gamePrompt": "...",
  "wrapFormat": "xml",
  "parameters": { "temperature": 0.8, "maxTokens": 2048 }
}
```

`parameters` is merged, so send only the settings that change. What it may
hold, with defaults: `temperature` (1, from 0 to 2), `topP` (1), `topK` (0),
`minP` (0), `maxTokens` (4096), `maxContext` (128000), `frequencyPenalty` (0),
`presencePenalty` (0), `reasoningEffort` (`null`, or `low`, `medium`, `high`,
`xhigh`, `maximum`), `stopSequences` (`[]`), `assistantPrefill` (`""`),
`squashSystemMessages` (`true`), `showThoughts` (`true`).

`wrapFormat` is how each section is wrapped when sent: `xml`, `markdown` or
`none`.

## Sections

- **Add text:** POST `/api/prompts/<id>/sections` with

  ```json
  {
    "identifier": "tone_note",
    "name": "Tone",
    "content": "Keep it quiet and salt-worn.",
    "role": "system",
    "enabled": true
  }
  ```

  `identifier` is a name of your own, unique in the preset, and cannot be
  changed later. `role` is `system`, `user` or `assistant`. The new section
  goes to the end.
- **Add a marker:** the same call with `"isMarker": true`, an empty
  `content` and `"markerConfig": { "type": "<type>" }`. The types:
  `character` (the characters' cards), `persona`, `lorebook` (the entries
  that came up), `dialogue_examples`, `chat_summary`, `chat_history` (the
  chat so far), `world_info_before`, `world_info_after`. A preset needs at
  least `chat_history`, and normally `character` and `persona` before it.
- **Put it at a depth in the chat** instead of in the list: add
  `"injectionPosition": "depth"` and `"injectionDepth": 2` (that many
  messages from the end).
- **Change:** PATCH `/api/prompts/<id>/sections/<section id>` with only the
  fields that change: `name`, `content`, `role`, `enabled`, `groupId`,
  `markerConfig`, `injectionPosition`, `injectionDepth`.
- **Delete:** DELETE `/api/prompts/<id>/sections/<section id>` answers `204`.
- **Order:** PUT `/api/prompts/<id>/sections/reorder` with
  `{ "sectionIds": ["...", "..."] }`, every section id of the preset in the
  order wanted. Read the current order from `sectionOrder` first.

## Groups

- **Add:** POST `/api/prompts/<id>/groups` with `{ "name": "Lore" }`.
- **Put a section in it:** PATCH the section with `{ "groupId": "<group id>" }`,
  or `null` to take it out.
- **Change or delete:** PATCH or DELETE `/api/prompts/<id>/groups/<group id>`.
  `{ "enabled": false }` switches off every section in it.

## Variables

- **Add:** POST `/api/prompts/<id>/variables` with

  ```json
  {
    "variableName": "tone",
    "question": "Which tone?",
    "options": [
      { "id": "a", "label": "Dry", "value": "dry and understated" },
      { "id": "b", "label": "Warm", "value": "warm and gentle" }
    ]
  }
  ```

  `variableName` is letters, digits and underscores. Use it in a section as
  `{{tone}}`. `label` is what the user sees, `value` what goes into the
  prompt. `"multiSelect": true` lets several be chosen, joined by
  `separator` (`", "`).
- **Change or delete:** PATCH or DELETE
  `/api/prompts/<id>/variables/<variable id>`.
- **The answers chosen by default** are on the preset: PATCH
  `/api/prompts/<id>` with `{ "defaultChoices": { "tone": "dry and understated" } }`
  (the `value` of the option, or a list of values for a multi-select one).

## Which preset is used

- **By default:** POST `/api/prompts/<id>/set-default` with `json: {}`. The
  page gives the default preset to each new chat it makes. Chats that exist
  keep the preset they have.
- **In one chat:** PATCH `/api/chats/<chat id>` with
  `{ "promptPresetId": "<id>" }`. `null` means no preset at all, not the
  default one.

## Other placeholders

Besides variables, section text can use `{{char}}` and `{{user}}` for the two
names. The program knows more of these; they are listed in the page's own
help, and in `node_modules/marinara-engine/docs/`.

## Import and export

- **Export:** GET `/api/prompts/<id>/export`.
- **Import a preset file** from another program (a chat completion preset as
  json): POST `/api/import/st-preset` with the file's content as the JSON
  body. A file this program exported goes to POST `/api/import/marinara`.
