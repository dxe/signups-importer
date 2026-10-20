# Signups Importer — Claude Code Guide

## Project overview

Google Apps Script project (TypeScript) that imports email signups from Google Sheets into DxE's signup service. Deployed via `clasp`.

## Key commands

```bash
pnpm test          # run unit tests (Vitest)
pnpm test:watch    # watch mode
pnpm push          # run tests then deploy via clasp
pnpm exec clasp push   # deploy without tests
```

## Architecture

Uses **TypeScript namespaces** instead of ES modules — a clasp limitation. Every cross-file reference must be fully qualified (e.g. `SignupValidation.isValidEmail(...)`). Never use `import Foo = Other.Foo` at namespace scope; only inside functions.

### Source file map

| File | Namespace | Purpose |
|------|-----------|---------|
| `main.ts` | `Main` | Top-level GAS functions, menu wiring, `SignupsImporter` class |
| `signup-validation.ts` | `SignupValidation` | Email validation & domain auto-fix logic |
| `sheet-mutations.ts` | `SheetMutations` | Direct sheet edits (split columns, fix emails) |
| `list-normalization.ts` | `ListNormalization` | Generic column-renaming/reordering normalizer |
| `list-formats/chuffed.ts` | `Chuffed` | Chuffed donation platform column spec |
| `google-sheets-queue.ts` | `GoogleSheetsSignups` | Sheet-backed signup queue; defines `FIELD_NAMES` |
| `signups-processor.ts` | `SignupsProcessor` | Batch processing loop |
| `signups-service.ts` | `SignupService` | HTTP calls to the signup service |
| `global-sheet-config.ts` | `Configuration` | Column names, status prefixes |

### Adding a menu item

1. Write the pure logic in the appropriate namespace file.
2. Add a sheet mutation in `sheet-mutations.ts` if it modifies the sheet.
3. Add a method to `Main.SignupsImporter`.
4. Add a top-level function (e.g. `function MyAction() { (new Main.SignupsImporter()).myAction() }`).
5. Register it with `ui.createMenu(...)` in `onOpen()`.

## Tests

Tests live in `test/` and use Vitest. `test/setup.ts` loads all namespace files into the global scope via esbuild + `vm.runInThisContext`, mirroring clasp's concatenation. Reference source files with triple-slash directives at the top of each test file.

## Deployment

Requires `.clasp.json` (script ID + spreadsheet ID) and `secrets.ts` (signup service URL + API key) — both gitignored.
