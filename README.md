# Signups Importer

Project to import signups / emails in Google Sheets into DxE Signup service using Google Apps Script.

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

// TODO: below does not apply yet, until we make a models.gs file:
Then, in the Apps Script editor UI, click the "..." next to "models.gs" and
click "Move file up" and repeat this until it appears above all other `.gs`
files. This is necessary because other files import types from this file as
soon as they load.

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
export const config = {
    signupServiceEnqueueUrl: "<URL OF SIGNUP SERVICE /enqueue ENDPOINT>",
    signupServiceApiKey: "<YOUR API KEY>",
}
```

If using the devcontainer, the `rootDir` will be correct. Otherwise, use
the path to the root of this repo on your machine.

Now you can deploy using the instructions under the "Deploy" section of this
README.

Use the `<...todo...>` menu created by this sheet to set up a new sheet.

See the comments in `<...todo...>.ts` for detailed usage instructions.
