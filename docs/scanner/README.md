# Part Scanner

The [Part Scanner](https://e34lore.com/scanner) identifies possible BMW components from a photo or a readable marking. It supports both vehicle generations.

1. Add one clear photo of a single part. Add another angle of the same part if needed.
2. Compare the suggestions with the catalog drawing and the part number. A visual match gives a component category. Check the OEM identity and applicability against the catalog.
3. Open the part's Workshop location or service reference. Signed-in members can save the result and choose whether to save the photos in My Garage.

The browser prepares photos, runs the comparison, and reads markings. Scanner drafts and saved results have separate storage. Uploads happen when the member saves photos or chooses to contribute an image. Shared reference photos require separate permission and review.

## Source and validation

| Area | Location |
| --- | --- |
| Capture, comparison, and saved-scan context | [Scanner source](../../src/scanner) |
| Reference images, labels, and provenance | [Scanner data](../../data/scanner) |
| Upload ownership and review | [Scanner media function](../../supabase/functions/scanner-media), [Policy checks](../../tests/scanner-photo-contributions.sql) |

Use the [contribution guide](../../CONTRIBUTING.md) for corrections and image submissions.

## Testing

In the demo, use a sample catalog number to try the marking-to-catalog flow. In a full scanner evaluation, keep reference and test photos of different physical parts in separate sets. Include close lookalikes and unknown parts. Check category recognition separately from exact-number matches, and measure cold and warm performance on physical phones.
