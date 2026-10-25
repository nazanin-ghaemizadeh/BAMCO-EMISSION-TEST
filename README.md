# BAMCO Emission Test Register

A single register page with the requested columns: Test ID, Date, Vehicle,
Project, Repeat / original test, Status, Action.

Navigation colors and the active button treatment follow BAMCO Paint Shop.
Create Test opens the complete record form. Open, Edit and Delete each open
a record window; all 18 sections use the same two-column label/value layout.
All 163 existing field definitions and saved record properties are retained.

Pass shows a green smiling face. Fail shows a red crying face. Records without
an entered or assessable result show Not assessed. Synthetic examples do not
receive invented compliance results.

The page loads only demo-data.js, form-schema.js and register.js. It has no
dashboards, analytics controls, accounts, import/export menus or sidebars.

## Storage

The register uses the existing bamco-emission-sheets-v1 localStorage key and
keeps compatibility with the older browser key. Existing local attachments
remain in the bamco-emission-files IndexedDB store. Changes commit only on Save.
Concurrent edits to the same test are rejected rather than overwritten.
Deleted records are retained in a separate browser archive.

This simplified interface stores records in the current browser. Existing
central database objects and records were not deleted or modified by this
interface change; earlier integration source remains in the repository.

## Validation

Verified creation, save, reopen/edit, both Pass/Fail faces, delete review and
deletion of a temporary QA record. Verified identical label/value column widths
in all 18 sections on desktop and mobile. The mobile page fits its viewport;
the seven-column register scrolls within its own container.
