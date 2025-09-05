namespace SignupsProcessor {
    export type SignupHandlerFunc = (payload: SignupsService.Signup) => unknown;

    function createPayload(getField) {
        const payload = {
            "source": getField("Source"),
            "name": getField("First Name") + " " + getField("Last Name"),
            "email": getField("Email"),
        };

        // Comment out this section if the sheet does not contain a "Phone" column.
        const phone = getField("Phone");
        if (phone.length > 0) {
            payload["phone"] = phone;
        };

        // Comment out this section if the sheet does not contain a "Zip" column.
        const zip = getField("Zip");
        if (zip.length > 0) {
            payload["zip"] = zip;
        }

        // TODO: handle other fields

        return payload;
    }

    export function processSignups(
        sheet: GoogleAppsScript.Spreadsheet.Sheet,
        handler: SignupHandlerFunc,
        statusColumnName: string,
    ) {
        const lastRow = sheet.getLastRow();
        const lastColumn = sheet.getLastColumn();
        const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

        for (let i = 2; i <= lastRow; i++) {
            const getField = (fieldName) => {
                const index = headers.indexOf(fieldName);
                if (index === -1) throw Error(`Column not found: "${fieldName}"`);
                let value = sheet.getRange(i, index + 1).getValue();
                if (typeof (value) === 'number') {
                    value = value.toString()
                }
                return value.trim();
            }

            const payload = createPayload(getField);

            let status: string;
            try {
                handler(payload);
                status = "OK"
            } catch (e) {
                status = String(e)
            }

            // TODO: record date and status
        }
    }
}
