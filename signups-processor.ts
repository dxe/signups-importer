namespace SignupsProcessor {
    export type SignupHandlerFunc = (payload: SignupService.Signup) => string;

    export type SignupQueue = {
        getSignups(): Generator<SignupService.Signup>
        recordStatus(status: string)
    }

    export function processSignups(
        queue: SignupQueue,
        handler: SignupHandlerFunc,
    ) {
        for (const signup of queue.getSignups()) {
            let status: string;
            try {
                status = handler(signup);
            } catch (e) {
                status = String(e)
            }
            queue.recordStatus(status);
        }
    }
}
