namespace SignupsProcessor {
    export type SignupBatchHandlerFunc = (signups: SignupService.Signup[]) => string[];

    // Interface for a queue of signups that allows retrieving items in the queue and updating their status.
    export type SignupQueue = {
        getUnprocessedSignups(): Generator<{ signup: SignupService.Signup, rowIndex: number }>
        recordStatuses(results: Array<{ rowIndex: number, status: string }>): void
    }

    const BATCH_SIZE = 20;

    // Processes a limited range of signups using the provided processing handler function.
    // The limit is useful to avoid execution timeouts in Google Apps Script.
    export function processSignups(
        queue: SignupQueue,
        handler: SignupBatchHandlerFunc,
        limit: number
    ) {
        let count = 0;
        const gen = queue.getUnprocessedSignups();

        while (count < limit) {
            const batchSize = Math.min(BATCH_SIZE, limit - count);
            const batch: Array<{ signup: SignupService.Signup, rowIndex: number }> = [];

            for (let i = 0; i < batchSize; i++) {
                const next = gen.next();
                if (next.done) break;
                batch.push(next.value);
            }

            if (batch.length === 0) break;

            let statuses: string[];
            try {
                statuses = handler(batch.map(b => b.signup));
            } catch (e) {
                statuses = batch.map(() => String(e));
            }

            queue.recordStatuses(batch.map((b, i) => ({
                rowIndex: b.rowIndex,
                status: statuses[i] ?? `Error: no status returned`,
            })));

            count += batch.length;
        }
    }
}
