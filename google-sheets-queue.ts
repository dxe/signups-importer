namespace GoogleSheetsSignups {
    // Implementation of a queue of signups based on Google Sheets. Retrieves signups and allows recording their status.
    export class GoogleSheetSignupQueue implements SignupsProcessor.SignupQueue {
        private config = Configuration.config;
        private data: unknown[][];
        private headers: unknown[];

        private statusColumnIndex: number;
        private timestampColumnIndex: number;

        // Current row index
        private i: number;

        // Centralized field/column names used by this queue
        private static readonly FIELD_NAMES = {
            SOURCE: "Source",
            FIRST_NAME: "First Name",
            LAST_NAME: "Last Name",
            EMAIL: "Email",
            PHONE: "Phone",
            STATE: "State",
            ZIP: "Zip",
            COUNTRY: "Country",
            CHAPTER_ID: "Chapter ID",
            DONATION_TYPE: "Donation Type",
            DONATION_AMOUNT: "Donation Amount",
            DONATION_DATE: "Donation Date",
        } as const;

        constructor(
            private readonly sheet: GoogleAppsScript.Spreadsheet.Sheet,
            private readonly statusColumnName: string,
            private readonly timestampColumnName: string,
        ) {
            this.data = this.sheet.getRange(1, 1, this.sheet.getLastRow(), this.sheet.getLastColumn()).getValues()
            this.headers = this.data[0];
            this.statusColumnIndex = this.headers.indexOf(this.statusColumnName);
            if (this.statusColumnIndex === -1) {
                throw new Error("Could not find status column")
            }
            this.timestampColumnIndex = this.headers.indexOf(this.timestampColumnName);
            if (this.timestampColumnIndex === -1) {
                throw new Error("Could not find timestamp column")
            }

            if (this.timestampColumnIndex !== this.statusColumnIndex + 1) {
                throw new Error("Timestamp column must be immediately right of status column");
            }

            this.validateHeaderDataColumns();
        }

        // Validate header columns for data fields:
        // * Ensure required fields are present.
        // * Ensure that each column is a known data field, if not one of the status/timestamp columns, or starts with
        //   a dot (.) indicating it is safe to ignore.
        private validateHeaderDataColumns() {
            // Ensure required fields are present
            const FIELDS = GoogleSheetSignupQueue.FIELD_NAMES;
            const required = [FIELDS.EMAIL, FIELDS.SOURCE, FIELDS.FIRST_NAME, FIELDS.LAST_NAME];
            const missing = required.filter((name) => this.headers.indexOf(name) === -1);
            if (missing.length > 0) {
                throw new Error(`Missing required column(s): ${missing.join(', ')}`);
            }

            // Check fields are recognized or prefixed with dot.
            const allowedFieldNames = new Set<string>(Object.values(GoogleSheetSignupQueue.FIELD_NAMES));
            allowedFieldNames.add(Configuration.config.dryRunTimestampColumnName);
            allowedFieldNames.add(Configuration.config.dryRunStatusColumnName);
            allowedFieldNames.add(Configuration.config.statusColumnName);
            allowedFieldNames.add(Configuration.config.timestampColumnName);

            const invalidColumns: string[] = [];
            for (const h of this.headers) {
                const header = typeof h === 'string' ? h : String(h);
                if (header.startsWith('.') ||
                    header === this.statusColumnName ||
                    header === this.timestampColumnName ||
                    allowedFieldNames.has(header)) {
                    continue;
                }
                invalidColumns.push(header);
            }
            if (invalidColumns.length > 0) {
                throw new Error(`Unknown column(s): ${invalidColumns.join(', ')}. Prefix column header with '.' to indicate column is not part of import.`);
            }
        }

        *getUnprocessedSignups(): Generator<SignupService.Signup> {
            for (this.i = 1; this.i < this.data.length; this.i++) {
                if (this.data[this.i][this.statusColumnIndex] !== '') {
                    // Skip already-processed row.
                    continue;
                }
                yield this.createSignupFromCurrentRow();
            }
        }

        recordStatus(status: string) {
            this.sheet.getRange(this.i + 1, this.statusColumnIndex + 1, 1, 2).setValues([[status, new Date().toISOString()]]);
        }

        private createSignupFromCurrentRow() {
            function maybeSet(obj: {}, prop: string, value: string | number | undefined) {
                if (
                    (typeof (value) === 'string' && value.length > 0) ||
                    typeof (value) === 'number' && !isNaN(value)
                ) {
                    obj[prop] = value
                }
            }

            const FIELDS = GoogleSheetSignupQueue.FIELD_NAMES;
            const signup: SignupService.Signup = {
                "source": this.getFieldValueForCurrentRow(FIELDS.SOURCE),
                "first_name": this.getFieldValueForCurrentRow(FIELDS.FIRST_NAME),
                "last_name": this.getFieldValueForCurrentRow(FIELDS.LAST_NAME),
                "email": this.getFieldValueForCurrentRow(FIELDS.EMAIL),
            };
            maybeSet(signup, "phone", this.getFieldValueForCurrentRow(FIELDS.PHONE))
            maybeSet(signup, "state", this.getFieldValueForCurrentRow(FIELDS.STATE))
            maybeSet(signup, "zip", this.getFieldValueForCurrentRow(FIELDS.ZIP))
            maybeSet(signup, "country", this.getFieldValueForCurrentRow(FIELDS.COUNTRY))
            maybeSet(signup, "target_chapter_id", parseInt(this.getFieldValueForCurrentRow(FIELDS.CHAPTER_ID)))
            maybeSet(signup, "donation_type", this.getFieldValueForCurrentRow(FIELDS.DONATION_TYPE))
            maybeSet(signup, "donation_amount", this.getFieldValueForCurrentRow(FIELDS.DONATION_AMOUNT))
            maybeSet(signup, "donation_date", this.getFieldValueForCurrentRow(FIELDS.DONATION_DATE))

            return signup;
        }

        private getFieldValueForCurrentRow(fieldName: string): string | undefined {
            const index = this.headers.indexOf(fieldName);
            if (index === -1) return undefined;
            let value = this.data[this.i][index];
            return value.toString();
        }

        public computeSummary(): string {
            let blank = 0;
            let ok = 0;
            let error = 0;

            const lastRow = this.sheet.getLastRow();
            for (this.i = 1; this.i < lastRow; this.i++) {
                const value = this.data[this.i][this.statusColumnIndex];
                if (typeof (value) === 'string' && value.startsWith(this.config.rowStatusOkPrefix)) {
                    ok++;
                } else if (value === null) {
                    blank++
                } else if (value.toString().length > 0) {
                    error++;
                } else {
                    blank++;
                }
            }

            return `ok: ${ok}; error: ${error}; not processed: ${blank}`;
        }
    }
}
