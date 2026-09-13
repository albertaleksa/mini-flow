# MiniFlow — MVP Project Scope

## 1. Project Overview

**MiniFlow** is a lightweight, real-time, multi-user Kanban board application for individuals and small teams.

The goal of the MVP is to provide the essential Kanban workflow without the complexity of tools such as Jira or Trello. Users should be able to create boards, organize work into columns, create and assign tasks, and see changes made by other team members in real time.

MiniFlow is designed primarily for desktop use.

---

## 2. Product Goal

Build a simple Kanban application that allows users to:

- Create and manage multiple boards
- Organize tasks into customizable columns
- Create, edit, move, assign, complete, and delete tasks
- Collaborate with multiple people on the same board
- See board changes in real time without refreshing the page
- Search and filter tasks
- Start new boards from simple built-in templates

The MVP should prioritize simplicity, responsiveness, and ease of use.

---

## 3. Target Users

MiniFlow supports both:

### Individual users

A person can use a board for:

- Personal tasks
- Side projects
- Weekly planning
- Study planning

### Small teams

A small team can use a shared board to:

- Track project tasks
- Assign work
- Monitor progress
- Collaborate in real time

The MVP is intended for small groups rather than large organizations.

---

## 4. MVP Principles

The first version should remain intentionally small.

A feature belongs in the MVP only if it directly helps users:

- Create work
- Organize work
- Assign work
- Move work through a workflow
- Find work
- Complete work
- Collaborate on the same board

Features that introduce significant administration, communication, automation, or reporting complexity should be postponed.

---

# 5. User Identity

## Decision

MiniFlow will not use traditional authentication in the MVP.

Users do not create accounts with email addresses or passwords.

When opening or joining a shared board, a user enters a **display name**.

Example:

> Albert

The display name is used for:

- Identifying board participants
- Task assignment
- Showing who is assigned to a task

## Why

Traditional authentication would require:

- Account registration
- Password storage
- Login sessions
- Password recovery
- Email verification
- Additional security logic

These features are not necessary to validate the core Kanban experience.

## Alternatives Considered

### Email + password

Rejected for MVP because it adds unnecessary account-management complexity.

### Google/GitHub authentication

Rejected because it introduces third-party authentication dependencies.

### Completely anonymous users

Rejected because task assignment requires identifying team members.

---

# 6. Boards

Users can create and use multiple boards.

Examples:

- Personal Tasks
- Website Project
- Weekly Planning
- Data Pipeline Project

Each board has:

- Board name
- Columns
- Tasks
- Board members
- Shareable board link

---

# 7. Board Sharing

Each board has a unique shareable link.

Example concept:

```text
miniflow.app/board/abc123
```

A user can send the link to another person.

When the other person opens the link:

1. They enter a display name.
2. They join the board.
3. They can view and edit the board.

No invitation email is required.

---

# 8. Collaboration Model

All members of a board have the same permissions in the MVP.

Any board member can:

- Create tasks
- Edit tasks
- Move tasks
- Assign tasks
- Change columns
- Delete tasks
- Search and filter tasks

There are no roles such as:

- Owner
- Admin
- Viewer
- Editor

This keeps collaboration simple.

Role-based permissions can be added later if needed.

---

# 9. Real-Time Collaboration

Real-time synchronization is a core requirement.

When multiple users have the same board open, changes should appear for everyone without manually refreshing the page.

Real-time updates include:

- New task created
- Task edited
- Task deleted
- Task moved between columns
- Task reordered
- Task assignment changed
- Column created
- Column renamed
- Column deleted
- Column reordered

Example:

1. Albert and Maria have the same board open.
2. Albert moves a task from `To Do` to `In Progress`.
3. Maria sees the task move automatically.

---

# 10. Concurrent Editing

The MVP will use a simple **last-write-wins** approach.

If two users edit the same task at nearly the same time, the most recently saved version becomes the current version.

The MVP will not include:

- Record locking
- Merge conflict UI
- Collaborative text editing
- Edit presence indicators

These can be considered later if concurrent editing becomes a real problem.

---

# 11. Board Columns

New boards use the following default columns:

```text
To Do
In Progress
Done
```

Users can customize columns.

They can:

- Add a column
- Rename a column
- Delete a column
- Reorder columns

There are no Work-In-Progress limits in the MVP.

---

# 12. Task Cards

Each task contains:

### Required

- Title

### Optional

- Description
- Due date
- Priority
- Assignee

---

# 13. Task Priority

MiniFlow uses three priority levels:

```text
Low
Medium
High
```

A task can also have no priority selected.

Three levels are enough for the MVP and avoid introducing unnecessary distinctions such as Urgent or Critical.

---

# 14. Task Assignment

A task can be:

- Unassigned
- Assigned to one board member

Multiple assignees are not supported in the MVP.

## Why

One assignee creates clear ownership and keeps the data model simple.

If several people need to work on the same item, separate tasks can be created.

---

# 15. Creating and Editing Tasks

Users can create a task inside any column.

A task can later be edited.

Editable fields:

- Title
- Description
- Due date
- Priority
- Assignee

