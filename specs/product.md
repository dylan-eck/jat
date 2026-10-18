# jat: Product Spec

## Problem

Job seekers juggle many applications at once, each at a different point in a
different hiring process. Keeping track of them in a spreadsheet or Notion
takes a lot of setup and upkeep, because those tools are built for general use,
not this job. So many people track nothing, and they lose sight of where they
applied, what they sent, and what they need to do next.

jat gives job seekers one ready-made place to see every active application and
where it stands, along with the materials used (resume, cover letter), each
interview, and what needs attention next.

## Users

- **Job seeker** (the only user type in v1): anyone actively applying for
  jobs. Each user works alone. Their data is private to them and no one else
  can see it.

## Core concepts

- **Application**: one job a user is pursuing. Fields:
  - Company (required)
  - Role title (required)
  - Job posting URL
  - Date applied
  - Status: `Active` or `Closed` (required, defaults to `Active`)
  - Close reason (only when Closed): `Accepted offer`, `Rejected`,
    `Withdrawn`, `Ghosted`
  - Stage: one of the user's stages (required)
  - Resume: a resume-type document from the library (optional, so wishlist
    entries can be saved before applying)
  - Cover letter: a cover-letter-type document from the library (optional)
  - Location and work arrangement (onsite / hybrid / remote)
  - Salary range
  - Contact person / referral
  - Notes (free-form)
  - Next action + due date
- **Stage**: a broad step in the pipeline, customizable per user. Status and
  stage are independent: a closed application keeps the stage it ended at.
  Default stages for a new user: `Wishlist`, `Applied`, `Interviewing`, `Offer`.
- **Stage history**: a dated record of every stage and status change on an
  application. Each entry stores a snapshot of the stage names (and status,
  close reason) at the time of the change, not a reference to the current
  stage. Later renaming or deleting a stage never rewrites or erases history.
- **Interview**: any number per application, capturing each company's
  specific process. Fields: name/type (e.g. "Take-home", "Onsite round 2"),
  date and time, interviewer name(s), format (phone / video / onsite), outcome
  (pending / passed / failed), notes.
- **Document**: a PDF in the user's library with a user-given name and a type,
  `Resume` or `Cover letter`, chosen at upload. One document can be used by
  many applications. The file and type are immutable once uploaded: a revised
  resume is uploaded as a new document, so earlier applications keep pointing
  at exactly what was sent. Only the name can be edited.
- **Time zone**: each user has a time zone setting, detected from the browser
  at first sign-in and editable in settings. All date logic ("today",
  overdue, upcoming) uses it. Interview times are entered and displayed in the
  user's time zone and stored as absolute instants (UTC). Next-action due dates
  are calendar dates with no time of day.
- **Activity**: a meaningful change to an application or its interviews.
  Each application has a "last activity" timestamp, used to decide whether it
  is stale. These count as activity:
  - Creating the application
  - Saving the application with at least one changed field (including stage,
    status, close reason, document selection, next action set, completed, or
    cleared)
  - Adding an interview, saving an interview with at least one changed field,
    or deleting an interview

  These do **not** count: saving with no changed values; renaming, reordering,
  adding, or deleting stages; uploading, renaming, or deleting library
  documents; changing settings; viewing or exporting.

## User stories and acceptance criteria

### Accounts and privacy

**US-1. As a job seeker, I want to sign in so that my applications are saved
to my account.**

- Given I am signed out, when I visit any app page, then I am sent to the
  sign-in page.
- Given I am on the sign-in page, when I sign in with a magic link or GitHub,
  then I land on my applications overview.
- Given I am signed in for the first time, when my account is created, then
  I have the default stages (`Wishlist`, `Applied`, `Interviewing`, `Offer`).

**US-2. As a job seeker, I want my data to be private so that no one else can
see my job search.**

- Given another user has applications, interviews, and documents, when I use
  the app, then none of their data appears anywhere for me, including the
  overview, detail pages, document downloads, and exports.
