namespace EmailAutofix {
    const KNOWN_DOMAINS = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'aol.com', 'icloud.com', 'live.com', 'msn.com',
        'comcast.net', 'verizon.net', 'sbcglobal.net', 'att.net',
        'me.com', 'mac.com', 'protonmail.com', 'proton.me', 'ymail.com',
    ];

    // Optimal String Alignment distance (handles transpositions like "cmo" → "com").
    function osa(a: string, b: string): number {
        const m = a.length, n = b.length;
        const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
            Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
                if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                    d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
                }
            }
        }
        return d[m][n];
    }

    // Returns the email with a corrected domain if a clear typo is detected against a
    // known popular domain. Handles TLD typos, missing TLDs, and missing dots.
    // Returns the original email if no fix is warranted.
    export function fixEmailDomain(email: string): string {
        const atIdx = email.lastIndexOf('@');
        if (atIdx === -1) return email;
        const local = email.substring(0, atIdx);
        const domain = email.substring(atIdx + 1).toLowerCase();
        if (!domain) return email;
        if (KNOWN_DOMAINS.includes(domain)) return email;

        const hasDot = domain.includes('.');

        // Build candidates: for each known domain, try multiple comparison targets.
        // safeAtDist1: domains ≥ 9 chars are long enough that a distance-1 match is
        // unambiguously a typo (e.g. aol.com is too short — "bol" is 1 edit away but real).
        const candidates: { dist: number; known: string; safeAtDist1: boolean }[] = [];
        const push = (dist: number, known: string, safe: boolean) =>
            candidates.push({ dist, known, safeAtDist1: safe });

        for (const known of KNOWN_DOMAINS) {
            const safe = known.length >= 9;
            // Direct: catches typos in an otherwise complete domain ("gmail.con", "gnail.com")
            push(osa(domain, known), known, safe);

            if (!hasDot) {
                // Bare name: "@gmail" or "@gnail" → "gmail.com"
                const base = known.substring(0, known.lastIndexOf('.'));
                push(osa(domain, base), known, safe);

                // Smushed: "@aolcom" → "aol.com" (dot omitted between domain and TLD)
                const nodot = known.replace('.', '');
                push(osa(domain, nodot), known, safe);
            }
        }

        // Keep only candidates within the allowed edit distance:
        //   dist 0 — exact normalization match, safe for any known domain length
        //   dist 1 — one-edit typo, only safe for longer known domains
        const applicable = candidates.filter(c => c.dist === 0 || (c.dist === 1 && c.safeAtDist1));
        if (applicable.length === 0) return email;

        const minDist = Math.min(...applicable.map(c => c.dist));
        const winners = new Set(applicable.filter(c => c.dist === minDist).map(c => c.known));

        // Only fix when exactly one known domain matches at the minimum distance.
        if (winners.size === 1) {
            return local + '@' + [...winners][0];
        }
        return email;
    }
}
