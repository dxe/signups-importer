/// <reference path="../email-autofix.ts" />

import { describe, it, expect } from 'vitest';

describe('fixEmailDomain', () => {
    it('leaves already-correct emails unchanged', () => {
        expect(EmailAutofix.fixEmailDomain('user@gmail.com')).toBe('user@gmail.com');
        expect(EmailAutofix.fixEmailDomain('user@yahoo.com')).toBe('user@yahoo.com');
        expect(EmailAutofix.fixEmailDomain('user@hotmail.com')).toBe('user@hotmail.com');
        expect(EmailAutofix.fixEmailDomain('user@outlook.com')).toBe('user@outlook.com');
    });

    it('fixes single-character domain name typos', () => {
        expect(EmailAutofix.fixEmailDomain('user@gnail.com')).toBe('user@gmail.com');
        expect(EmailAutofix.fixEmailDomain('user@gmaill.com')).toBe('user@gmail.com');
        expect(EmailAutofix.fixEmailDomain('user@yahooo.com')).toBe('user@yahoo.com');
        expect(EmailAutofix.fixEmailDomain('user@hotmal.com')).toBe('user@hotmail.com');
    });

    it('fixes transpositions', () => {
        expect(EmailAutofix.fixEmailDomain('user@gmial.com')).toBe('user@gmail.com');
        expect(EmailAutofix.fixEmailDomain('user@gmail.cmo')).toBe('user@gmail.com');
    });

    it('fixes TLD typos', () => {
        expect(EmailAutofix.fixEmailDomain('user@gmail.con')).toBe('user@gmail.com');
        expect(EmailAutofix.fixEmailDomain('user@yahoo.con')).toBe('user@yahoo.com');
        expect(EmailAutofix.fixEmailDomain('user@gmail.co')).toBe('user@gmail.com');
    });

    it('preserves the local part exactly', () => {
        expect(EmailAutofix.fixEmailDomain('John.Doe+tag@gnail.com')).toBe('John.Doe+tag@gmail.com');
    });

    it('does not touch emails with unknown domains that are not near any known domain', () => {
        expect(EmailAutofix.fixEmailDomain('user@company.com')).toBe('user@company.com');
        expect(EmailAutofix.fixEmailDomain('user@work.org')).toBe('user@work.org');
        expect(EmailAutofix.fixEmailDomain('user@customdomain.net')).toBe('user@customdomain.net');
    });

    it('does not fix short unknown domains that are near short known domains', () => {
        // "bol.com" is distance-1 from "aol.com", but aol.com is excluded from fixing
        // (too short to safely auto-correct). Result should be unchanged.
        expect(EmailAutofix.fixEmailDomain('user@bol.com')).toBe('user@bol.com');
    });

    it('leaves emails with no @ unchanged', () => {
        expect(EmailAutofix.fixEmailDomain('notanemail')).toBe('notanemail');
    });
});
