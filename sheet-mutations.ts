namespace SheetMutations {
    import Sheet = GoogleAppsScript.Spreadsheet.Sheet;

    // Useful for importing directly to SendGrid, which is faster but dangerous for other reasons:
    // https://dxe.io/sendgrid-user-guide
    export function splitFullNameColumn(sheet: Sheet) {
        const lastCol = sheet.getLastColumn();
        const lastRow = sheet.getLastRow();
        const FIELDS = GoogleSheetsSignups.GoogleSheetSignupQueue.FIELD_NAMES;

        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] as string[];
        const fullNameColIdx = headers.indexOf(FIELDS.FULL_NAME);
        if (fullNameColIdx === -1) {
            throw new Error(`No "${FIELDS.FULL_NAME}" column found in this sheet.`);
        }
        if (lastRow < 2) {
            throw new Error('No data rows found.');
        }

        const firstNameColIdx = headers.indexOf(FIELDS.FIRST_NAME);
        const lastNameColIdx = headers.indexOf(FIELDS.LAST_NAME);

        if (firstNameColIdx !== -1) {
            throw new Error(`"${FIELDS.FIRST_NAME}" column already exists. Remove it before splitting.`);
        }
        if (lastNameColIdx !== -1) {
            throw new Error(`"${FIELDS.LAST_NAME}" column already exists. Remove it before splitting.`);
        }

        sheet.insertColumnsAfter(fullNameColIdx + 1, 2);
        sheet.getRange(1, fullNameColIdx + 2).setValue(FIELDS.FIRST_NAME);
        sheet.getRange(1, fullNameColIdx + 3).setValue(FIELDS.LAST_NAME);
        const newFirstNameColIdx = fullNameColIdx + 1;
        const newLastNameColIdx = fullNameColIdx + 2;

        const fullNameValues = sheet.getRange(2, fullNameColIdx + 1, lastRow - 1, 1).getValues();
        const firstNames: string[][] = [];
        const lastNames: string[][] = [];
        for (const row of fullNameValues) {
            const fullName = String(row[0]).trim();
            const spaceIdx = fullName.indexOf(' ');
            if (spaceIdx === -1) {
                firstNames.push([fullName]);
                lastNames.push(['']);
            } else {
                firstNames.push([fullName.substring(0, spaceIdx)]);
                lastNames.push([fullName.substring(spaceIdx + 1)]);
            }
        }
        sheet.getRange(2, newFirstNameColIdx + 1, lastRow - 1, 1).setValues(firstNames);
        sheet.getRange(2, newLastNameColIdx + 1, lastRow - 1, 1).setValues(lastNames);
    }
}
