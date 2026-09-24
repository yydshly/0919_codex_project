<!-- Sync Impact: initial scaffold -> 1.0.0; five practical principles adopted for this demonstration; no dependent templates modified; no unresolved TODOs. -->
# Resource Shelf Constitution

## Core Principles

### I. Real, inspectable work
The demonstration MUST contain working software and the actual specification, plan, task list and test evidence used to build it. CLI output MUST be captured from execution. Agent-authored documents MUST be identified as produced by Codex following Spec Kit instructions, not by the CLI alone.

### II. Local-first personal data
Project collections MUST stay in the current browser unless the user deliberately exports them. The app MUST explain that different devices, browsers and origins do not share data. No account, tracking or remote collection service is required.

### III. Verifiable user journeys
Automated browser checks MUST cover creation, invalid and duplicate input, search and status filtering, persistence, export, delete/undo and storage failure. Tests MUST run against the built page and report actual results.

### IV. Recoverable actions
Removal MUST offer undo. Storage failures MUST be visible, MUST NOT be reported as successful saves, and MUST preserve the unsaved form or current data. Invalid persisted content MUST NOT be silently overwritten.

### V. Small, accessible implementation
Use the research repository's dependency-free HTML/CSS/JavaScript pattern. All actions MUST be keyboard operable and labeled in Chinese. Layout MUST work at 320px and desktop widths. Do not build unrelated accounts, cloud sync or repository crawling.

## Scope and Evidence
This is a real local application built to demonstrate Spec Kit, not a benchmark of generated code quality. Bundled starter projects MUST be labeled as examples. Specs and CLI logs are development evidence and may be published with the static demonstration; user-entered collection data MUST NOT enter those artifacts.

## Development Workflow
Follow specification, planning, tasks, implementation and convergence in order. Keep the workflow artifacts in specs/001-resource-shelf/. Requirements and decisions precede code. Validate acceptance scenarios and inspect the rendered page before delivery. There is no requirement to create or change the parent repository's Git branch.

## Governance
These principles govern this demonstration. Changes require a recorded reason and version update; minor clarification increments patch, new compatible principle increments minor, removal or incompatible principle change increments major. Inspect compliance during planning and final convergence.

**Version**: 1.0.0 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-09-22
