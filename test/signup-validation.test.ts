/// <reference path="../global-sheet-config.ts" />
/// <reference path="../signups-service.ts" />
/// <reference path="../signups-processor.ts" />
/// <reference path="../google-sheets-queue.ts" />
/// <reference path="../signup-validation.ts" />

import { describe, it, expect } from 'vitest';

describe('isValidEmail', () => {
    it('accepts standard emails', () => {
        expect(SignupValidation.isValidEmail('user@example.com')).toBe(true);
        expect(SignupValidation.isValidEmail('USER@EXAMPLE.COM')).toBe(true);
        expect(SignupValidation.isValidEmail('user.name+tag@sub.domain.org')).toBe(true);
        expect(SignupValidation.isValidEmail('user123@domain.co.uk')).toBe(true);
    });

    it('rejects clearly invalid emails', () => {
        expect(SignupValidation.isValidEmail('')).toBe(false);
        expect(SignupValidation.isValidEmail('notanemail')).toBe(false);
        expect(SignupValidation.isValidEmail('@example.com')).toBe(false);
        expect(SignupValidation.isValidEmail('user@')).toBe(false);
        expect(SignupValidation.isValidEmail('user @example.com')).toBe(false);
        expect(SignupValidation.isValidEmail('user@example')).toBe(false);
    });
});

describe('validateDryRun', () => {
    const validSignup = (): SignupService.Signup => ({
        email: 'user@example.com',
        source: 'test-source',
        drip_selector: '',
    });

    it('returns ok for a valid signup', () => {
        expect(SignupValidation.validateDryRun(validSignup()).level).toBe('ok');
    });

    it('returns warn with message for invalid email', () => {
        const result = SignupValidation.validateDryRun({ ...validSignup(), email: 'not-an-email' });
        expect(result.level).toBe('warn');
        expect(result.message).toContain('not-an-email');
    });
});
