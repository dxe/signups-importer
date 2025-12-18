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

        private signupHandler(signup: SignupService.Signup) {
            const response = SignupService.enqueueSignup(signup)
            if (response.code === 200) {
                return `${Configuration.config.statusPrefixes.ok} ${response.message}`
            } else {
                return `Code: ${response.code}; msg: ${response.message}`
            }
        }

        importActiveSheet(limit: number) {
            SignupsProcessor.processSignups(
                new GoogleSheetsSignups.GoogleSheetSignupQueue(
                    this.getActiveSheet(),
                    Configuration.config.statusColumnName,
                    Configuration.config.timestampColumnName,
                ),
                this.signupHandler,
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
                this.validateAndLogHandler,
                limit,
            )
        }

        private validateAndLogHandler(signup: SignupService.Signup) {
            const result = SignupValidation.validateDryRun(signup);
            if (result.level === 'error' && result.message) {
                return `${Configuration.config.statusPrefixes.error} ${result.message}`;
            }
            if (result.level === 'warn' && result.message) {
                return `${Configuration.config.statusPrefixes.warn} ${result.message}`;
            }
            console.log(signup);
            return `${Configuration.config.statusPrefixes.ok} logged`;
        }

        computeAndLogSummary() {
            console.log(new GoogleSheetsSignups.GoogleSheetSignupQueue(
                this.getActiveSheet(),
                Configuration.config.statusColumnName,
                Configuration.config.timestampColumnName,
            ).computeSummary());
        }

        computeAndLogSummaryDryRun() {
            console.log(new GoogleSheetsSignups.GoogleSheetSignupQueue(
                this.getActiveSheet(),
                Configuration.config.dryRunStatusColumnName,
                Configuration.config.dryRunTimestampColumnName,
            ).computeSummary());
        }
    }
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
function ComputeAndLogSummary() {
    (new Main.SignupsImporter()).computeAndLogSummary()
}
function ComputeAndLogSummaryDryRun() {
    (new Main.SignupsImporter()).computeAndLogSummaryDryRun()
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
            ui.createMenu("Import normalized list")
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
                    ui.createMenu("Send to Signup Service")
                        .addItem('Next 1 item', 'StartOrContinueImportToSignupService1')
                        .addItem('Next 5 items', 'StartOrContinueImportToSignupService5')
                        .addItem('Next 100 items', 'StartOrContinueImportToSignupService100')
                        .addItem('Next 1000 items', 'StartOrContinueImportToSignupService1000')
                )
        )
        .addSubMenu(
            ui.createMenu('Compute summary and log')
                .addItem('Dry-run', 'ComputeAndLogSummaryDryRun')
                .addItem('Prod/live', 'ComputeAndLogSummary')
        )
        .addSubMenu(
            ui.createMenu('About')
                .addItem('Project homepage', 'OpenAboutDialog')
        )
        .addToUi();
}

function OpenAboutDialog() {
    const html = HtmlService.createHtmlOutput(
        '<div style="font-size:14px;line-height:1.6">' +
        '<p>Visit the project homepage:</p>' +
        '<p><a href="https://github.com/dxe/signups-importer" target="_blank">https://github.com/dxe/signups-importer</a></p>' +
        '</div>'
    ).setWidth(420).setHeight(140);
    SpreadsheetApp.getUi().showModalDialog(html, 'About Signups Importer');
}
