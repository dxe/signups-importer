namespace Main {
    // Import GoogleAppsScript types
    // Do not try to import types from namespaces defined in this project. See README for details.
    import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
    import Sheet = GoogleAppsScript.Spreadsheet.Sheet;

    export class SignupsImporter {
        private getActiveSpreadsheet(): Spreadsheet {
            return SpreadsheetApp.getActiveSpreadsheet();
        }

        private getActiveSheet(): Sheet {
            return this.getActiveSpreadsheet().getActiveSheet();
        }

        normalizeChuffed() {
            const normalizer = new ListNormalization.ColumnSpecNormalizer(
                new Chuffed.ChuffedColumnSpec(), this.getActiveSheet(), this.getActiveSpreadsheet());
            return normalizer.normalize();
        }

        private signupBatchHandler(signups: SignupService.Signup[]): string[] {
            const responses = SignupService.enqueueSignups(signups);
            return responses.map(response => {
                if (response.code === 200) {
                    return `${Configuration.config.statusPrefixes.ok} ${response.message}`;
                }
                return `Code: ${response.code}; msg: ${response.message}`;
            });
        }

        importActiveSheet(limit: number) {
            SignupsProcessor.processSignups(
                new GoogleSheetsSignups.GoogleSheetSignupQueue(
                    this.getActiveSheet(),
                    Configuration.config.statusColumnName,
                    Configuration.config.timestampColumnName,
                ),
                this.signupBatchHandler,
                limit,
            )
        }

        importActiveSheetDryRun(limit: number) {
            SignupsProcessor.processSignups(
                new GoogleSheetsSignups.GoogleSheetSignupQueue(
                    this.getActiveSheet(),
                    Configuration.config.dryRunStatusColumnName,
                    Configuration.config.dryRunTimestampColumnName,
                ),
                this.validateAndLogBatchHandler,
                limit,
            )
        }

        private validateAndLogBatchHandler(signups: SignupService.Signup[]): string[] {
            return signups.map(signup => {
                const result = SignupValidation.validateDryRun(signup);
                if (result.level === 'error' && result.message) {
                    return `${Configuration.config.statusPrefixes.error} ${result.message}`;
                }
                if (result.level === 'warn' && result.message) {
                    return `${Configuration.config.statusPrefixes.warn} ${result.message}`;
                }
                console.log(signup);
                return `${Configuration.config.statusPrefixes.ok} logged`;
            });
        }

        showSummaryForProdLive() {
            const summary = new GoogleSheetsSignups.GoogleSheetSignupQueue(
                this.getActiveSheet(),
                Configuration.config.statusColumnName,
                Configuration.config.timestampColumnName,
            ).computeSummary();
            ShowHtmlDialog('Summary (Prod/live)', `<p>${summary}</p>`);
        }

        showSummaryDryRun() {
            const summary = new GoogleSheetsSignups.GoogleSheetSignupQueue(
                this.getActiveSheet(),
                Configuration.config.dryRunStatusColumnName,
                Configuration.config.dryRunTimestampColumnName,
            ).computeSummary();
            ShowHtmlDialog('Summary (Dry-run)', `<p>${summary}</p>`);
        }

        checkEmails() {
            const result = SignupValidation.findInvalidEmails(this.getActiveSheet());
            if ('error' in result) {
                SpreadsheetApp.getUi().alert(result.error);
                return;
            }
            const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            let innerHtml: string;
            if (result.length === 0) {
                innerHtml = '<p>All emails are valid!</p>';
            } else {
                const limitNote = result.length >= 1000
                    ? '<p style="color:#888;font-size:12px">Showing first 1000 invalid emails.</p>'
                    : `<p>${result.length} invalid email${result.length === 1 ? '' : 's'} found:</p>`;
                const items = result.map(({ row, email }) =>
                    `<li>Row ${row}: ${escapeHtml(email)}</li>`
                ).join('');
                innerHtml = `${limitNote}<ul style="margin:4px 0 0 16px;padding:0">${items}</ul>`;
            }
            ShowHtmlDialog('Check Emails', innerHtml, 400);
        }

        createColumnsInCurrentSheet() {
            const FIELDS = GoogleSheetsSignups.GoogleSheetSignupQueue.FIELD_NAMES;
            const cfg = Configuration.config;
            const headers = [
                cfg.dryRunStatusColumnName,
                cfg.dryRunTimestampColumnName,
                cfg.statusColumnName,
                cfg.timestampColumnName,
                FIELDS.SOURCE,
                FIELDS.FIRST_NAME,
                FIELDS.LAST_NAME,
                FIELDS.EMAIL,
                FIELDS.DRIP_SELECTOR,
            ];
            const sheet = this.getActiveSheet();
            sheet.insertColumnsBefore(1, headers.length);
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        }
    }
}

