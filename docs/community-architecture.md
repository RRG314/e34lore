# Community

The community shares member accounts and vehicle, part and repair references with the Workshop and My Garage. Members can start discussions, reply, report content and suggest reference corrections.

## Boards and navigation

The boards cover troubleshooting, maintenance, modifications, restoration, parts, general discussion, research and site feedback. Board, tag and search selections carry through discussion and reply links. E30 and E34 discussions use the same community.

Repair pages show relevant discussions and provide a link to start a topic for that repair. Part and model pages use their existing identities to connect related discussions.

## Data and access

Threads and posts are the main discussion records. Editorial topics supply reference context. Posting, replying and feedback require an email-confirmed account and are subject to contribution limits.

Members can mute or block other members. Published content remains subject to moderation. Staff actions require the relevant role and a verified authenticator session.

Helpful feedback and reported concerns refer to the content version the member reviewed. The database enforces feedback ownership and the visibility of the target discussion.

## Shared cars and builds

Member garages, car stories and the build gallery show explicitly published records. Private vehicle data stays in My Garage. Publishing and moderation use separate projections so editing a private record does not automatically publish it.

The UI is in [Community.tsx](../src/components/Community.tsx), board definitions are in [boards.ts](../src/community/boards.ts), and access rules are in [database](../database) and [supabase/migrations](../supabase/migrations).

See [member records](member-cars-and-management.md), [API and data](api-and-data.md), and the [contribution guide](../CONTRIBUTING.md).
