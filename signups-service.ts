namespace SignupsService {
    // Corresponds to Signup defined in
    // https://github.com/dxe/signups-worker/blob/main/main.go
    export type Signup = {
        source: string,
        name: string,
        email: string,
        phone?: string,
        zip?: string,
        country?: string,
        donation_type?: string,
        donation_amount?: string,
        donation_date?: string,
    };

    export function enqueueSignup(payload: Signup) {
        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            method: "post",
            headers: {
                "X-api-key": Secrets.signupService.apiKey,
                "Content-Type": "application/json"
            },
            payload: JSON.stringify(payload)
        };
        const response = UrlFetchApp.fetch(Secrets.signupService.enqueueUrl, options);
        console.log(response.getResponseCode());
        console.log(response.getContentText());
    }
}