- Given I am signed in, when I request another user's application or document
  directly by ID or URL, then I get a not-found response.
- Given another user's application or interview ID, when I submit an edit or
  delete for it (e.g. by crafting a request), then the action fails, nothing
  of theirs changes, and I learn nothing about whether it exists.
- Given another user's stage or document ID, when I submit it as the stage,
  resume, or cover letter on my own application, then the save is rejected
  and my application is unchanged.
- Given another user's application ID, when I try to add an interview to it,
  then the action fails and no interview is created.

### Applications

**US-3. As a job seeker, I want to add an application with a plain form so
that I can start tracking it.**

- Given I am on the overview, when I open the "New application" form, fill in
  company and role title, and save, then the application appears in the
  overview with status `Active` and my first stage selected.
- Given I leave company or role title empty, when I save, then I see an error
  on each missing field and nothing is saved.
- Given I enter an invalid job posting URL, when I save, then I see a
  validation error on that field.
- Given I fill in only company and role title (no resume, cover letter, or
  date applied), when I save, then the application is created. This supports
  `Wishlist` entries for jobs not yet applied to.
- Given I save a new application, when I open its stage history, then it has
  one entry for its initial stage and status, dated now.

**US-4. As a job seeker, I want to see all my applications in one table so
that I get an overview of where everything stands.**

- Given I have applications, when I open the overview, then I see a table with
  one row per application showing at least company, role, stage, status, date
  applied, resume name, and next action with its due date.
- Given I have no applications, when I open the overview, then I see an empty
  state with a link to add my first application.
- Given I click a column header, when the table re-renders, then rows are
  sorted by that column, and clicking again reverses the order.
- Given I click a row, when the page loads, then I see that application's
  detail page.

**US-5. As a job seeker, I want to filter the table so that I only see what is
relevant right now.**

- Given I open the overview, when it first loads, then only `Active`
  applications are shown.
- Given the status filter is set to `Active`, when I change it to `Closed` or
  `All`, then the table shows the matching applications.
- Given I filter by one or more stages, when the table updates, then only
  applications in those stages are shown.
- Given filters are applied, when I clear them, then the table returns to the
  default (`Active` only).

**US-6. As a job seeker, I want to edit an application and move it between
stages so that the record reflects reality.**

- Given I am on an application's detail page, when I change any field and
  save, then the change appears on the detail page and in the overview.
- Given an application is in `Applied`, when I change its stage to
  `Interviewing`, then the overview shows `Interviewing` and the stage history
  gains an entry "Applied → Interviewing" with the current date.
- Given I submit invalid input, when I save, then I see field errors and the
  stored record is unchanged.

**US-7. As a job seeker, I want to see the full dated history of an
application so that I can tell how it progressed.**

- Given an application has changed stage or status several times, when I open
  its detail page, then I see every change in chronological order, each with
  its date, the old value, and the new value.
- Given a history entry "Applied → Interviewing", when I later rename
  `Interviewing` to `Interview loop`, then the entry still reads
  "Applied → Interviewing".
- Given a stage appears in history but no application is in it now, when I
  delete that stage, then history entries that mention it are unchanged.

**US-8. As a job seeker, I want to close an application with a reason, and
reopen it if needed, so that finished applications leave my active view
without being lost.**

- Given an active application, when I set its status to `Closed` and pick a
  close reason, then it disappears from the default overview, keeps its
  current stage, and the history records the closure with its reason.
- Given I set status to `Closed` without a reason, when I save, then it saves
  with no close reason (the reason is optional).
- Given a closed application, when I set its status back to `Active`, then it
  reappears in the default overview, its close reason is cleared, and the
  history records the reopening.

**US-9. As a job seeker, I want to delete an application so that I can remove
records I no longer want.**

- Given I am on an application's detail page, when I choose "Delete", then I am
  asked to confirm.
