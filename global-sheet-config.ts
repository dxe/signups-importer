namespace Configuration {
    // Status levels for row processing state
    export type StatusLevel = 'ok' | 'warn' | 'error';

    export const config = {
        statusPrefixes: {
            ok: "OK:",
            warn: "WARN:",
            error: "ERROR:",
        } as Record<StatusLevel, string>,
        statusColumnName: "Import status",
        timestampColumnName: "Import status timestamp",
        dryRunStatusColumnName: "Dry run status",
        dryRunTimestampColumnName: "Dry run status timestamp",
    };
}
