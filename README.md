# Signups Importer

Project to import signups / emails in Google Sheets into DxE Signup service using Google Apps Script.

## Usage

The standard workflow for importing emails with this Apps Script project involves manually calling functions in a
particular order.

The functions can be called either from the "Signups Importer" menu in Google Sheets UI, or in Google Apps Script
editor. Only the latter will show you details printed to the console.

To use the Apps Script editor, click Extentions -> Apps Script, open `main.go`, select the desired function from the
dropdown and click the "Debug" button. The logs will appear at the bottom of the screen.

Here is the workflow:

1. Import data into sheet
2. Normalize data by either:
   - Using normalization code (using existing functionality under `Normalize list` or adding new list types in the
     list-formats directory), or
   - Manually renaming columns and correcting data issues
3. Perform a dry-run with `Import normalized list` -> `Dry-run`. You may see validation warnings in the status column
   for some structurally invalid emails. Run from Apps Script editor to preview the signup request payloads. 
4. If there are too many results to easily see on the screen, `Compute summary` -> `For dry-run`.
4. Import data for real with `Import normalized list` -> `Send to Signup service`.
5. Again if there are too many results to easily see, `Compute summary` -> `For prod/live`.

## Development

This project uses namespaces instead of module imports due to a limitation of Clasp:
https://github.com/google/clasp/blob/master/docs/typescript.md#the-namespace-statement-workaround

Note in VS Code, all related files need to be open in the editor to avoid errors in the editor. The TypeScript compiler
will still compile the files regardless.

### Google Apps Script namespace issues

Do not try to import types at the namespace level from other namespaces defined in this project: Google Apps Script will
error out when it loads the files in alphabetical order, executing files before necessarily loading other files it
depends on.

```typescript
// A.ts

namespace A {
    import Bfoo = B.Bfoo  // Do not do this. File `B.ts` will not be loaded yet when this runs.

    function x() {
        new B.Bfoo();  // This is OK. Just need to fully-qualify imported types with each use.
    }
}

// B.ts

namespace B {
    class Bfoo {}
}
```

## Build

Install dependencies:

```bash
npm i
```

## Deploy

Make sure you're logged in.

```bash
npx clasp login
```

Push according to .clasp.json

```bash
npx clasp push
```

## Initial setup

Create a spreadsheet and click Extensions -> Apps Script to create an
Apps Script project. Note the spreadsheet ID from the URL of the spredsheet
and note the script ID from the URL of the Apps Script editor.

Create a file called `.clasp.json` in this project with the contents below making
the required substitutions.

```json
{
    "rootDir":"/workspaces/signups-importer",
    "scriptId":"<APPS SCRIPT PROJECT ID HERE>",
    "parentId":["<SPREADSHEET ID HERE>"]
}
```

Create an additional file called `secrets.ts` in this project with the contents below making the required substitutions.

```typescript
namespace Secrets{
    export const signupService = {
        enqueueUrl: "<URL OF SIGNUP SERVICE /enqueue ENDPOINT>",
        apiKey: "<YOUR API KEY>",
    }
}

```

If using the devcontainer, the `rootDir` will be correct. Otherwise, use
the path to the root of this repo on your machine.

Now you can deploy using the instructions under the "Deploy" section of this
README.

Use the `Signups Importer` menu created by this sheet to set up a new sheet.

See the comments in `<...todo...>.ts` for detailed usage instructions.