- Given I confirm deletion, when the action completes, then the application,
  its interviews, and its stage history are permanently removed and I return
  to the overview.
- Given the application used library documents, when it is deleted, then those
  documents stay in my library.

### Stages

**US-10. As a job seeker, I want to customize my stages so that they match how
I think about my pipeline.**

- Given I am on the stage settings page, when I add a stage, then it is
  available to choose on every application.
- Given I rename a stage, when I view the overview, then every application in
  that stage shows the new name.
- Given I reorder stages, when I open the stage dropdown or sort by stage,
  then stages appear in my chosen order.
- Given a stage no application currently uses, when I delete it, then it is
  removed, even if it appears in stage history (history keeps its own
  snapshot of the name; see US-7).
- Given a stage at least one application uses (current stage), when I try to
  delete it, then the deletion is blocked and I see how many applications use
  it.
- Given I have only one stage, when I try to delete it, then the deletion is
  blocked.

### Interviews

**US-11. As a job seeker, I want to record each interview for an application
so that I can track that company's specific process.**

- Given I am on an application's detail page, when I add an interview with a
  name and date/time, then it appears in that application's interview list,
  sorted by date.
- Given my time zone is `America/New_York`, when I enter an interview at
  2:00 PM, then it is shown as 2:00 PM. If I change my time zone to
  `America/Los_Angeles`, it is shown as 11:00 AM (same instant).
- Given I leave the interview name or date empty, when I save, then I see
  validation errors and nothing is saved.
- Given an existing interview, when I edit its fields (including outcome and
  notes) and save, then the changes are shown.
- Given an existing interview, when I delete it and confirm, then it is
  removed from the list.

### Documents

**US-12. As a job seeker, I want to upload resumes and cover letters to a
library so that I can reuse them across applications.**

- Given I am on the documents page, when I upload a PDF, give it a name, and
  choose a type (`Resume` or `Cover letter`), then it appears in my library
  with its name, type, and upload date.
- Given I leave the name or type empty, when I submit, then I see validation
  errors and nothing is uploaded.
- Given a document in my library, when I rename it, then the new name shows
  everywhere it is used, and its file and type are unchanged.
- Given a document in my library, when I look for a way to replace its file
  or change its type, then there is none. To revise a resume, I upload a new
  document.
- Given I try to upload a file that is not a PDF, when I submit, then the
  upload is rejected with a message that only PDFs are supported.
- Given I try to upload a PDF over 10 MB, when I submit, then the upload is
  rejected with a message stating the limit.
- Given a document in my library, when I click it, then I can view or
  download the PDF.

**US-13. As a job seeker, I want to choose which resume and cover letter I used
for an application so that I remember what I sent.**

- Given my library has documents, when I edit an application, then I can
  optionally pick a resume and optionally a cover letter. The resume picker
  lists only `Resume` documents and the cover letter picker lists only
  `Cover letter` documents.
- Given a `Cover letter` document's ID, when it is submitted as an
  application's resume (or the reverse), then the save is rejected.
- Given an application has a resume selected, when I clear the selection and
  save, then the application has no resume and the document stays in my
  library.
- Given I am editing an application, when I upload a new PDF from the resume
  or cover letter field, then it is added to my library with that field's
  type and selected for that application.
- Given an application has a resume selected, when I view the overview, then
  the resume column shows the document's name.

**US-14. As a job seeker, I want to delete documents I no longer need, without
breaking my application records.**

- Given a document no application uses, when I delete it and confirm, then it
  is removed from my library and storage.
- Given a document used by at least one application, when I try to delete it,
  then the deletion is blocked and I see which applications use it.

### Follow-ups and reminders

**US-15. As a job seeker, I want to set a next action with a due date on an
application so that I know what to do next.**

