namespace Main {
    import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
    import Sheet = GoogleAppsScript.Spreadsheet.Sheet;
    import ColumnSpecNormalizer = ListNormalization.ColumnSpecNormalizer;
    import GoogleSheetSignupQueue = GoogleSheetsSignups.GoogleSheetSignupQueue;
    import processSignups = SignupsProcessor.processSignups;
    import enqueueSignup = SignupService.enqueueSignup;
    import Signup = SignupService.Signup;

    function getActiveSpreadsheet(): Spreadsheet {
        return SpreadsheetApp.getActiveSpreadsheet();
    }

    function getActiveSheet(): Sheet {
        return getActiveSpreadsheet().getActiveSheet();
    }

    export function normalizeChuffed() {
        const normalizer = new ColumnSpecNormalizer(
            new Chuffed.ChuffedColumnSpec(), getActiveSheet(), getActiveSpreadsheet());
        return normalizer.normalize();
    }

    export function importActiveSheetDryRun() {
        function logHandler(signup: Signup) {
            console.log(signup)
            return "OK"
        }

        processSignups(
            new GoogleSheetSignupQueue(
                getActiveSheet(),
                "Dry run status",
                "Last dry run status update",
            ),
            logHandler,
        )
    }

    export function importActiveSheet() {
        function signupHandler(signup: Signup) {
            enqueueSignup(signup)
            return "OK"
        }

        processSignups(
            new GoogleSheetSignupQueue(
                getActiveSheet(),
                "Import status",
                "Last status update",
            ),
            signupHandler,
        )
    }

    export function computeAndLogSummary() {
        console.log(new GoogleSheetSignupQueue(
            getActiveSheet(),
            "Import status",
            "Last status update",
        ).computeSummary());
    }
}

function NormalizeChuffed() {
    Main.normalizeChuffed()
}
function ImportActiveSheetDryRun() {
    Main.importActiveSheetDryRun()
}
function ImportActiveSheet() {
    Main.importActiveSheet()
}
function ComputeAndLogSummary() {
    Main.computeAndLogSummary()
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Signups Importer')
        .addItem('Normalize Chuffed list', 'NormalizeChuffed')
        .addItem('Start/continue dry-run', 'ImportActiveSheetDryRun')
        .addItem('Start/continue import to Signup Service', 'ImportActiveSheet')
        .addToUi();
}