---

# 16. Moving Tasks

Task movement is performed using **desktop drag and drop**.

Users can:

- Move tasks between columns
- Reorder tasks inside the same column

No alternative move buttons are required.

Touch-device behavior is outside the MVP.

---

# 17. Task Ordering

Tasks use manual ordering.

Users decide task order by dragging cards within a column.

## Why

Manual ordering matches the normal Kanban experience and avoids conflicts between drag-and-drop ordering and automatic sorting.

## Alternatives Considered

### Automatic sorting by priority

Useful but would override users' manual arrangement.

### Automatic sorting by due date

Useful for planning but limits flexibility.

### Separate sorting configuration per column

More powerful, but unnecessarily complex for the MVP.

Automatic sorting may be added later.

---

# 18. Completing Tasks

A task is considered completed when it enters the `Done` column.

When this happens, MiniFlow records:

```text
completed_at
```

This stores the date and time the task was completed.

If the task is moved out of `Done`, it is no longer considered completed.

---

# 19. Deleting Tasks

Users can delete tasks.

Before deletion, MiniFlow shows a confirmation.

Example:

> Delete this task? This action cannot be undone.

Deleted tasks are permanently removed in the MVP.

There is no trash or archive system.

---

# 20. Search

Users can search tasks by title.

Search applies to the current board.

Results update as the user types.

---

# 21. Filters

Users can filter tasks using:

### Priority

- Low
- Medium
- High

### Due status

Examples:

- All
- Due soon
- Overdue

### Assignee

- Any member
- Specific board member
- Unassigned

Multiple filters may be applied together.

---

# 22. Overdue Tasks

If a task has a due date in the past and is not completed, it is visually marked as overdue.

No automatic actions occur.

MiniFlow does not:

- Move overdue tasks
- Change their priority
- Send notifications
- Escalate them

---

# 23. Board Templates

MiniFlow includes built-in templates.

Users cannot create custom templates in the MVP.

Initial templates:

## Personal Tasks

```text
To Do
In Progress
Done
```

## Software Project

```text
Backlog
To Do
In Progress
Review
Done
```

## Weekly Planning

```text
Planned
This Week
In Progress
Done
```

Templates only define the initial board structure.

Users can customize the columns afterward.

---

# 24. Features Explicitly Excluded from MVP

The following features are intentionally outside the first version.

### Authentication

- Email/password accounts
- OAuth
- Password recovery
- Email verification

### Advanced permissions

- Admin roles
- Viewer roles
- Board ownership rules
- Fine-grained permissions

### Communication

- Comments
- Chat
- @mentions

### Notifications

- Email notifications
- Browser push notifications
- Due-date reminders

### Task complexity

- Subtasks
- Checklists
- Task dependencies
- Attachments
- Custom labels
- Multiple assignees

### Automation

- Recurring tasks
- Rules
- Automated task movement
- Workflow automation

### History

- Activity feed
- Full audit history
- Task version history

### Reporting

- Dashboards
- Analytics
- Burndown charts
- Time tracking
- Productivity metrics

### Mobile

- Native mobile application
- Touch-specific Kanban interactions

### Integrations

- Slack
- GitHub
- Jira
- Google Calendar
- Email integrations
- External APIs for third-party integrations

---

# 25. Core User Flows

## Flow 1 — Create a Board

1. User opens MiniFlow.
2. User chooses `Create Board`.
3. User enters a board name.
4. User chooses:
   - Blank/default board, or
   - Built-in template.
5. Board is created.
6. User enters their display name if not already known.

---

## Flow 2 — Share a Board

1. User opens a board.
2. User selects `Share`.
3. MiniFlow displays the board link.
4. User copies the link.
5. Another person opens the link.
6. They enter their display name.
7. They join the board.

---

## Flow 3 — Create a Task

1. User chooses `Add Task` in a column.
2. User enters a title.
3. Optionally enters:
   - Description
   - Due date
   - Priority
   - Assignee
4. User saves the task.
5. The task appears for all users currently viewing the board.

---

## Flow 4 — Move a Task

1. User drags a card.
2. User drops it into another column or another position.
3. The new position is saved.
4. Other connected users see the change immediately.

---

## Flow 5 — Complete a Task

1. User moves the task into `Done`.
2. MiniFlow records the completion timestamp.
3. Other users see the task move in real time.

---

## Flow 6 — Find Work

1. User enters text into search.
2. User optionally selects filters.
3. Only matching tasks are displayed.
4. Clearing search/filters restores the complete board.

---

# 26. Suggested Main Screens

The MVP needs only a small number of screens.

## Home / Board List

Shows:

- App name/logo
- Existing boards
- Create Board button

## Create Board

Shows:

- Board name
- Template selection
- Create button

## Board View

Primary application screen.

Contains:

- Board title
- Share button
- Search
- Filters
- Columns
- Task cards
- Add Task controls

## Task Editor

Can be a modal or side panel.

Contains:

- Title
- Description
- Due date
- Priority
- Assignee
- Save
- Delete

## Join Board

Contains:

