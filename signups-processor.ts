namespace SignupsProcessor {
    export type SignupHandlerFunc = (signup: SignupService.Signup) => string;

    // Interface for a queue of signups that allows retrieving items in the queue and updating their status.
    export type SignupQueue = {
        getUnprocessedSignups(): Generator<SignupService.Signup>
        recordStatus(status: string)
    }

    // Processes a limited range of signups using the provided processing handler function.
    export function processSignups(
        queue: SignupQueue,
        handler: SignupHandlerFunc,
        limit: number
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
            if (count >= limit) {
                return;
            }
        }
    }
}
