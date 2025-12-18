namespace SignupValidation {
    // Taken from https://www.regular-expressions.info/email.html and converted to JS regex by Codex.
    const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

    export function validateDryRun(signup: SignupService.Signup): { level: Configuration.StatusLevel, message?: string } {
        if (!emailRegex.test(signup.email)) {
            return { level: 'warn', message: `Invalid email: "${signup.email}"` };
        }

        return { level: 'ok' };
    }
}
