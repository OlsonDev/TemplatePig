# Changelog
All notable changes to the Visual Studio Code extension Template Pig will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.6] - 2022-08-29
- `.pig.js` now has `Uri` in context from `vscode`.
- `.pig.js` now has `getFileContent`, `getFolderContents`, `getRelativePath`, and `toFileUri` in context from Template Pig.

## [0.0.5] - 2022-08-29
- `.pig.js` now has both `QuickPickItemKind` and `QuickInputButtons` in context from `vscode`.

## [0.0.4] - 2022-08-29
- Uncaught exceptions now reported to user when getting metadata from a template, calling `executeAsync(…)`, rendering templates, or calling `getDestinationPath(…)` with buttons to view the stack trace or open the file that likely caused the issue.

## [0.0.3] - 2022-08-26
- Alias `change-case`'s `paramCase` method to `kebabCase`.
- Alias `change-case`'s `noCase` method to both `lowerSentenceCase` and `spaceCase`.

## [0.0.2] - 2022-08-26
- Declare VS Code configuration contributions so settings show up in Settings UI / JSON IntelliSense.
- Change settings root key from `template-pig` to `templatePig` so VS Code Settings UI formats it as "Template Pig" instead of "Template-pig".

## [0.0.1] - 2022-08-26
- Initial release