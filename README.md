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
    - [RULES](#rules)
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
- To fill a gap in the GameMaker workflow space.

---

## WHO IS THIS REPOSITORY FOR ?

This project is for anyone who wants a mechanism for linting GML code in a CI workflow.

---

## QUICKSTART

gm-lint

--help
--version
--config

---

## API OVERVIEW

 Default: Run `gm-lint` this with no other flags it will search project for config and GM files.

| Optional parameters       | Description                                                                 |
|---------------------------|-----------------------------------------------------------------------------|
| `--config`                | Set path to configuration file.                                             |
| `--help`                  | Display help text.                                                          |
| `--version`               | Show latest version.                                                        |

### RULES

| GM Number | Description                                                                                              |
|-----------|----------------------------------------------------------------------------------------------------------|
| GM1000    | No enclosing loop from which to break.                                                                   |
| GM1001    | No enclosing loop from which to continue.                                                                |
| GM1002    | globalvar does not support inline initializers.                                                          |
| GM1003    | Enum assignment must be integer assignment.                                                              |
| GM1004    | The enum value 'ENUM MEMBER NAME' has already been previously defined in the enum 'ENUM NAME'.           |
| GM1005    | Argument must be provided.                                                                               |
| GM1006    | The enum 'ENUM NAME' has already been previously declared.                                               |
| GM1007    | Left-hand side of an assignment must be a variable.                                                      |
| GM1008    | The variable 'BUILT-IN VARIABLE' is readonly and cannot be assigned to.                                  |
| GM1009    | Operation OPERATOR between types 'TYPE' and 'TYPE' may result in unexpected behaviour or an error during |
|           | runtime.                                                                                                 |
| GM1010    | Cannot perform OPERATOR operation between types 'TYPE' and 'TYPE'.                                       |
| GM1011    | Implicit cast of type 'TYPE' to 'Bool' may result in unexpected behaviour or an error during runtime.    |
| GM1012    | Malformed variable addressing expression.                                                                |
| GM1013    | Reference to variable 'IDENTIFIER' which has not been previously declared in 'IDENTIFIER'.               |
| GM1014    | The enum 'ENUM' does not contain the value 'IDENTIFIER'.                                                 |
| GM1015    | Cannot divide or modulo expression by 0.                                                                 |
| GM1016    | A boolean literal was unexpected at this time.                                                           |
| GM1017    | The function 'FUNCTION NAME' is deprecated and usage is discouraged.                                     |
| GM1019    | The function 'FUNCTION NAME' takes no more than NUMBER arguments but NUMBER are provided.                |
| GM1020    | The function 'FUNCTION NAME' takes no less than NUMBER arguments but NUMBER are provided.                |
| GM1021    | The function or script 'FUNCTION/SCRIPT NAME' does not exist.                                            |
| GM1022    | An assignment was expected at this time.                                                                 |
| GM1023    | The constant 'BUILT-IN CONSTANT' is deprecated and usage is discouraged.                                 |
| GM1024    | The built-in variable 'BUILT-IN VARIABLE' is deprecated and usage is discouraged.                        |
| GM1025    | A number literal was unexpected at this time.                                                            |
| GM1026    | Left-hand side of postfix expression must be a variable.                                                 |
| GM1027    | A string literal was unexpected at this time.                                                            |
| GM1028    | Accessor is intended for type of 'TYPE' but 'TYPE' appears instead.                                      |
| GM1029    | Potentially dangerous or unintended implicit cast from 'TYPE' to 'TYPE'.                                 |
| GM1030    | The identifier 'NAME' is reserved and cannot be used as a variable or macro name.                        |
| GM1031    | The name 'IDENTIFIER' is an asset or constant and cannot be assigned to.                                 |
| GM1032    | No references to arguments INDEX, … but references argument INDEX.                                       |
| GM1033    | Possibly unintended or misplaced semicolon.                                                              |
| GM1034    | Argument cannot be referenced outside of script or function.                                             |
| GM1035    | Return type differs from previously established return type.                                             |
| GM1036    | Array cannot be indexed in this way.                                                                     |
| GM1038    | Macro with this name has been previously declared.                                                       |
| GM1040    | argument# and argument[#] referencing cannot be mixed.                                                   |
| GM1041    | The type 'TYPE' appears where the type 'TYPE' is expected.                                               |
| GM1042    | Parameter name 'PARAMETER' differs from 'PARAMETER' specified in jsdoc.                                  |
| GM1043    | Potentially unintentional type reassignment from '{0}' to '{1}'.                                         |
| GM1044    | Constant is expected to be one of the following: {0}.                                                    |
| GM1045    | Type '{0}' differs from type '{1}' specified in jsdoc.                                                   |
| GM1050    | The identifier '{0}' is declared as a local variable and cannot be accessed in this way.                 |
| GM1051    | Macro expressions should not be terminated with a ';' semicolon.                                         |
| GM1052    | The delete operator can only act on a variable of type 'struct'.                                         |
| GM1054    | Cannot inherit from non-existent function '{0}'.                                                         |
| GM1055    | Cannot mix argument# and named parameters.                                                               |
| GM1056    | Bad practice to declare non-optional parameter after an optional parameter.                              |
| GM1058    | Cannot 'new' the identifier '{0}' as it is not a constructor function.                                   |
| GM1059    | The parameter '{0}' has been previously declared.                                                        |
| GM1060    | Dangerous call to variable of type '{0}'.                                                                |
| GM1062    | Malformed type '{0}' in jsdoc.                                                                           |
| GM1063    | Ternary may yield differing types '{0}' and '{1}'.                                                       |
| GM1064    | Redeclaration of global function '{0}' originally declared in '{1}'.                                     |
| GM1100    | Syntax Error.                                                                                            |
| GM2000    | Not all code paths call gpu_set_blendmode(bm_normal) before the end of the script.                       |
| GM2003    | Not all code paths call shader_reset() before end of script.                                             |
| GM2004    | This for statement does not use its index and can be written as a repeat statement instead.              |
| GM2005    | Not all code paths call surface_reset_target() before end of script.                                     |
| GM2007    | var expression should be terminated with a ';' (semicolon).                                              |
| GM2008    | Opening another vertex batch before closing a previous vertex batch.                                     |
| GM2009    | Closing a vertex batch without opening a vertex batch.                                                   |
| GM2010    | The function '{0}' cannot be called outside of a vertex_begin()/vertex_end() block.                      |
| GM2011    | Not all code paths call vertex_end() before the end of the script.                                       |
| GM2012    | Opening another vertex format before closing a previous vertex format.                                   |
| GM2013    | Closing a vertex format without opening a vertex format.                                                 |
| GM2014    | The function '{0}' cannot be called outside of a vertex_format_begin()/vertex_format_end() block.        |
| GM2015    | Not all code paths call vertex_format_end() before the end of the script.                                |
| GM2016    | Instance variable '{0}' declared outside of Create event, declare with 'var' or move to Create event.    |
| GM2017    | Inconsistent naming. Recommended name is '{0}'.                                                          |
| GM2018    | Potentially dangerous variable declaration.                                                              |
| GM2019    | Not all code paths call draw_set_valign(fa_top) before the end of the script.                            |
| GM2020    | all cannot be referenced in this way.                                                                    |
| GM2022    | Return value of a pure function is not being used.                                                       |
| GM2023    | Evaluation order of function calls in argument list not guaranteed between platforms.                    |
| GM2025    | Reference to non-existent event '{0}'.                                                                   |
| GM2026    | Not all code paths call draw_set_halign(fa_left) before the end of the script.                           |
| GM2027    | Opening another primitive before closing a previous primitive.                                           |
| GM2028    | Closing a primitive without opening a primitive.                                                         |
| GM2029    | The function '{0}' cannot be called outside of a draw_primitive_begin()/draw_primitive_end() block.      |
| GM2030    | Not all code paths call draw_primitive_end() before the end of the script.                               |
| GM2031    | Opening another File Find before closing a previous File Find.                                           |
| GM2032    | Closing a File Find without opening a File Find.                                                         |
| GM2033    | The function '{0}' cannot be called outside of a file_find_first()/file_find_close() block.              |
| GM2034    | Not all code paths call file_find_close() before the end of the script.                                  |
| GM2035    | Not all code paths call gpu_pop_state() before end of script.                                            |
| GM2039    | Call to execute a global script resource like a function is deprecated.                                  |
| GM2040    | Call to event_inherited() in object with no parent event.                                                |
| GM2042    | Inconsistent stack depth for gpu_push_state()/gpu_pop_state() blocks. All branches should call these     |
|           | functions an equal number of times.                                                                      |
| GM2043    | Attempting to access the local variable '{0}' outside of the scope it was defined in.                    |
| GM2044    | Local variable '{0}' is already declared.                                                                |
| GM2046    | Inconsistent stack depth for surface_set_target()/surface_reset_target() blocks. All branches should call|
|           | these functions the same number of times.                                                                |
| GM2047    | Unreachable code.                                                                                        |
| GM2048    | Not all code paths call gpu_set_blendenable(true) before the end of the script.                          |
| GM2049    | Not all code paths call gpu_set_zfunc(cmpfunc_lessequal) before the end of the script.                   |
| GM2050    | Not all code paths call gpu_set_fog(false, c_black, 0, 1) before the end of the script.                  |
| GM2051    | Not all code paths call gpu_set_cullmode(cull_noculling) before the end of the script.                   |
| GM2052    | Not all code paths call gpu_set_colourwriteenable(true, true, true, true) before the end of the script.  |
| GM2053    | Not all code paths call gpu_set_alphatestenable(false) before the end of the script.                     |
| GM2054    | Not all code paths call gpu_set_alphatestref(0) before the end of the script.                            |
| GM2055    | Not all code paths call gpu_set_texfilter(false) before the end of the script.                           |
| GM2056    | Not all code paths call gpu_set_texrepeat(false) before the end of the script.                           |
| GM2061    | Opportunity to use nullish coalesce operator.                                                            |
| GM2062    | Not all code paths call draw_set_colour(c_white) before the end of the script.                           |
| GM2063    | Not all code paths call draw_set_alpha(1) before the end of the script.                                  |
| GM2064    | Variable '{0}' does not exist in object's Variable Definitions.                                          |

**ℹ️ GameMaker manual contains full descriptions for each rule.**
[Feather Messages](https://manual.gamemaker.io/lts/en/The_Asset_Editors/Code_Editor_Properties/Feather_Messages.htm)

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
