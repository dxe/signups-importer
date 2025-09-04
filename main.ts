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

}

function ImportActiveSheet() {

}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Signups Importer')
        .addItem('Normalize Chuffed list', 'NormalizeChuffed')
        .addItem('Import dry-run', 'ImportActiveSheetDryRun')
        .addItem('Import active sheet to Signup Service', 'ImportActiveSheet')
        .addToUi();
}
