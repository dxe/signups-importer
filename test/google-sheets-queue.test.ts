/// <reference path="../global-sheet-config.ts" />
/// <reference path="../signups-service.ts" />
/// <reference path="../signups-processor.ts" />
/// <reference path="../google-sheets-queue.ts" />

import { describe, it, expect, vi } from 'vitest';

// Minimal GAS Sheet stub backed by a plain 2-D array of cell values.
function makeSheet(rows: unknown[][]): GoogleAppsScript.Spreadsheet.Sheet {
    const numCols = Math.max(...rows.map((r) => r.length), 0);
    const setCalls: Array<{ row: number; col: number; values: unknown[][] }> = [];
    return {
        getLastRow: () => rows.length,
        getLastColumn: () => numCols,
        getRange: (row: number, col: number, numRows = 1, numCols_ = 1) => ({
            getValues: () =>
                rows
                    .slice(row - 1, row - 1 + numRows)
                    .map((r) => (r as unknown[]).slice(col - 1, col - 1 + numCols_)),
            setValues: vi.fn((values: unknown[][]) => {
                setCalls.push({ row, col, values });
            }),
        }),
        _setCalls: setCalls,
    } as any;
}

const F = () => (globalThis as any).GoogleSheetsSignups.GoogleSheetSignupQueue.FIELD_NAMES as typeof GoogleSheetsSignups.GoogleSheetSignupQueue.FIELD_NAMES;

function baseHeaders(): unknown[] {
    const { statusColumnName, timestampColumnName } = (globalThis as any).Configuration.config;
    const f = F();
    return [statusColumnName, timestampColumnName, f.SOURCE, f.FIRST_NAME, f.EMAIL, f.DRIP_SELECTOR];
}

function makeValidQueue(dataRows: unknown[][] = []) {
    const headers = baseHeaders();
    const sheet = makeSheet([headers, ...dataRows]);
    return new GoogleSheetsSignups.GoogleSheetSignupQueue(
        sheet,
        (globalThis as any).Configuration.config.statusColumnName,
        (globalThis as any).Configuration.config.timestampColumnName,
    );
}

describe('GoogleSheetSignupQueue constructor validation', () => {
    it('constructs successfully with valid headers', () => {
        expect(() => makeValidQueue()).not.toThrow();
    });

    it('throws when status column is missing', () => {
        const f = F();
        const sheet = makeSheet([[f.SOURCE, f.FIRST_NAME, f.EMAIL, f.DRIP_SELECTOR]]);
        expect(() =>
            new GoogleSheetsSignups.GoogleSheetSignupQueue(sheet, 'Import status', 'Import status timestamp')
        ).toThrow('status column');
    });

    it('throws when a required data column is missing', () => {
        const { statusColumnName, timestampColumnName } = (globalThis as any).Configuration.config;
        const f = F();
        // Missing DRIP_SELECTOR
        const sheet = makeSheet([[statusColumnName, timestampColumnName, f.SOURCE, f.FIRST_NAME, f.EMAIL]]);
        expect(() =>
            new GoogleSheetsSignups.GoogleSheetSignupQueue(sheet, statusColumnName, timestampColumnName)
        ).toThrow(/Missing required column/);
    });

    it('throws when both Full Name and First Name are present', () => {
        const { statusColumnName, timestampColumnName } = (globalThis as any).Configuration.config;
        const f = F();
        const sheet = makeSheet([
            [statusColumnName, timestampColumnName, f.SOURCE, f.FULL_NAME, f.FIRST_NAME, f.EMAIL, f.DRIP_SELECTOR],
        ]);
        expect(() =>
            new GoogleSheetsSignups.GoogleSheetSignupQueue(sheet, statusColumnName, timestampColumnName)
        ).toThrow(/cannot be used together/);
    });

    it('throws for an unrecognized column without a dot prefix', () => {
        const { statusColumnName, timestampColumnName } = (globalThis as any).Configuration.config;
        const f = F();
        const sheet = makeSheet([
            [statusColumnName, timestampColumnName, f.SOURCE, f.FIRST_NAME, f.EMAIL, f.DRIP_SELECTOR, 'Mystery Column'],
        ]);
        expect(() =>
            new GoogleSheetsSignups.GoogleSheetSignupQueue(sheet, statusColumnName, timestampColumnName)
        ).toThrow(/Unknown column/);
    });

    it('accepts an unrecognized column prefixed with a dot', () => {
        const { statusColumnName, timestampColumnName } = (globalThis as any).Configuration.config;
        const f = F();
        const sheet = makeSheet([
            [statusColumnName, timestampColumnName, f.SOURCE, f.FIRST_NAME, f.EMAIL, f.DRIP_SELECTOR, '.notes'],
        ]);
        expect(() =>
            new GoogleSheetsSignups.GoogleSheetSignupQueue(sheet, statusColumnName, timestampColumnName)
        ).not.toThrow();
    });
});

describe('getUnprocessedSignups', () => {
    it('skips rows that already have a status', () => {
        const f = F();
        const headers = baseHeaders();
        const sheet = makeSheet([
            headers,
            ['already-done', '', 'src', 'Alice', 'a@test.com', 'NONE'],
            ['', '', 'src', 'Bob', 'b@test.com', 'DEFAULT'],
        ]);
        const cfg = (globalThis as any).Configuration.config;
        const queue = new GoogleSheetsSignups.GoogleSheetSignupQueue(
            sheet, cfg.statusColumnName, cfg.timestampColumnName
        );

        const results = [...queue.getUnprocessedSignups()];
        expect(results).toHaveLength(1);
        expect(results[0].signup.email).toBe('b@test.com');
    });

    it('builds signup with first/last name fields', () => {
        const row = ['', '', 'petitions', 'Jane', 'jane@test.com', 'selector-1'];
        const queue = makeValidQueue([row]);

        const [{ signup }] = [...queue.getUnprocessedSignups()];
        expect(signup.source).toBe('petitions');
        expect(signup.first_name).toBe('Jane');
        expect(signup.email).toBe('jane@test.com');
        expect(signup.drip_selector).toBe('selector-1');
        expect(signup.name).toBeUndefined();
    });

    it('maps DEFAULT drip selector to empty string', () => {
        const row = ['', '', 'src', 'Jane', 'jane@test.com', 'DEFAULT'];
        const queue = makeValidQueue([row]);

        const [{ signup }] = [...queue.getUnprocessedSignups()];
        expect(signup.drip_selector).toBe('');
    });

    it('throws when source cell is blank', () => {
        const row = ['', '', '', 'Jane', 'jane@test.com', 'NONE'];
        const queue = makeValidQueue([row]);

        expect(() => [...queue.getUnprocessedSignups()]).toThrow(/"Source"/);
    });

    it('throws when drip selector cell is blank', () => {
        const row = ['', '', 'src', 'Jane', 'jane@test.com', ''];
        const queue = makeValidQueue([row]);

        expect(() => [...queue.getUnprocessedSignups()]).toThrow(/"Drip Selector"/);
    });
});
