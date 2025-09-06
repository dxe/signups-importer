namespace SignupsProcessor {
    export type SignupHandlerFunc = (payload: SignupService.Signup) => string;

    export type SignupQueue = {
        getUnprocessedSignups(): Generator<SignupService.Signup>
        recordStatus(status: string)
    }

    export function processSignups(
        queue: SignupQueue,
        handler: SignupHandlerFunc,
    ) {
        let count = 0;
        for (const signup of queue.getUnprocessedSignups()) {
            let status: string;
            try {
                status = handler(signup);
            } catch (e) {
                status = String(e)
            }
            queue.recordStatus(status);
            count++;

            // Quit before Google Apps Script execution times out.
            if (count >= 5) {
                return;
            }
        }
    }
}
