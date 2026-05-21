# VANTYX Project Case Study

## Summary

VANTYX is an operational intelligence tool for hotel GOP and business-performance recovery workflows. It helps an operator move from raw financial numbers to a clearer read on gap, forecast, and recovery actions.

## Problem

Operations teams often review revenue, expense, GOP, and target numbers across several disconnected tools or spreadsheets. Even when the numbers are available, managers still need to answer:

- Are we on target?
- If not, how big is the gap?
- Which operating area is most controllable?
- What action would close the gap?
- What can be sent as a clear snapshot?

## Solution

VANTYX provides a local-first dashboard for entering or loading sample operating data, reviewing GOP position, identifying target gaps, and producing action-oriented recovery logic.

Core workflows:

- Set up property and reporting period.
- Enter month, quarter, year, and weekly numbers.
- Compare performance against target GOP.
- Review current and forecasted position.
- Generate/edit recovery actions.
- Export CSV or use print/PDF-style reporting.

## Product Ownership

My ownership focused on:

- Product requirements and workflow design.
- UX logic for setup, results, action plan, and snapshot views.
- Gap-detection and recovery-action behavior.
- Acceptance criteria for local save, export, and reporting workflows.
- Testing expectations for calculations and demo data.
- Public-safe portfolio documentation.

## Architecture

VANTYX is a Tauri v2 + React/TypeScript application.

- React and TypeScript drive the dashboard UI and business workflow.
- Domain modules handle calculations, date periods, action-plan logic, reporting, storage, and exports.
- Tauri provides a desktop shell and local native capabilities.
- Browser mode supports no-download demo use.
- Local persistence supports draft/snapshot workflows.

## Current Status

Active prototype. The app has working dashboard, demo data, local save/autosave behavior, CSV export, print/PDF-style reporting, and action-plan logic. Future work includes deeper integrations, more polished onboarding, more robust sample data, and additional industry templates.

## What This Demonstrates

- Ability to turn operational knowledge into software requirements.
- Practical dashboard and workflow design.
- Local-first desktop app development.
- TypeScript domain logic and test coverage.
- AI-assisted development used as an implementation accelerator, not a substitute for product ownership.
