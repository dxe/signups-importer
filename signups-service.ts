namespace SignupService {
    // Corresponds to Signup defined in
    // https://github.com/dxe/signups-worker/blob/main/main.go
    export type Signup = {
        // sources should be lower-snake-case
        // note: Signup service determines the drip campaign selector based on this value.
        source: string,
        name?: string,
        first_name?: string,
        last_name?: string,
        email: string,
        phone?: string,
        zip?: string,
        country?: string,
        target_chapter_id?: number,
        donation_type?: string,
        donation_amount?: string,
        donation_date?: string,
        drip_selector?: string,
    };

    export type SignupResponse = {
        code: number,
        message: string,
    }

    // Sends the given signups to DxE's Signup service in parallel using fetchAll.
    export function enqueueSignups(signups: Signup[]): SignupResponse[] {
        const requests = signups.map(signup => ({
            url: Secrets.signupService.enqueueUrl,
            method: "post" as GoogleAppsScript.URL_Fetch.HttpMethod,
            headers: {
                "X-api-key": Secrets.signupService.apiKey,
                "Content-Type": "application/json"
            },
            payload: JSON.stringify(signup),
            // muteHttpExceptions: true ensures non-2xx responses come back as results rather than thrown errors.
            muteHttpExceptions: true,
        }));
        const responses = UrlFetchApp.fetchAll(requests);
        return responses.map(r => ({
            code: r.getResponseCode(),
            message: r.getContentText(),
        }));
    }
}
