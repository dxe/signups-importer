namespace Main {
    // Import GoogleAppsScript types
    // Do not try to import types from namespaces defined in this project. See README for details.
    import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
    import Sheet = GoogleAppsScript.Spreadsheet.Sheet;

    export class SignupsImporter {
        private readonly config = Configuration.config;

        getActiveSpreadsheet(): Spreadsheet {
            return SpreadsheetApp.getActiveSpreadsheet();
        }

        getActiveSheet(): Sheet {
            return this.getActiveSpreadsheet().getActiveSheet();
        }

        public normalizeChuffed() {
            const normalizer = new ListNormalization.ColumnSpecNormalizer(
                new Chuffed.ChuffedColumnSpec(), this.getActiveSheet(), this.getActiveSpreadsheet());
            return normalizer.normalize();
        }

        public importActiveSheet() {
            function signupHandler(signup: SignupService.Signup) {
                const response = SignupService.enqueueSignup(signup)
                if (response.code === 200) {
                    return `${this.config.rowStatusOkPrefix} ${response.message}`
                } else {
                    return `Code: ${response.code}; msg: ${response.message}`
                }
            }

            SignupsProcessor.processSignups(
                new GoogleSheetsSignups.GoogleSheetSignupQueue(
                    this.getActiveSheet(),
                    this.config.statusColumnName,
                    this.config.timestampColumnName,
                ),
                signupHandler,
            )
        }

        public importActiveSheetDryRun() {
            function logHandler(signup: SignupService.Signup) {
                console.log(signup)
                return `${this.config.rowStatusOkPrefix} logged`
            }

            SignupsProcessor.processSignups(
                new GoogleSheetsSignups.GoogleSheetSignupQueue(
                    this.getActiveSheet(),
                    this.config.dryRunStatusColumnName,
                    this.config.dryRuntimestampColumnName,
                ),
                logHandler,
            )
        }

        public computeAndLogSummary() {
            console.log(new GoogleSheetsSignups.GoogleSheetSignupQueue(
                this.getActiveSheet(),
                this.config.statusColumnName,
                this.config.timestampColumnName,
            ).computeSummary());
        }
    }
}

function NormalizeChuffed() {
    (new Main.SignupsImporter()).normalizeChuffed()
}
function ImportActiveSheetDryRun() {
    (new Main.SignupsImporter()).importActiveSheetDryRun()
}
function ImportActiveSheet() {
    (new Main.SignupsImporter()).importActiveSheet()
}
function ComputeAndLogSummary() {
    (new Main.SignupsImporter()).computeAndLogSummary()
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Signups Importer')
        .addItem('Normalize Chuffed list', 'NormalizeChuffed')
        .addItem('Start/continue dry-run', 'ImportActiveSheetDryRun')
        .addItem('Start/continue import to Signup Service', 'ImportActiveSheet')
        .addToUi();
}
