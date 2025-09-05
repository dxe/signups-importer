namespace Main {

}

function getActiveSpreadsheet() {
    return SpreadsheetApp.getActiveSpreadsheet();
}

function getActiveSheet() {
    return getActiveSpreadsheet().getActiveSheet();
}

function NormalizeChuffed() {
    const chuffedList = new Chuffed.ChuffedList(getActiveSheet(), getActiveSpreadsheet());
    chuffedList.normalize();
}

function ImportActiveSheetDryRun() {
    SignupsProcessor.processSignups(getActiveSheet(), console.log, "Import status")
}

function ImportActiveSheet() {
    SignupsProcessor.processSignups(getActiveSheet(), SignupsService.enqueueSignup, "Dry run status")
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Signups Importer')
        .addItem('Normalize Chuffed list', 'NormalizeChuffed')
        .addItem('Start/continue dry-run', 'ImportActiveSheetDryRun')
        .addItem('Start/continue import to Signup Service', 'ImportActiveSheet')
        .addToUi();
}
