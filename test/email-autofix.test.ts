/// <reference path="../email-autofix.ts" />

import { describe, it, expect } from 'vitest';

describe('fixEmailDomain', () => {
    it('leaves already-correct emails unchanged', () => {
        expect(EmailAutofix.fixEmailDomain('user@gmail.com')).toBe('user@gmail.com');
        expect(EmailAutofix.fixEmailDomain('user@yahoo.com')).toBe('user@yahoo.com');
        expect(EmailAutofix.fixEmailDomain('user@hotmail.com')).toBe('user@hotmail.com');
        expect(EmailAutofix.fixEmailDomain('user@outlook.com')).toBe('user@outlook.com');
        expect(EmailAutofix.fixEmailDomain('user@aol.com')).toBe('user@aol.com');
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

    it('adds missing TLD when domain exactly matches a known name', () => {
        expect(EmailAutofix.fixEmailDomain('user@gmail')).toBe('user@gmail.com');
        expect(EmailAutofix.fixEmailDomain('user@yahoo')).toBe('user@yahoo.com');
        expect(EmailAutofix.fixEmailDomain('user@hotmail')).toBe('user@hotmail.com');
        expect(EmailAutofix.fixEmailDomain('user@icloud')).toBe('user@icloud.com');
        expect(EmailAutofix.fixEmailDomain('user@aol')).toBe('user@aol.com');
    });

    it('adds missing TLD even with a one-edit typo in the name', () => {
        expect(EmailAutofix.fixEmailDomain('user@gnail')).toBe('user@gmail.com');
        expect(EmailAutofix.fixEmailDomain('user@ickoud')).toBe('user@icloud.com');
    });

    it('fixes missing dot between domain and TLD', () => {
        expect(EmailAutofix.fixEmailDomain('user@aolcom')).toBe('user@aol.com');
        expect(EmailAutofix.fixEmailDomain('user@gmailcom')).toBe('user@gmail.com');
        expect(EmailAutofix.fixEmailDomain('user@outlookcom')).toBe('user@outlook.com');
    });

    it('preserves the local part exactly', () => {
        expect(EmailAutofix.fixEmailDomain('John.Doe+tag@gnail.com')).toBe('John.Doe+tag@gmail.com');
        expect(EmailAutofix.fixEmailDomain('John.Doe+tag@gmail')).toBe('John.Doe+tag@gmail.com');
    });

    it('does not touch emails with unknown domains that are not near any known domain', () => {
        expect(EmailAutofix.fixEmailDomain('user@company.com')).toBe('user@company.com');
        expect(EmailAutofix.fixEmailDomain('user@work.org')).toBe('user@work.org');
        expect(EmailAutofix.fixEmailDomain('user@customdomain.net')).toBe('user@customdomain.net');
        expect(EmailAutofix.fixEmailDomain('user@company')).toBe('user@company');
    });

    it('does not fix short bare domains that are one edit from a short known domain', () => {
        // "bol" is distance-1 from "aol", but aol.com is short so we only fix at distance 0
        expect(EmailAutofix.fixEmailDomain('user@bol')).toBe('user@bol');
        expect(EmailAutofix.fixEmailDomain('user@bol.com')).toBe('user@bol.com');
    });

    it('leaves emails with no @ unchanged', () => {
        expect(EmailAutofix.fixEmailDomain('notanemail')).toBe('notanemail');
    });
});
