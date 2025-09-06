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
                return `${Configuration.config.rowStatusOkPrefix} ${response.message}`
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
                this.logHandler,
                limit,
            )
        }

        private logHandler(signup: SignupService.Signup) {
            console.log(signup)
            return `${Configuration.config.rowStatusOkPrefix} logged`
        }

        computeAndLogSummary() {
            console.log(new GoogleSheetsSignups.GoogleSheetSignupQueue(
                this.getActiveSheet(),
                Configuration.config.statusColumnName,
                Configuration.config.timestampColumnName,
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
function StartOrContinueImportToSignupService1() {
    (new Main.SignupsImporter()).importActiveSheet(1)
}
function StartOrContinueImportToSignupService5() {
    (new Main.SignupsImporter()).importActiveSheet(5)
}
function StartOrContinueImportToSignupService100() {
    (new Main.SignupsImporter()).importActiveSheet(100)
}
function ComputeAndLogSummary() {
    (new Main.SignupsImporter()).computeAndLogSummary()
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('Signups Importer')
        .addItem('Normalize Chuffed list', 'NormalizeChuffedList')

        .addSubMenu(
            ui.createMenu("Dry-run")
                .addItem('Next 1 item', 'StartOrContinueDryRun1')
                .addItem('Next 5 items', 'StartOrContinueDryRun5')
                .addItem('Next 100 items', 'StartOrContinueDryRun100')
        )
        .addSubMenu(
            ui.createMenu("Send to Signup Service")
                .addItem('Next 1 item', 'StartOrContinueImportToSignupService1')
                .addItem('Next 5 items', 'StartOrContinueImportToSignupService5')
                .addItem('Next 100 items', 'StartOrContinueImportToSignupService100')
        )
        .addItem('Compute and log summary', 'ComputeAndLogSummary')
        .addToUi();
}
