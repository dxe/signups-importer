namespace GoogleSheetsSignups {
    import config = Configuration.config;

    export class GoogleSheetSignupQueue implements SignupsProcessor.SignupQueue {
        private headers: string[];

        private statusColumnIndex: number;
        private timestampColumnIndex: number;

        // Current row index
        private i: number;

        constructor(
            private readonly sheet: GoogleAppsScript.Spreadsheet.Sheet,
            private readonly statusColumnName: string,
            private readonly timestampColumnName: string,
        ) {
            const lastColumn = this.sheet.getLastColumn();
            this.headers = this.sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
            this.statusColumnIndex = this.headers.indexOf(this.statusColumnName);
            this.timestampColumnIndex = this.headers.indexOf(this.timestampColumnName);
        }

        *getSignups(): Generator<SignupService.Signup> {
            const lastRow = this.sheet.getLastRow();
            for (this.i = 2; this.i <= lastRow; this.i++) {
                yield this.createSignupFromCurrentRow();
            }
        }

        recordStatus(status: string) {
            this.sheet.getRange(this.i, this.statusColumnIndex, 1, 1).setValue(status);
            this.sheet.getRange(this.i, this.timestampColumnIndex, 1, 1).setValue(new Date().toISOString());
        }

        private createSignupFromCurrentRow() {
            function maybeSet(obj: {}, prop: string, value: string) {
                if (value.length > 0) {
                    obj[prop] = value
                }
            }

            const payload = {
                "source": this.getField("Source"),
                "name": this.getField("First Name") + " " + this.getField("Last Name"),
                "email": this.getField("Email"),
            };
            maybeSet(payload, "phone", this.getField("Phone"))
            maybeSet(payload, "zip", this.getField("Zip"))
            maybeSet(payload, "country", this.getField("Country"))
            maybeSet(payload, "donation_type", this.getField("Donation Type"))
            maybeSet(payload, "donation_amount", this.getField("Donation Amount"))
            maybeSet(payload, "donation_date", this.getField("Donation Date"))

            return payload;
        }

        private getField(fieldName: string) {
            const index = this.headers.indexOf(fieldName);
            if (index === -1) throw Error(`Column not found: "${fieldName}"`);
            let value = this.sheet.getRange(this.i, index + 1).getValue();
            if (typeof (value) === 'number') {
                value = value.toString()
            }
            return value.trim();
        }

        public computeSummary(): string {
            let blank = 0;
            let ok = 0;
            let error = 0;

            const lastRow = this.sheet.getLastRow();
            for (this.i = 2; this.i <= lastRow; this.i++) {
                const value = this.sheet.getRange(this.i, this.statusColumnIndex).getValue();
                if (typeof (value) === 'string' && value.startsWith(config.rowStatusOkPrefix)) {
                    ok++;
                } else if (value.length > 0) {
                    error++;
                } else {
                    blank++;
                }
            }

            return `ok: ${ok}; error: ${error}; not processed: ${blank}`;
        }
    }
}
