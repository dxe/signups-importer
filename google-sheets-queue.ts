namespace GoogleSheetsSignups {
    // Implementation of a queue of signups based on Google Sheets. Retrieves signups and allows recording their status.
    export class GoogleSheetSignupQueue implements SignupsProcessor.SignupQueue {
        private config = Configuration.config;
        private data: any[][];
        private headers: unknown[];

        private statusColumnIndex: number;
        private timestampColumnIndex: number;

        // Current row index
        private i: number = -1;

        // Centralized field/column names used by this queue
        public static readonly FIELD_NAMES = {
            SOURCE: "Source",
            FULL_NAME: "Full Name",
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
            DRIP_SELECTOR: "Drip Selector",
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
            const required = [FIELDS.EMAIL, FIELDS.SOURCE, FIELDS.DRIP_SELECTOR];
            const missing = required.filter((name) => this.headers.indexOf(name) === -1);
            if (missing.length > 0) {
                throw new Error(`Missing required column(s): ${missing.join(', ')}`);
            }

            const hasFullName = this.headers.indexOf(FIELDS.FULL_NAME) !== -1;
            const hasFirstName = this.headers.indexOf(FIELDS.FIRST_NAME) !== -1;
            const hasLastName = this.headers.indexOf(FIELDS.LAST_NAME) !== -1;
            if (hasFullName && (hasFirstName || hasLastName)) {
                throw new Error(`"${FIELDS.FULL_NAME}" column cannot be used together with "${FIELDS.FIRST_NAME}" or "${FIELDS.LAST_NAME}" columns`);
            }
            if (!hasFullName && !hasFirstName && !hasLastName) {
                throw new Error(`Must have at least one name column: "${FIELDS.FULL_NAME}", "${FIELDS.FIRST_NAME}", or "${FIELDS.LAST_NAME}"`);
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

        *getUnprocessedSignups(): Generator<{ signup: SignupService.Signup, rowIndex: number }> {
            for (this.i = 1; this.i < this.data.length; this.i++) {
                if (this.data[this.i][this.statusColumnIndex] !== '') {
                    // Skip already-processed row.
                    continue;
                }
                yield { signup: this.createSignupFromCurrentRow(), rowIndex: this.i };
            }
        }

        recordStatuses(results: Array<{ rowIndex: number, status: string }>) {
            const timestamp = new Date().toISOString();
            const sorted = [...results].sort((a, b) => a.rowIndex - b.rowIndex);
            let i = 0;
            while (i < sorted.length) {
                let j = i;
                while (j + 1 < sorted.length && sorted[j + 1].rowIndex === sorted[j].rowIndex + 1) {
                    j++;
                }
                const values = sorted.slice(i, j + 1).map(r => [r.status, timestamp]);
                const startSheetRow = sorted[i].rowIndex + 1; // 1-indexed
                this.sheet.getRange(startSheetRow, this.statusColumnIndex + 1, values.length, 2).setValues(values);
                i = j + 1;
            }
        }

        private createSignupFromCurrentRow() {
            function maybeSet(obj: Record<string, any>, prop: string, value: string | number | undefined) {
                if (
                    (typeof (value) === 'string' && value.length > 0) ||
                    typeof (value) === 'number' && !isNaN(value)
                ) {
                    obj[prop] = value
                }
            }

            function parseIntOrUndefined(value: string | undefined): number | undefined {
                if (value === undefined || value === '') return undefined;
                return parseInt(value);
            }

            const FIELDS = GoogleSheetSignupQueue.FIELD_NAMES;
            const signup: SignupService.Signup = {
                "source": this.getFieldValueForCurrentRow(FIELDS.SOURCE)!,
                "email": this.getFieldValueForCurrentRow(FIELDS.EMAIL)!,
            };
            if (this.headers.indexOf(FIELDS.FULL_NAME) !== -1) {
                maybeSet(signup, "name", this.getFieldValueForCurrentRow(FIELDS.FULL_NAME));
            } else {
                maybeSet(signup, "first_name", this.getFieldValueForCurrentRow(FIELDS.FIRST_NAME));
                maybeSet(signup, "last_name", this.getFieldValueForCurrentRow(FIELDS.LAST_NAME));
            }
            maybeSet(signup, "phone", this.getFieldValueForCurrentRow(FIELDS.PHONE))
            maybeSet(signup, "state", this.getFieldValueForCurrentRow(FIELDS.STATE))
            maybeSet(signup, "zip", this.getFieldValueForCurrentRow(FIELDS.ZIP))
            maybeSet(signup, "country", this.getFieldValueForCurrentRow(FIELDS.COUNTRY))
            maybeSet(signup, "target_chapter_id", parseIntOrUndefined(this.getFieldValueForCurrentRow(FIELDS.CHAPTER_ID)))
            maybeSet(signup, "donation_type", this.getFieldValueForCurrentRow(FIELDS.DONATION_TYPE))
            maybeSet(signup, "donation_amount", this.getFieldValueForCurrentRow(FIELDS.DONATION_AMOUNT))
            maybeSet(signup, "donation_date", this.getFieldValueForCurrentRow(FIELDS.DONATION_DATE))

            const dripSelector = this.getFieldValueForCurrentRow(FIELDS.DRIP_SELECTOR)!;
            if (dripSelector.trim() === '') {
                throw new Error(`"${FIELDS.DRIP_SELECTOR}" value is blank. Use "NONE" to omit drip selector or "DEFAULT" to send a blank drip selector.`);
            } else if (dripSelector.trim() === 'DEFAULT') {
                signup.drip_selector = '';
            } else if (dripSelector.trim() !== 'NONE') {
                signup.drip_selector = dripSelector;
            }


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
            let warn = 0;
            let error = 0;

            const lastRow = this.sheet.getLastRow();
            for (this.i = 1; this.i < lastRow; this.i++) {
                const value = this.data[this.i][this.statusColumnIndex];
                if (typeof (value) === 'string' && value.startsWith(this.config.statusPrefixes.ok)) {
                    ok++;
                } else if (typeof (value) === 'string' && value.startsWith(this.config.statusPrefixes.warn)) {
                    warn++;
                } else if (value === null) {
                    blank++
                } else if (value.toString().length > 0) {
                    error++;
                } else {
                    blank++;
                }
            }

            return `ok: ${ok}; warn: ${warn}; error: ${error}; not processed: ${blank}`;
        }
    }
}
