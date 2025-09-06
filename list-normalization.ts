namespace ListNormalization {
    // Function that gets a cell value from a row using the original (pre-normalization) column name
    export type GetterFunc = (name: string) => unknown;
    // Function that sets a cell value using the normalized name defined in the column spec.
    export type SetterFunc = (name: string, value: unknown) => void;
    export type ComputedColumnFunction = (get: GetterFunc) => unknown;
    export type ColumnSpec = {
        normalizedName: string,
        originalName?: string;
        fn?: ComputedColumnFunction
    };

    export type ColumnSpecNormalization = {
        getColumnSpec(): ColumnSpec[];
        postprocess?(get: GetterFunc, set: SetterFunc): void;
    }

    export class ColumnSpecNormalizer {
        private readonly orderedColumnSpecs: ColumnSpec[];

        constructor(
            private readonly columnSpec: ColumnSpecNormalization,
            private readonly sheet: GoogleAppsScript.Spreadsheet.Sheet,
            private readonly spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
        ) {
            this.orderedColumnSpecs = columnSpec.getColumnSpec();
        }

        // Re-writes the sheet to rename, reorder and include only specific columns.
        public normalize() {
            const sh = this.sheet;
            const lastRow = sh.getLastRow();
            const lastCol = sh.getLastColumn();

            if (lastRow === 0 || lastCol === 0) {
                throw new Error("No data found in current sheet");
            }

            // Read all data
            const range = sh.getRange(1, 1, lastRow, lastCol);
            const values = range.getValues();
            const headers = values[0] as string[]

            // Map header -> 0-based index
            const headerIndexes = new Map<string, number>();
            headers.forEach((h, i) => headerIndexes.set(h, i));

            // Build new matrix in desired order
            const desiredLen = this.orderedColumnSpecs.length;
            const newValues: unknown[][] = new Array(lastRow);

            // Build new header row (using normalized names)
            newValues[0] = this.orderedColumnSpecs.map(s => s.normalizedName);

            // Build contents
            for (let r = 1; r < lastRow; r++) {
                const row = new Array<unknown>(desiredLen);
                const oldRow = values[r];
                const getterFunc = name => ColumnSpecNormalizer.getValue(name, oldRow, headerIndexes)
                for (let c = 0; c < desiredLen; c++) {
                    const columnSpec = this.orderedColumnSpecs[c];
                    let newCellValue;
                    if (columnSpec.originalName) {
                        const header = columnSpec.originalName;
                        const srcIdx = headerIndexes.get(header);
                        if (srcIdx === undefined) {
                            throw new Error("Could not find column " + header)
                        }
                        newCellValue = oldRow[srcIdx]
                    } else {
                        newCellValue = columnSpec.fn(getterFunc)
                    }
                    row[c] = newCellValue
                }
                if (this.columnSpec.postprocess !== undefined) {
                    const setterFunc = (columnName: string, value: unknown) => {
                        const setIndex = this.orderedColumnSpecs.findIndex(spec => spec.normalizedName === columnName);
                        row[setIndex] = value;
                    }
                    this.columnSpec.postprocess(getterFunc, setterFunc);
                }
                newValues[r] = row;
            }

            const newSheet = this.spreadsheet.insertSheet(this.sheet.getIndex() + 1);
            newSheet.setName("Normalized: " + this.sheet.getName())

            // Ensure there is the exact number of columns needed.
            const maxCols = newSheet.getMaxColumns();
            if (maxCols > desiredLen) {
                newSheet.deleteColumns(desiredLen + 1, maxCols - desiredLen);
            } else if (maxCols < desiredLen) {
                newSheet.insertColumnsAfter(maxCols, desiredLen - maxCols);
            }

            // Write normalized data starting at A1.
            newSheet.getRange(1, 1, newValues.length, desiredLen).setValues(newValues);

            // Create new status columns
            const statusColumns = ["Import date", "Import status", "Dry run status"]
            newSheet.insertColumnsBefore(1, statusColumns.length)
            newSheet.getRange(1, 1, 1, statusColumns.length).setValues([statusColumns])

            // Show new sheet to user
            newSheet.activate()
        }

        static getValue(name: string, row: unknown[], headerIndexes: Map<string, number>) {
            const i = headerIndexes.get(name);
            if (i === undefined) {
                throw new Error("Could not find column " + name)
            }
            return row[i];
        }
    }
}