# November 11 owner preview

Open the [Part Scanner](http://127.0.0.1:3012/scanner), [525i left parking brake](http://127.0.0.1:3012/workshop?reference=e34-525i-sedan-automatic&system=system%3Aparking-brake-left), [VIN registry](http://127.0.0.1:3012/garage/vins), or [E30 Lore](http://127.0.0.1:3012/e30) on the same Wi-Fi as the Mac. The previews use disposable data. Sign-in for the E34 test account is shown in the preview banner.

## Part Scanner and photos

The on-device shape check looks for a bearing opening and two separate slots in a mounting bracket. Use an unmarked support on a plain light background with the entire part visible. Three of four historical and research photos received a center-support suggestion. The crop that touched the photo edge was left unresolved. None of the 22 other evaluation images received a center-support suggestion. This small set includes multiple photos of the same product style and does not measure accuracy on a phone. The result is a component suggestion. The user still checks the catalog before confirming an OEM number.

After a confirmed selection, photos can be kept privately with the scan. The image bytes go to the private storage bucket. Database rows link them to their owner, saved scan, part number and optional angle. The server bounds, decodes and re-encodes each JPEG to remove embedded metadata. Only separately opted-in submissions with current moderator approval can enter the catalog and scanner reference dataset. Members can stop sharing or delete the saved photo. Pending and private photos are excluded from reference use.

The browser check saved and reopened a private photo from My Garage. The optional angle label passed endpoint and database tests. The disposable upload server used its earlier handler during the browser check.

## VIN lookup and community

My Garage can save a full VIN for an owned car. RLS limits access to its verified owner and active session. The VIN stays outside public vehicle profiles. The user can replace, remove or export the record. VIN lookup sends NHTSA the first eight characters plus the year and plant characters. Asterisks replace the check digit and six-character serial. A 1995 525i Sedan pattern returned the expected basic configuration and opened the E34 catalog. Imported or older cars can use manual selection when coverage is incomplete. BMW factory options and exact fitment still require a manufacturer source. [NHTSA Vehicle API](https://vpic.nhtsa.dot.gov/api/) · [BMW Technical Information](https://bmwtechinfo.bmwgroup.com/).

The discussion composer waits for the restored draft and linked context before accepting text. Browser checks created a member discussion and reply and reopened them after reload in the disposable database.

## 525i model and E30

The 525i automatic review model has 668 selectable parts. Both rear parking brakes have modeled friction linings, return springs, hold-downs, star-wheel adjusters and expanding locks. The model links the adjusting screw and lock alternatives to their source conditions. The retained shoe-kit record specifies Great Britain equipment. Geometry and clearances are approximate. The published revision 24 remains available for saved references. [BMW parking brake diagram](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/brakes_pedals/parking_brake_brake_shoes.html).

Five E34 service-figure views now open with a selectable 3D reference. The upper strut stack has an original illustrative model of the mount, spring seats and hardware. Each view links to the original drawing. The center support catalog still displays its provider-hosted drawing and callouts.

E30 defaults to a 325i M20. The local preview includes its [catalog](http://127.0.0.1:3012/e30/parts/catalog) and [service manuals](http://127.0.0.1:3012/e30/manual), plus its licensed exterior, repair topics and scanner. The E30 catalog has separately sourced 325i and 318is records and keeps their diagrams and order conditions with the source vehicle. More catalog configurations, mechanical 3D, owner-write integration and E30-specific phone testing remain before release.

The E34 working files and browser receipts are under `work/owner-review-20261111`. The E30 branch and its evidence remain in the separate scanner-repair worktree. No hosted changes were made.
