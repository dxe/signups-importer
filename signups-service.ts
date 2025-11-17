namespace SignupService {
    // Corresponds to Signup defined in
    // https://github.com/dxe/signups-worker/blob/main/main.go
    export type Signup = {
        // sources should be lower-snake-case
        // note: Signup service determines the drip campaign selector based on this value.
        source: string,
        first_name: string,
        last_name: string,
        email: string,
        phone?: string,
        zip?: string,
        country?: string,
        donation_type?: string,
        donation_amount?: string,
        donation_date?: string,
    };

    export type SignupResponse = {
        code: number,
        message: string,
    }

    export function enqueueSignup(signup: Signup): SignupResponse {
        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            method: "post",
            headers: {
                "X-api-key": Secrets.signupService.apiKey,
                "Content-Type": "application/json"
            },
            payload: JSON.stringify(signup)
        };
        const response = UrlFetchApp.fetch(Secrets.signupService.enqueueUrl, options);
        return {
            code: response.getResponseCode(),
            message: response.getContentText()
        }
    }
}
