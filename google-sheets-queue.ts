namespace GoogleSheetsSignups {
    export class GoogleSheetSignupQueue implements SignupsProcessor.SignupQueue {
        private config = Configuration.config;
        private data: unknown[][];
        private headers: unknown[];

        private statusColumnIndex: number;
        private timestampColumnIndex: number;

        // Current row index
        private i: number;

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

            const signup: SignupService.Signup = {
                "source": this.getField("Source"),
                "first_name": this.getField("First Name"),
                "last_name": this.getField("Last Name"),
                "email": this.getField("Email"),
            };
            maybeSet(signup, "phone", this.getField("Phone"))
            maybeSet(signup, "state", this.getField("State"))
            maybeSet(signup, "zip", this.getField("Zip"))
            maybeSet(signup, "country", this.getField("Country"))
            maybeSet(signup, "target_chapter_id", parseInt(this.getField("Chapter ID")))
            maybeSet(signup, "donation_type", this.getField("Donation Type"))
            maybeSet(signup, "donation_amount", this.getField("Donation Amount"))
            maybeSet(signup, "donation_date", this.getField("Donation Date"))

            return signup;
        }

        private getField(fieldName: string): string | undefined {
            const index = this.headers.indexOf(fieldName);
            if (index === -1) throw Error(`Column not found: "${fieldName}"`);
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
