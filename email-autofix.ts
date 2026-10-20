namespace EmailAutofix {
    const KNOWN_DOMAINS = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'aol.com', 'icloud.com', 'live.com', 'msn.com',
        'comcast.net', 'verizon.net', 'sbcglobal.net', 'att.net',
        'me.com', 'mac.com', 'protonmail.com', 'proton.me', 'ymail.com',
    ];

    // Only attempt typo-fixing for domains long enough that a distance-1 mistake
    // is unambiguously a typo (short domains like aol.com are too close to other
    // real domains like bol.com to safely auto-correct).
    const FIXABLE_DOMAINS = KNOWN_DOMAINS.filter(d => d.length >= 9);

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

    // Returns the email with a corrected domain if a clear single-edit-distance typo
    // is detected against a known popular domain. Returns the original if no fix is
    // warranted (already valid, ambiguous, or unknown domain).
    export function fixEmailDomain(email: string): string {
        const atIdx = email.lastIndexOf('@');
        if (atIdx === -1) return email;
        const local = email.substring(0, atIdx);
        const domain = email.substring(atIdx + 1).toLowerCase();
        if (!domain) return email;

        if (KNOWN_DOMAINS.includes(domain)) return email;

        let bestDomain = '';
        let bestDist = Infinity;
        let secondBestDist = Infinity;
        for (const known of FIXABLE_DOMAINS) {
            const d = osa(domain, known);
            if (d < bestDist) {
                secondBestDist = bestDist;
                bestDist = d;
                bestDomain = known;
            } else if (d < secondBestDist) {
                secondBestDist = d;
            }
        }

        // Only fix if there is exactly one domain within edit distance 1 (unambiguous).
        if (bestDist === 1 && secondBestDist > 1) {
            return local + '@' + bestDomain;
        }
        return email;
    }
}
