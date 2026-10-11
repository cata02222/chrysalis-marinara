# Marinara Engine for Chrysalis

Runs [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine) inside
[Chrysalis](https://github.com/ProjectChrysalis/Chrysalis-Engine) as a service
app: its own program beside the engine, shown in a tab.

This is an unofficial wrapper. It is not affiliated with, endorsed by or
supported by Pasta-Devs. It contains none of Marinara Engine's code: the setup
step downloads the release pinned in `marinara.json` from the official
repository and builds it on your computer.

## What you get

- Marinara Engine in a Chrysalis tab, on desktop and phone.
- The models you connected in Chrysalis, as a connection named `Chrysalis`
  that is already the default. No key to paste.
- The Chrysalis agent can work inside it: ask it to write a character or a
  lorebook and it appears in the app.

## Install

In Chrysalis: **Import app**, **Git repository**, paste this repository's
address. Chrysalis shows the program it will run. An admin then allows it in
the app's tab.

The first start downloads about 110 MB of source, installs its packages and
builds it. That takes a few minutes and about 1.7 GB of disk. Later starts
take a few seconds. Nothing else has to be installed: every step uses the
runtime Chrysalis already ships.

A service app is not sandboxed. It runs with the rights of the account
Chrysalis runs under. Install it only if you trust this repository and
Marinara Engine.

## Updating

When this repository moves to a newer release, Chrysalis offers the update in
the app's details. The new release is downloaded and built before the program
starts again. Your characters, chats and settings live in the app's `data/`
folder and are not touched.

To pick a release yourself, change `version` in `marinara.json` and press
Restart in the app's tab. Marinara Engine's own update button does not apply
here.

## How it differs from a normal install

- It runs on the runtime Chrysalis ships, not on Node.js, and is built without
  the type check.
- The page is built without the offline copy a browser can keep of it, and
  its files are grouped differently. What you see is the same.
- Only your Chrysalis sign-in reaches it. Chrysalis sits in front of the
  program, so the program sees every request as coming from this computer and
  its own checks of where a browser request comes from are switched off.
- The program's extra check on the addresses of model servers it calls does
  not take effect under this runtime.

If something breaks here, report it to this repository, not to Marinara
Engine: its maintainers do not support this setup.

## Files

| File | What it is |
| --- | --- |
| `manifest.json` | How Chrysalis runs the program |
| `marinara.json` | The Marinara Engine release and where it is downloaded from |
| `setup.js` | Downloads and builds that release |
| `start.js` | Links the Chrysalis models, then starts the server |
| `AGENTS.md`, `.agents/skills/` | What the Chrysalis agent reads to work in this app |

## License

This wrapper is licensed under the GNU Affero General Public License v3.0, see
[LICENSE](LICENSE). Marinara Engine is a separate project under the same
license; its code is not in this repository and is downloaded from its own
repository at install. "Marinara Engine" and "Pasta-Devs" are names of that
project and are used here only to say what this wrapper runs.
