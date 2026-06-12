# MakeItHappen — Feature Backlog

## Planned

### AI Quick Entry for projects
Natural language task capture inside the project detail screen. A single text field accepts free-form input ("Alex reviews slides by Jun 20, Morgan handles legal sign-off by Jun 28") — Claude parses it against the project's current milestone structure, fuzzy-matches owner names to contacts, and presents a preview list before inserting. Supports multiple tasks in one dictation. Voice input via Web Speech API is an optional add-on layer on top.

---

### Project sharing (invite-based, last-write-wins)
Move projects out of the per-user JSON blob into a normalized `projects` table with a `project_members` join table. RLS allows any member to read and write. Whoever saves last wins. Invites sent by email or shareable link. Foundation for real-time sync later.

---

## In Progress

_(nothing currently)_

---

## Completed

_(nothing yet)_
