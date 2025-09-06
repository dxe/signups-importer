namespace Chuffed {
  // This value changes how the Signup service treats this data.
  const chuffedSourceStr = "chuffed";

  export class ChuffedColumnSpec implements ListNormalization.ColumnSpecNormalization {
    private readonly orderedColumnSpecs: ListNormalization.ColumnSpec[] = [
      { normalizedName: "Source", fn: () => chuffedSourceStr },
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

    public getColumnSpec() {
      return this.orderedColumnSpecs;
    }

    calculateDonationAmount(get: ListNormalization.GetterFunc) {
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
