/// <reference path="../signups-service.ts" />
/// <reference path="../signups-processor.ts" />

import { describe, it, expect, vi } from 'vitest';

function makeQueue(signups: SignupService.Signup[]): SignupsProcessor.SignupQueue & { recorded: Array<{ rowIndex: number; status: string }> } {
    const recorded: Array<{ rowIndex: number; status: string }> = [];
    return {
        recorded,
        *getUnprocessedSignups() {
            for (let i = 0; i < signups.length; i++) {
                yield { signup: signups[i], rowIndex: i + 1 };
            }
        },
        recordStatuses(results) {
            recorded.push(...results);
        },
    };
}

const signup = (email: string): SignupService.Signup => ({
    email,
    source: 'test',
    drip_selector: '',
});

describe('processSignups', () => {
    it('passes signups to handler and records returned statuses', () => {
        const queue = makeQueue([signup('a@test.com'), signup('b@test.com')]);

        SignupsProcessor.processSignups(queue, (batch) => batch.map(() => 'ok'), 10);

        expect(queue.recorded).toEqual([
            { rowIndex: 1, status: 'ok' },
            { rowIndex: 2, status: 'ok' },
        ]);
    });

    it('respects the limit', () => {
        const queue = makeQueue([1, 2, 3, 4, 5].map((i) => signup(`u${i}@test.com`)));

        SignupsProcessor.processSignups(queue, (batch) => batch.map(() => 'ok'), 3);

        expect(queue.recorded).toHaveLength(3);
    });

    it('records error string when handler throws', () => {
        const queue = makeQueue([signup('a@test.com')]);

        SignupsProcessor.processSignups(queue, () => { throw new Error('handler exploded'); }, 10);

        expect(queue.recorded[0].status).toContain('handler exploded');
    });

    it('records fallback message when handler returns too few statuses', () => {
        const queue = makeQueue([signup('a@test.com'), signup('b@test.com')]);

        SignupsProcessor.processSignups(queue, () => ['only-one'], 10);

        expect(queue.recorded[1].status).toContain('no status returned');
    });

    it('does nothing with an empty queue', () => {
        const queue = makeQueue([]);
        const handler = vi.fn(() => []);

        SignupsProcessor.processSignups(queue, handler, 10);

        expect(handler).not.toHaveBeenCalled();
        expect(queue.recorded).toHaveLength(0);
    });
});
