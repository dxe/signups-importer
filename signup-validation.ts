namespace SignupValidation {
    // https://www.regular-expressions.info/email.html
    const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

    export function isValidEmail(email: string): boolean {
        return emailRegex.test(email);
    }

    export function validateDryRun(signup: SignupService.Signup): { level: Configuration.StatusLevel, message?: string } {
        if (!isValidEmail(signup.email)) {
            return { level: 'warn', message: `Invalid email: "${signup.email}"` };
        }

        return { level: 'ok' };
    }

    export type InvalidEmail = { row: number; email: string };

    export function findInvalidEmails(sheet: GoogleAppsScript.Spreadsheet.Sheet): { error: string } | InvalidEmail[] {
        const lastCol = sheet.getLastColumn();
        const lastRow = sheet.getLastRow();

        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] as string[];
        const emailColIdx = headers.indexOf(GoogleSheetsSignups.GoogleSheetSignupQueue.FIELD_NAMES.EMAIL);
        if (emailColIdx === -1) {
            return { error: 'No "Email" column found in this sheet.' };
        }
        if (lastRow < 2) {
            return { error: 'No data rows found.' };
        }

        const emailValues = sheet.getRange(2, emailColIdx + 1, lastRow - 1, 1).getValues();
        const invalid: InvalidEmail[] = [];
        for (let i = 0; i < emailValues.length && invalid.length < 1000; i++) {
            const email = String(emailValues[i][0]).trim();
            if (email && !isValidEmail(email)) {
                invalid.push({ row: i + 2, email });
            }
        }
        return invalid;
    }
}
