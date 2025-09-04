
namespace Chuffed {
  // Function that gets a cell value from a row
  type GetterFunc = (name: string) => unknown;
  type ComputedColumnFunction = (get: GetterFunc) => unknown;
  type ColumnSpec = {
    normalizedName: string,
    originalName?: string;
    fn?: ComputedColumnFunction
  };

  export class ChuffedList {
    private orderedColumnSpecs: ColumnSpec[] = [
      { originalName: "First Name", normalizedName: "First Name" },
      { originalName: "Last Name", normalizedName: "Last Name" },
      { originalName: "Email", normalizedName: "Email" },
      { originalName: "ZIP/Postal Code", normalizedName: "Zip" },
      { originalName: "Date (UTC)", normalizedName: "Donation Date" },
      { originalName: "Donation", normalizedName: ".Raw Donation Amount" },
      { originalName: "Currency", normalizedName: ".Raw Donation Currency" },
      { originalName: "Converted Amount", normalizedName: ".Converted Amount" },
      { normalizedName: "Donation Amount", fn: this.calculateDonationAmount },
    ];

    constructor(
      private readonly sheet: GoogleAppsScript.Spreadsheet.Sheet,
      private readonly spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
    ) { }

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
            newCellValue = columnSpec.fn(name => ChuffedList.getValue(name, oldRow, headerIndexes))
          }
          row[c] = newCellValue
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
      newSheet.activate()
    }

    static getValue(name: string, row: unknown[], headerIndexes: Map<string, number>) {
      const i = headerIndexes.get(name);
      if (i === undefined) {
        throw new Error("Could not find column " + name)
      }
      return row[i];
    }

    calculateDonationAmount(get: GetterFunc) {
      const rawAmt = get("Donation");
      const rawCurrency = get("Currency");
      const convertedAmt = get("Converted Amount");

      if (rawCurrency === "usd") {
        return rawAmt
      } else {
        return convertedAmt
      }
    }
  }
}
