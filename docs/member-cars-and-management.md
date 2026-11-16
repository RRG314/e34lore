# My Garage and member cars

My Garage holds a member's E30 and E34 vehicles in one account. Each car can have service records, installed parts, journal entries, build projects, saved identifications and photos.

## Saving and reopening work

Selecting a car supplies its recorded configuration to the scanner, catalog and Workshop. A saved identification retains its part, source position and model revision. Links from a guided repair can reopen that identification in My Garage.

Saved scans, bookmarks, installations and completed repairs represent different records. Confirming a part identification records the member's choice. A service record describes work performed on the car.

## Photos and shared profiles

Garage photos are private when uploaded. The member can choose photos for a shared car story or profile and review the publication before submitting it. Approved photos appear through the public car and community views.

The media service validates ownership and prepares images before storage. Photo access follows both the record and storage policies. Withdrawing a story or photo revokes future public access through the site.

## Community and moderation

Member garages and build galleries link shared publications to the community. Private service records, notes and VINs stay with the account.

The management area provides photo review, reports, discussion controls and member restrictions. Staff permissions are stored separately from member profiles, and staff operations require the relevant role and verified authenticator session.

## Account data

Members can export their records and request account deletion. Storage cleanup and account deletion use the existing backend services. Local integration tests should cover ownership, cross-account denial, publication withdrawal and cleanup retries.

The implementation is in [Owner.tsx](../src/components/Owner.tsx), [src/vehicle](../src/vehicle), and the [media functions](../supabase/functions). See [API and data](api-and-data.md) for the access model.