function ShowColumnNamesDialog() {
    const names = Object.values(GoogleSheetsSignups.GoogleSheetSignupQueue.FIELD_NAMES);
    const items = names.map(n => `<li>${n}</li>`).join('');
    ShowHtmlDialog(
        'Available Column Names',
        `<p>The following column names are recognized:</p><ul style="margin:4px 0 0 16px;padding:0">${items}</ul>` +
        '<p style="margin-top:8px;font-size:12px;color:#555">Columns not in this list must be prefixed with <code>.</code> to be ignored.</p>'
    );
}

function OpenAboutDialog() {
    ShowHtmlDialog(
        'About Signups Importer',
        '<p>Visit the project homepage:</p>' +
        '<p><a href="https://github.com/dxe/signups-importer" target="_blank">https://github.com/dxe/signups-importer</a></p>'
    );
}

function ShowHtmlDialog(title: string, innerHtml: string, height = 160) {
    const html = HtmlService.createHtmlOutput(
        '<div style="font-size:14px;line-height:1.6">' + innerHtml + '</div>'
    ).setWidth(420).setHeight(height);
    SpreadsheetApp.getUi().showModalDialog(html, title);
}

function NormalizeChuffedList() {
    (new Main.SignupsImporter()).normalizeChuffed()
}
function StartOrContinueDryRun1() {
    (new Main.SignupsImporter()).importActiveSheetDryRun(1)
}
function StartOrContinueDryRun5() {
    (new Main.SignupsImporter()).importActiveSheetDryRun(5)
}
function StartOrContinueDryRun100() {
    (new Main.SignupsImporter()).importActiveSheetDryRun(100)
}
function StartOrContinueDryRun1000() {
    (new Main.SignupsImporter()).importActiveSheetDryRun(1000)
}
function StartOrContinueDryRun10000() {
    (new Main.SignupsImporter()).importActiveSheetDryRun(10000)
}
function StartOrContinueImportToSignupService1() {
    (new Main.SignupsImporter()).importActiveSheet(1)
}
function StartOrContinueImportToSignupService5() {
    (new Main.SignupsImporter()).importActiveSheet(5)
}
function StartOrContinueImportToSignupService100() {
    (new Main.SignupsImporter()).importActiveSheet(100)
}
function StartOrContinueImportToSignupService1000() {
    (new Main.SignupsImporter()).importActiveSheet(1000)
}
function ShowSummaryForProdLive() {
    (new Main.SignupsImporter()).showSummaryForProdLive()
}
function ShowSummaryForDryRun() {
    (new Main.SignupsImporter()).showSummaryDryRun()
}
function CreateColumnsInCurrentSheet() {
    (new Main.SignupsImporter()).createColumnsInCurrentSheet()
}
function CheckEmails() {
    (new Main.SignupsImporter()).checkEmails()
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('Signups Importer')
        .addSubMenu(
            // Allow user to normalize a list and review the result before importing to mailing list.
            ui.createMenu("Normalize list")
                .addItem('Normalize Chuffed list', 'NormalizeChuffedList') // normalize lists from Chuffed donation platform
        )
        .addSubMenu(
            ui.createMenu('Validate')
                .addItem('Check emails', 'CheckEmails')
        )
        .addSubMenu(
            // Allow user to test processing of a normalized sheet without actually importing. This is useful
            // for development as well as avoiding partially successful imports.
            ui.createMenu("Dry-run")
                .addItem('Next 1 item', 'StartOrContinueDryRun1')
                .addItem('Next 5 items', 'StartOrContinueDryRun5')
                .addItem('Next 100 items', 'StartOrContinueDryRun100')
                .addItem('Next 1000 items', 'StartOrContinueDryRun1000')
                .addItem('Next 10000 items', 'StartOrContinueDryRun10000')
        )
        .addSubMenu(
            ui.createMenu("Send to Signup service")
                .addItem('Next 1 item', 'StartOrContinueImportToSignupService1')
                .addItem('Next 5 items', 'StartOrContinueImportToSignupService5')
                .addItem('Next 100 items', 'StartOrContinueImportToSignupService100')
                .addItem('Next 1000 items', 'StartOrContinueImportToSignupService1000')
        )
        .addSubMenu(
            ui.createMenu('Compute summary')
                .addItem('For dry-run', 'ShowSummaryForDryRun')
                .addItem('For prod/live', 'ShowSummaryForProdLive')
        )
        .addSubMenu(
            ui.createMenu('About')
                .addItem('Project homepage', 'OpenAboutDialog')
                .addItem('Available column names', 'ShowColumnNamesDialog')
        )
        .addItem('Create columns in current sheet', 'CreateColumnsInCurrentSheet')
        .addToUi();
}