- Given an application, when I set a next action (e.g. "Follow up with
  recruiter") and a due date, then both show on the detail page and in the
  overview.
- Given a next action, when I mark it done or clear it, then it no longer
  shows on the overview or in reminders.

**US-16. As a job seeker, I want in-app reminders for due follow-ups and
upcoming interviews so that I don't miss them.**

- Given an active application's next action is due today or overdue, when I
  open the app, then it appears in a "Needs attention" section on the
  overview, with overdue items marked as overdue. "Today" is the current
  calendar date in my time zone. An action is overdue once its due date is
  before today.
- Given an interview is scheduled between now and 7 × 24 hours from now, when
  I open the app, then it appears in an "Upcoming interviews" section with its
  date/time (in my time zone) and application.
- Given it is 11:30 PM on Oct 20 in my time zone and an action is due Oct 20,
  when I view the overview, then it is due today, not overdue. At 12:00 AM on
  Oct 21 it becomes overdue.
- Given an interview's date/time has passed, when I open the app, then it no
  longer appears under upcoming interviews.
- Given an application is closed, when I open the app, then none of its next
  actions or interviews appear in reminders.
- Given nothing is due or upcoming, when I open the overview, then the
  reminder sections are hidden or show an empty message.

**US-17. As a job seeker, I want stale applications highlighted, with a
threshold I choose, so that I notice ones that have gone quiet.**

- Given my stale threshold is 14 days (the default), when an active
  application's last activity was more than 14 × 24 hours ago, then its row
  in the overview is visibly highlighted as stale.
- Given I change the threshold in settings to N days, when I view the
  overview, then staleness is computed using N.
- Given a stale application, when I do something that counts as activity
  (see Core concepts), then it is no longer highlighted.
- Given a stale application, when I open its form and save without changing
  anything, then it stays stale.
- Given a stale application in stage `Applied`, when I rename `Applied` or
  rename its resume document, then it stays stale.
- Given a closed application, when it has had no activity past the threshold,
  then it is not highlighted.
- Given I enter a threshold that is not a positive whole number, when I save,
  then I see a validation error and the threshold is unchanged.

### Export

**US-18. As a job seeker, I want to export my applications to CSV so that I
own my data and can use it elsewhere.**

- Given I have applications, when I click "Export CSV", then a CSV file
  downloads with one row per application and a column for each application
  field (documents by name).
- Given I have filters applied, when I export, then all my applications are
  exported, not just the filtered ones.
- Given field values contain commas, quotes, or newlines, when I open the CSV
  in a spreadsheet app, then each value stays in its own cell, intact.

### Responsive layout

**US-19. As a job seeker, I want the app to work on my phone so that I can
check and update applications on the go.**

- Given a viewport 375px wide, when I use any page, then all content and
  actions are reachable without horizontal page scrolling.
- Given a narrow viewport, when I view the overview, then the table adapts
  (e.g. collapsing to stacked rows or hiding secondary columns) and company,
  role, stage, and next action stay visible.

## Out of scope (v1)

- Sharing data with others (coaches, friends) or any multi-user access
- Calendar view or calendar integration (e.g. Google Calendar, iCal)
- Email and push notifications (reminders are in-app only)
- Importing from CSV or spreadsheets
- Auto-filling an application from a job posting URL
- Non-PDF documents (DOCX, etc.)
- Job search or job board integration
- AI features (resume tailoring, cover letter generation)
- Analytics and charts (response rates, funnels)
- Native mobile apps (the responsive web app covers mobile)

## Decisions

Defaults chosen during spec writing and confirmed:

- Document upload size limit: 10 MB.
- "Upcoming interview" window: the next 168 hours (rolling), not 7 calendar
  days.
- Stale threshold default: 14 days. See Core concepts for what counts as
  activity.
- Time zone defaults to the browser's at first sign-in.
- Document names are editable; files and types are not.
- Close reason is optional when closing.
- Stages in use cannot be deleted. The user must move those applications
  first.
- CSV export ignores filters and includes all applications.