- Board name
- Display-name input
- Join button

---

# 27. Suggested Data Model

A simple conceptual model:

## User

```text
id
display_name
created_at
```

## Board

```text
id
name
share_id
created_at
```

## BoardMember

```text
board_id
user_id
joined_at
```

## Column

```text
id
board_id
name
position
```

## Task

```text
id
board_id
column_id
title
description
priority
due_date
assignee_user_id
position
completed_at
created_at
updated_at
```

---

# 28. Real-Time Technical Requirement

The implementation should use a persistent real-time connection or subscription mechanism.

Possible technologies include:

- WebSockets
- Server-Sent Events combined with normal API writes
- A backend platform with real-time database subscriptions

The exact technology is an implementation decision rather than a product-scope requirement.

The important product requirement is:

> A user should see another user's board changes automatically without refreshing the browser.

---

# 29. Chosen Technology Stack

The MVP will use the following stack. Versions are the latest stable releases checked on **2026-09-13**; they are a planning baseline, not a substitute for checking compatibility and locking dependencies when implementation begins. Pre-release versions are excluded.

| Layer | Technology | Planning version | Purpose |
| --- | --- | --- | --- |
| Frontend | React and React DOM | 19.3.0 | Board interface |
| Frontend | TypeScript | 7.0.2 | Typed frontend code |
| Frontend build | Vite | 8.2.2 | Development server and production build |
| Frontend build | `@vitejs/plugin-react` | 6.1.1 | React support in Vite |
| Drag and drop | `@dnd-kit/react` and `@dnd-kit/helpers` | 0.5.0 | Move and reorder cards and columns |
| Frontend tooling | Node.js | 24.21.0 LTS | Run the frontend build tools |
| Backend runtime | Python | 3.14.7 | Run the API server |
| API and real time | FastAPI | 0.141.1 | HTTP endpoints and board WebSockets |
| API server | Uvicorn | 0.52.4 | Serve the FastAPI application |
| Data access | SQLAlchemy | 2.0.52 | Database models and queries |
| Schema migrations | Alembic | 1.19.2 | Version database schema changes |
| Database | SQLite | 3.53.4 upstream | Persistent board data |

Normal reads and writes will use the FastAPI HTTP API. After a write commits, the backend will notify other viewers of that board through a WebSocket; clients will reload board state after reconnecting so missed messages do not leave them stale. The initial deployment will use one backend process, because an in-memory connection manager cannot broadcast across processes.

SQLite will use a persistent local database file. Its write-ahead logging mode supports concurrent readers but still allows only one writer at a time. The SQLite library version bundled with the deployed Python runtime must be checked separately from the upstream version above.

SQLAlchemy keeps application queries largely independent of the database, but it does not make database behavior or migrations identical. A later move to PostgreSQL would require testing queries, constraints, and Alembic migrations against PostgreSQL.

---

# 30. Persistence

Board data must be stored persistently.

Refreshing or reopening the application should not remove:

- Boards
- Columns
- Tasks
- Members
- Assignments
- Task ordering

The application therefore requires backend/database persistence rather than browser-only local storage.

---

# 31. Desktop Scope

The MVP is designed for desktop browsers.

The interface should work well at normal laptop and desktop widths.

The project does not need to optimize for:

- Phones
- Tablets
- Touch interaction

Basic responsive behavior is acceptable, but mobile usability is not an MVP requirement.

---

# 32. MVP Success Criteria

The MVP can be considered successful when the following scenario works reliably:

1. A user creates a board.
2. The user customizes the columns.
3. The user creates several tasks.
4. The user assigns a task to another board member.
5. The board link is shared.
6. A second user joins with a display name.
7. Both users open the same board simultaneously.
8. One user creates or edits a task.
9. The other user sees the update without refreshing.
10. One user drags a task to another column.
11. The other user sees the card move in real time.
12. Users can search and filter the tasks.
13. Moving a task to `Done` records its completion date.
14. Board state remains available after the page is refreshed.

If these workflows work cleanly, MiniFlow has accomplished the core MVP goal.

---

# 33. Possible Post-MVP Features

Potential future improvements include:

- Real user accounts
- Email or OAuth authentication
- Board owners and permissions
- Comments
- Activity history
- Notifications
- Recurring tasks
- Custom labels
- Checklists
- Attachments
- Custom board templates
- Automatic sorting
- Archive/trash
- Presence indicators
- Conflict-aware editing
- Analytics
- Mobile support
- Third-party integrations

These features should only be considered after the core real-time Kanban experience is working well.

---

# 34. Final MVP Definition

**MiniFlow MVP** is a desktop-first, real-time, multi-user Kanban application where people join shared boards using a display name and shareable link.

Users can create multiple boards, customize columns, create and assign tasks, drag tasks through the workflow, reorder tasks manually, search and filter work, and collaborate with other users who see updates immediately.

The MVP deliberately avoids accounts, complex permissions, notifications, comments, automation, analytics, and mobile-specific functionality.

The product's core promise is simple:

> **A lightweight shared board where work flows clearly and everyone sees changes in real time.**
