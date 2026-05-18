/// <reference types="google-apps-script" />
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

    describe('name fields', () => {
        it('sets first_name from First Name column', () => {
            const row = ['', '', 'petitions', 'Jane', 'jane@test.com', 'selector-1'];
            const queue = makeValidQueue([row]);

            const [{ signup }] = [...queue.getUnprocessedSignups()];
            expect(signup.first_name).toBe('Jane');
            expect(signup.name).toBeUndefined();
        });

        it('sets last_name from Last Name column', () => {
            const { statusColumnName, timestampColumnName } = (globalThis as any).Configuration.config;
            const f = F();
            const sheet = makeSheet([
                [statusColumnName, timestampColumnName, f.SOURCE, f.FIRST_NAME, f.LAST_NAME, f.EMAIL, f.DRIP_SELECTOR],
                ['', '', 'src', 'Jane', 'Doe', 'jane@test.com', 'NONE'],
            ]);
            const queue = new GoogleSheetsSignups.GoogleSheetSignupQueue(sheet, statusColumnName, timestampColumnName);

            const [{ signup }] = [...queue.getUnprocessedSignups()];
            expect(signup.first_name).toBe('Jane');
            expect(signup.last_name).toBe('Doe');
        });

        it('sets name from Full Name column instead of first/last name', () => {
            const { statusColumnName, timestampColumnName } = (globalThis as any).Configuration.config;
            const f = F();
            const sheet = makeSheet([
                [statusColumnName, timestampColumnName, f.SOURCE, f.FULL_NAME, f.EMAIL, f.DRIP_SELECTOR],
                ['', '', 'src', 'Jane Doe', 'jane@test.com', 'NONE'],
            ]);
            const queue = new GoogleSheetsSignups.GoogleSheetSignupQueue(sheet, statusColumnName, timestampColumnName);

            const [{ signup }] = [...queue.getUnprocessedSignups()];
            expect(signup.name).toBe('Jane Doe');
            expect((signup as any).first_name).toBeUndefined();
            expect((signup as any).last_name).toBeUndefined();
        });
    });

    describe('optional fields', () => {
        it('maps all optional fields when populated', () => {
            const { statusColumnName, timestampColumnName } = (globalThis as any).Configuration.config;
            const f = F();
            const sheet = makeSheet([
                [statusColumnName, timestampColumnName, f.SOURCE, f.FIRST_NAME, f.EMAIL,
                 f.PHONE, f.ZIP, f.COUNTRY, f.CHAPTER_ID,
                 f.DONATION_TYPE, f.DONATION_AMOUNT, f.DONATION_DATE, f.DRIP_SELECTOR],
                ['', '', 'src', 'Jane', 'jane@test.com',
                 '555-1234', '94107', 'US', '42',
                 'one-time', '100', '2026-01-01', 'NONE'],
            ]);
            const queue = new GoogleSheetsSignups.GoogleSheetSignupQueue(sheet, statusColumnName, timestampColumnName);

            const [{ signup }] = [...queue.getUnprocessedSignups()];
            expect(signup.phone).toBe('555-1234');
            expect(signup.zip).toBe('94107');
            expect(signup.country).toBe('US');
            expect(signup.target_chapter_id).toBe(42);
            expect(signup.donation_type).toBe('one-time');
            expect(signup.donation_amount).toBe('100');
            expect(signup.donation_date).toBe('2026-01-01');
        });

        it('omits optional fields when cells are blank', () => {
            const { statusColumnName, timestampColumnName } = (globalThis as any).Configuration.config;
            const f = F();
            const sheet = makeSheet([
                [statusColumnName, timestampColumnName, f.SOURCE, f.FIRST_NAME, f.EMAIL,
                 f.PHONE, f.ZIP, f.COUNTRY, f.CHAPTER_ID,
                 f.DONATION_TYPE, f.DONATION_AMOUNT, f.DONATION_DATE, f.DRIP_SELECTOR],
                ['', '', 'src', 'Jane', 'jane@test.com',
                 '', '', '', '',
                 '', '', '', 'NONE'],
            ]);
            const queue = new GoogleSheetsSignups.GoogleSheetSignupQueue(sheet, statusColumnName, timestampColumnName);

            const [{ signup }] = [...queue.getUnprocessedSignups()];
            expect(signup.phone).toBeUndefined();
            expect(signup.zip).toBeUndefined();
            expect(signup.country).toBeUndefined();
            expect(signup.target_chapter_id).toBeUndefined();
            expect(signup.donation_type).toBeUndefined();
            expect(signup.donation_amount).toBeUndefined();
            expect(signup.donation_date).toBeUndefined();
        });
    });

    describe('source field', () => {
        it('throws when source cell is blank', () => {
            const row = ['', '', '', 'Jane', 'jane@test.com', 'NONE'];
            const queue = makeValidQueue([row]);

            expect(() => [...queue.getUnprocessedSignups()]).toThrow(/"Source"/);
        });
    });

    describe('drip selector', () => {
        it('passes through a literal selector value', () => {
            const row = ['', '', 'petitions', 'Jane', 'jane@test.com', 'selector-1'];
            const queue = makeValidQueue([row]);

            const [{ signup }] = [...queue.getUnprocessedSignups()];
            expect(signup.drip_selector).toBe('selector-1');
        });

        it('passes through NONE as-is', () => {
            const row = ['', '', 'src', 'Jane', 'jane@test.com', 'NONE'];
            const queue = makeValidQueue([row]);

            const [{ signup }] = [...queue.getUnprocessedSignups()];
            expect(signup.drip_selector).toBe('NONE');
        });

        it('maps DEFAULT to empty string', () => {
            const row = ['', '', 'src', 'Jane', 'jane@test.com', 'DEFAULT'];
            const queue = makeValidQueue([row]);

            const [{ signup }] = [...queue.getUnprocessedSignups()];
            expect(signup.drip_selector).toBe('');
        });

        it('throws when drip selector cell is blank', () => {
            const row = ['', '', 'src', 'Jane', 'jane@test.com', ''];
            const queue = makeValidQueue([row]);

            expect(() => [...queue.getUnprocessedSignups()]).toThrow(/"Drip Selector"/);
        });
    });
});
