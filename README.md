# BAMCO Emission Test Engineering

Eighteen collapsible sections are the single source for a complete test record.
The register and eight analytics/report views read the same records.
No build is required. GitHub Pages serves the root of main.

## Device and central records

Ten labelled synthetic examples are available in device mode.
Drafts use localStorage and local attachments use IndexedDB.

Open **Storage, sign-in & backups**, sign in with a BAMCO account, then select
**Central records**. The system manager grants the **آزمون آلایندگی / emissionTests**
feature through existing comprehensive user management.

Use **Save to central database** to commit a draft. Central dashboards refresh
every 30 seconds while visible and no draft is pending. **Reload Central Records**
refreshes explicitly. A stale revision is rejected; export the pending draft
before refreshing and compare it with the latest record.

Device and central records remain separate. **Copy Selected Test to Central**
copies a device record and available files without replacing an existing ID.
Repeated tests receive a new UUID-based ID linked to the original test.

## Measurements, documents and reports

Raw laboratory measurements remain separate from corrected values. No
regulatory limits are assumed: enter the amendment, units, limits and calculation
method applicable to the specific test.

Upload files in section 17. For a driving trace, select **Speed trace** and attach
a CSV with columns **time_s,target_kmh,actual_kmh**.

Central attachments are private; maximum file size is 50 MB. Local attachments
are not embedded in JSON backups, so retain the original files.

Reports includes Excel, CSV and a printable report with **Print / Save PDF**.
Server history records authenticated actor IDs, timestamps, revisions and
before/after snapshots. Device history is explicitly unverified.

## Database and validation

emission-schema.sql records the applied migration in the existing BAMCO database.
Tables use RLS and the attachment bucket is private. The frontend contains only
a publishable key. Triggers enforce immutable IDs, actors, timestamps and revisions.

Validated JavaScript syntax, record editing and connected dashboards, all
analysis views, and a rolled-back database insert/update/audit test.
Unauthorized writes were denied.
