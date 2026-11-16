# Build Studio

Build Studio uses the shared Workshop viewer to plan an E30 or E34 project. A project can belong to a car in My Garage or remain a concept.

## Project state

The project records a base vehicle, intended configuration, appearance choices, selected parts, tasks, costs and photos. References use model and catalog identifiers so the project can reopen the same version of a component.

Project saves use revision checks to detect concurrent edits. Restoring an earlier revision creates a new current revision. Estimates can remain unknown until the member supplies an amount.

The state schema is in [schema.ts](../../src/build-studio/schema.ts). The viewer integration and project controls are in [src/build-studio](../../src/build-studio).

## Appearance and parts

Paint, upholstery, trim, supported wheel packages and ride height use the existing renderer. Appearance changes apply to the supported materials and nodes. Component selections retain their source and configuration restrictions.

A visual preview illustrates the proposed build. Check catalog evidence and the installed hardware before treating a selection as compatible. Planned changes can also be recorded when a matching model asset is unavailable.

## Garage and publication

Saving a project keeps its notes and photos with the member's account. Recording a completed installation or repair is a separate action in My Garage.

Publishing creates a public snapshot of the selected project information. Private notes, vehicle records, VINs and unapproved photos stay outside that snapshot. Subsequent private edits become public when the member republishes the project. Withdrawing a publication revokes future access through the application.

## Development checks

Changes to project persistence should cover save and reopen, concurrent edits, revision restoration, and account ownership. Changes to publication should also cover public snapshots, photo permissions, republishing and withdrawal. Use a local database with synthetic accounts.

See [API and data](../api-and-data.md), [member records](../member-cars-and-management.md), and [contributing](../../CONTRIBUTING.md).
