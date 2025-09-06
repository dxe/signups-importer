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

        importActiveSheet() {
            SignupsProcessor.processSignups(
                new GoogleSheetsSignups.GoogleSheetSignupQueue(
                    this.getActiveSheet(),
                    Configuration.config.statusColumnName,
                    Configuration.config.timestampColumnName,
                ),
                this.signupHandler,
            )
        }

        importActiveSheetDryRun() {
            SignupsProcessor.processSignups(
                new GoogleSheetsSignups.GoogleSheetSignupQueue(
                    this.getActiveSheet(),
                    Configuration.config.dryRunStatusColumnName,
                    Configuration.config.dryRunTimestampColumnName,
                ),
                this.logHandler,
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
function StartOrContinueDryRun() {
    (new Main.SignupsImporter()).importActiveSheetDryRun()
}
function StartOrContinueImportToSignupService() {
    (new Main.SignupsImporter()).importActiveSheet()
}
function ComputeAndLogSummary() {
    (new Main.SignupsImporter()).computeAndLogSummary()
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Signups Importer')
        .addItem('Normalize Chuffed list', 'NormalizeChuffedList')
        .addItem('Start/continue dry-run', 'StartOrContinueDryRun')
        .addItem('Start/continue import to Signup Service', 'StartOrContinueImportToSignupService')
        .addItem('Compute and log summary', 'ComputeAndLogSummary')
        .addToUi();
}
