# README

<!-- markdownlint-disable MD013 -->
[![Commitlint](https://github.com/NinjaMonkeyGames/gm-lint/actions/workflows/ci.yaml/badge.svg)](https://github.com/NinjaMonkeyGames/gm-lint/actions/workflows/ci.yaml)
[![Common Changelog](https://common-changelog.org/badge.svg)](https://common-changelog.org)
![Signed Commits](https://img.shields.io/badge/commits-signed-blue.svg)
![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)
![GitHub Release](https://img.shields.io/github/v/release/NinjaMonkeyGames/gm-lint)

---

## TABLE OF CONTENTS

- [README](#readme)
  - [TABLE OF CONTENTS](#table-of-contents)
  - [WHAT IS THE PURPOSE OF THIS PROJECT ?](#what-is-the-purpose-of-this-project-)
  - [WHO IS THIS REPOSITORY FOR ?](#who-is-this-repository-for-)
  - [QUICKSTART](#quickstart)
  - [API OVERVIEW](#api-overview)
  - [ENVIRONMENT DEPENDENCY MANIFESTO](#environment-dependency-manifesto)
    - [IDE](#ide)
      - [VSC (Visual Studio Codium)](#vsc-visual-studio-codium)
        - [VSC EXTENSIONS](#vsc-extensions)
    - [CI TOOLS](#ci-tools)
    - [SUPPORTING TOOLS](#supporting-tools)
  - [CONTACT INFORMATION](#contact-information)
  - [COPYRIGHT](#copyright)

---

<!-- markdownlint-enable MD013 -->

---

## WHAT IS THE PURPOSE OF THIS PROJECT ?

GameMaker Studio 2 does not currently have an official or community driven linter for GML. Currently we have an official
gm-cli but this is designed for testing compilation and packaging. There is currently a gap in the market for a linter.
As GameMaker offers no API for the feather system so it can't be run on a CI workflow and can only be accessed via the
IDE.

This project is an attempt to implement all GM00X feather message lints in a CI workflow.

- To assist GameMaker developers produce clean, reliable and professional code.
- To fill a gap in the GameMaker space.

---

## WHO IS THIS REPOSITORY FOR ?

This project is for anyone who wants a mechanism for linting GML code in a CI workflow.

---

## QUICKSTART

gm-lint

--help
--config


---

## API OVERVIEW

| Method                    | Description                                                                 |
|---------------------------|-----------------------------------------------------------------------------|
| `get_x([_x])`             | Returns the column index under the given X coordinate (mouse X by default). |


## ENVIRONMENT DEPENDENCY MANIFESTO

### IDE

#### VSC (Visual Studio Codium)

Version: 1.121.03429
Commit: 824c4c46a288b839f13b24022655329c2aeb9f81
Date: 2026-05-19T23:32:58Z
Electron: 39.8.8
ElectronBuildId: undefined
Chromium: 142.0.7444.265
Node.js: 22.22.1
V8: 14.2.231.22-electron.0
OS: Linux x64 6.12.96+deb13-amd64

##### VSC EXTENSIONS

| Extension Name                                                    | Version   |
| ----------------------------------------------------------------- | --------- |
| streetsidesoftware.code-spell-checker                             | 4.5.6     |
| streetsidesoftware.code-spell-checker-cspell-bundled-dictionaries | 2.0.14    |
| github.vscode-github-actions                                      | 0.32.3    |
| yzhang.markdown-all-in-one                                        | 3.6.2     |
| davidanson.vscode-markdownlint                                    | 0.62.1    |
| redhat.vscode-yaml                                                | 1.24.0    |
| joshbolduc.commitlint                                             | 2.6.3     |

### CI TOOLS

Tools versions used by CI and by extension the Dockerfile.

| Tool                                  | Version                           |
|---------------------------------------|-----------------------------------|
| npm                                   | 11.18.0                           |
| cSpell                                | 11.6.2                            |
| Markdownlint-Cli2                     | 0.23.0                            |
| Markdownlint                          | 0.41.0                            |
| Commitlint                            | 21.2.1                            |
| Commitlint config-conventional        | 20.3.0                            |
| gm-cli                                | 2.2.0                             |

### SUPPORTING TOOLS

Local tool versions.

| Tool                           | Version               |
|--------------------------------|-----------------------|
| NPM                            | 11.18.0               |
| Node                           | 24.11.1               |
| GitHub Desktop                 | 3.4.9-linux1 (x64)    |
| Git                            | 2.47.3-0+deb13u1      |

## CONTACT INFORMATION

Author: Daniel Mallett (Monkey Knuckles)

If you have any problems with the repository or have any suggestions please contact us at <info@ninjamonkeygames.com>.

You may also contact us via our [website](https://ninjamonkeygames.com).

Any bugs should be raised as an [issue](https://github.com/NinjaMonkeyGames/grid-utility-professional/issues) on
GitHub.

---

## COPYRIGHT

*NinjaMonkeyGames™ Copyright © 2026 All rights reserved.*
