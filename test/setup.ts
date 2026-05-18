import { transformSync } from 'esbuild';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInThisContext } from 'vm';

// Stub GAS globals that source files reference at load time or call at runtime.
(global as any).SpreadsheetApp = { flush: () => {} };
(global as any).UrlFetchApp = { fetchAll: () => [] };
// Some source files use `import X = GoogleAppsScript.Y.Z` namespace import aliases.
// esbuild emits these as runtime assignments (const X = GoogleAppsScript.Y.Z), so the
// nested object must exist even though the values are never actually used.
(global as any).GoogleAppsScript = { Spreadsheet: {}, URL_Fetch: {} };

// Load source files in dependency order (mirrors how clasp concatenates them).
// Each file is transpiled from TypeScript to JS (type-stripping only, no module
// wrapping), then executed in the current global context so namespace vars like
// SignupValidation, SignupsProcessor, etc. become accessible as globals.
const root = resolve(__dirname, '..');
for (const file of [
    'models.ts',
    'global-sheet-config.ts',
    'secrets.ts',
    'signups-service.ts',
    'signups-processor.ts',
    'google-sheets-queue.ts',
    'signup-validation.ts',
    'sheet-mutations.ts',
    'list-normalization.ts',
]) {
    const src = readFileSync(resolve(root, file), 'utf-8');
    const { code } = transformSync(src, { loader: 'ts', target: 'es2019' });
    runInThisContext(code, { filename: resolve(root, file) });
}
