namespace Chuffed {
  // This value changes how the Signup service treats this data.
  const chuffedSourceStr = "chuffed";

  export class ChuffedColumnSpec implements ListNormalization.ColumnSpecNormalization {
    // Prefix "." is to indicate that the field is not required as part of the output. These columns are just
    // retained so that the calculated "Donation Amount" field can be manually verified.
    private readonly orderedColumnSpecs: ListNormalization.ColumnSpec[] = [
      { normalizedName: "Source", fn: () => chuffedSourceStr },
      { normalizedName: "First Name", originalName: "First Name" },
      { normalizedName: "Last Name", originalName: "Last Name" },
      { normalizedName: "Email", originalName: "Email" },
      { normalizedName: "Phone", fn: () => null },
      { normalizedName: "Zip", fn: (get) => null /* Set by post-processor */ },
      { normalizedName: ".ZIP/Postal Code", originalName: "ZIP/Postal Code" },
      { normalizedName: "Country", fn: () => null /* Set by post-processor */ },
      { originalName: "Date (UTC)", normalizedName: "Donation Date" },
      { normalizedName: ".Raw Donation Amount", originalName: "Donation" },
      { normalizedName: ".Raw Donation Currency", originalName: "Currency" },
      { normalizedName: ".Converted Amount", originalName: "Converted Amount" },
      { normalizedName: "Donation Amount", fn: this.calculateDonationAmount },
      { normalizedName: "Donation Type", fn: () => "one time" },
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

    postprocess(get: ListNormalization.GetterFunc, set: ListNormalization.SetterFunc): void {
      const result = this.splitCountryAndZipCode(get("ZIP/Postal Code"))
      set("Country", result.country)
      set("Zip", this.stripZipRoute(result.zip))
    }

    splitCountryAndZipCode(original: unknown): { country: string | null, zip: string | null } {
      if (typeof original === 'number') {
        return { zip: original.toString(), country: null }
      }

      if (typeof original !== 'string') {
        return { zip: null, country: null }
      }

      // Set `country` to the biggest prefix of space-separated words in `original` that does not contain any digits.
      // Set `zip` to the remainder of the string, i.e. the suffix of words starting with the first word that contains
      // a number.
      const s = original.trim();
      if (s.length === 0) {
        return { country: null, zip: null };
      }

      // Find index of first digit (0-9)
      let digitIdx = -1;
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 48 && c <= 57) { // '0'..'9'
          digitIdx = i;
          break;
        }
      }

      if (digitIdx === -1) {
        // No digits found; entire string is country
        return { country: s, zip: null };
      }

      // Find start of the word that contains the first digit
      let j = digitIdx - 1;
      while (j >= 0 && s.charCodeAt(j) !== 32) { // ' '
        j--;
      }

      // Country is everything before the space preceding that word
      const countryStr = j < 0 ? "" : s.slice(0, j).trimEnd();
      const zipStr = s.slice(j + 1).trim();

      return {
        country: countryStr.length > 0 ? countryStr : null,
        zip: zipStr.length > 0 ? zipStr : null,
      }
    }

    // Strips any 4-digit routing suffix on valid US zip codes
    stripZipRoute(zip: unknown): unknown {
      if (typeof zip !== 'string') return zip;
      const s = zip.trim();

      // Ensure ZIP+4 is in form 12345-6789
      if (s.length !== 10 || s.charCodeAt(5) !== 45) { // '-'
        return s;
      }
      for (let i = 0; i < 5; i++) {
        const c = s.charCodeAt(i);
        if (c < 48 || c > 57) return zip;
      }
      for (let i = 6; i < 10; i++) {
        const c = s.charCodeAt(i);
        if (c < 48 || c > 57) return zip;
      }

      return s.slice(0, 5);
    }
  }
}
