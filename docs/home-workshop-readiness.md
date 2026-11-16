> Released as Sites v33 at https://e34lore.com from `e919aea93801ba085b219718d6d3319cf0d2d832`, after the owner explicitly requested publication. The previous hold below is historical. [The integrated release](security-current-release.md) records successful deployment, live route/security/browser checks and remaining gaps. Geometry limits remain unchanged.

# Current component-separation correction

The owner's later review supersedes the rigid whole-engine/whole-axle separation described in the older receipt below. The r14 asset bytes and installed transforms are unchanged. `component-separation.ts` now supplies individual modeled-part targets, carried door context and engine/brake/suspension layers. All four door skins have distinct outward and fore/aft positions; their glass, mirrors, cards and trim separate at the next layer. Original roof/fender/quarter regions remain one continuous body reference rather than being torn along arbitrary triangle boundaries.

The slider uses the same fraction of each authored target at every amount. Hidden modeled engine internals become visible while separated; View options reflects that automatic state and permits changes again after reassembly. Parts settle briefly toward each user-selected position, then stop requesting frames; reduced-motion uses immediate positions. There is no automatic explode/reassemble loop. Orbit sensitivity adapts to viewport shape and zoom/pan are gentler. Refitting preserves the current direction and projects occupied component bounds rather than empty union-box corners.

Verified: 239 unit tests, 32 importer tests, typecheck/build; targeted new files pass lint. The 26-test reference suite covers four disjoint door boxes, body clearance, ordered brake layers, engine/piston clearance, individual component visibility, bounded extent, reversible proportional movement and actual camera-frustum coverage. Desktop mouse gestures confirm horizontal/vertical orbit and zoom; resizing and slider refits keep the direction (observed dot product >0.999999). Full separation renders all 454 groups. The idle render counter stayed at 120 across separate observations: the held view does not animate in a loop. Native mesh picking selected the left rear door; choosing the From 09/1991 position displayed BMW `41528185067`, its exact source position, interchange link and manual 411-1 / PDF 337. The mobile layout at 390×844 and restored 438×529 fits its control strip and has no horizontal overflow; front-door lookup, isolation and detail panel work. No console errors were observed. Browser resizing is not a real Android-device pinch or Play release test.

This is a detailed visual separation of the existing modeled inventory. It does not manufacture missing clips/fasteners, validate every pairwise clearance along the motion, establish factory panel seams or certify repair/removal order. The owner's website/model release hold remains in force. Source graph r14 / commit `3433928` is retained; source GLBs, OEM bindings, thumbnails and saved-model archives are preserved.

HTTP/data verification also passes for 68 server-rendered routes, all 49 manual sections, catalog/guide revisions, interchange source links, anonymous isolation and private support boundaries. The actual owner garage and add-car form load; cancelling leaves no test records. Browser photo upload and real account deletion were not performed on the owner account.

The final control adjustment passed another typecheck/build and browser check: 454 parts at 100%, settled motion, automatic internals checked/disabled, and unchecked/enabled after reassembly. The expanded frame fits the current 1280×451 desktop viewport. New separation/layout/renderer modules have zero lint diagnostics. The existing reader component still reports eight pre-existing lint errors and four warnings (effects/memoization/document links); full-repository lint is not claimed clean. The disposable PostgreSQL test server was stopped after verification; the loopback website preview remains available.

The separate roadmap/support extension and approved backend-only installation are described in [support and roadmap](support-roadmap.md). The owner has explicitly deferred email setup. Its credential handoff and actual email verification are unfinished; this does not change the website/model publication hold.

---

# Homepage, vehicle catalog and r14 workshop — local review

Date: 7 November 2026. Branch: `steven/full-car-reference-preview`. Website: `/local/owner/Developer/e34-collective`. Geometry owner: `/local/owner/Developer/e34-digital-twin-studio`, commit `3433928`.

## Release status

**Website/model not deployed.** Production remains Sites v32 / r13. The owner authorized a release only after the outstanding work is complete. Complete manufactured geometry, small installed hardware/routing and verified pairwise fit/removal remain open. The homepage/model milestone did not change hosted DNS, credentials, database records, migrations, audience settings or site deployments. The separate, explicitly approved support backend/DNS installation is recorded in [support and roadmap](support-roadmap.md); email activation is deferred and the support feature remains inactive.

## Implemented

- Mobile Workshop and Quick reference shortcuts beside the vehicle picker; visible at 390 and 320 CSS pixels without horizontal overflow.
- Selected-car scoping across site search, OEM catalog and the new `/parts/interchange`. Vehicle hydration is explicit. A changed car resets stale source context; an unsupported selection never silently selects another car. Explicit source-position links retain their own context and mismatch warning.
- Search aliases retain both “water pump” and “coolant pump” source vocabulary. The 540i and 525i return their own source records. Clearing the vehicle really clears the active configuration.
- Visible Interchange navigation on desktop and mobile, with source-listed replacements, exact source positions, conditions, separately reviewed interchange evidence, linked community questions and sharing. Replacement records paginate rather than silently ending at 100.
- Six attributed, real E34 photographs plus an initial interactive model slide. One shared, checksum-pinned reader supplies the hero and full workshop. Interaction pauses the reel; hidden tabs/reduced motion stop automatic rotation. Inactive 3D slides dispose their resources.
- Desktop installation section with a QR encoding `https://e34lore.com/app`, genuine browser install support and iPhone/Android instructions. The section does not claim a public Play Store release.
- Original black/white wide E34 grille mark, favicon and app icons. The corrected wide/short kidney outline is based on observed E34 grille photographs; no external photograph is embedded in the mark. Regenerate the icon set with `node scripts/build-grille-icons.mjs`.

## Geometry and catalog

r14 exports 505 graph nodes, **454 renderable groups, 451 distinct current thumbnails**, four runtime assets totaling **5,493,448 bytes**. There are 59 body groups. Four outer door skins now follow source inner-frame outlines using source-conserving triangle clipping. Each complete mirror and each trunk-mounted rear lamp is independently selectable. Hood/trunk emblems, door glass, matching mouldings, mirrors and retained door cards have proper assembly parents without moving their installed geometry.

Whole-car display separation keeps attached components together. Focused doors expose glass, mirror, moulding and trim; hood/trunk views expose attached emblems and lamps. Continuous welded/artist body regions stay connected. This is a display layout, not a certified physical removal path. Old r13 assets and saved views remain pinned and reopen through `/workshop?model_revision=13`; saving a new view does not overwrite old-revision views.

All 454 modeled groups have authored catalog/service bindings. This does not mean each group is a separately supplied BMW part or every installed part is modeled. Separate mirror and inner/outer lamp records preserve side and source conditions. The inner lamp uses a manual locator; it does not inherit the body-mounted lamp walkthrough. Public selection contains 397 source assemblies, **10,183 valid ordering positions and 8,233 distinct source-listed numbers** after the correction below. Canonical BMW identities remain unchanged.

## Applicability-note correction

Browser testing exposed water pumps appearing as callout 12 in a fuel-breather drawing. The retained source distinguishes these as `codeEmpty` applicability children, linked to a parent by `replaceOE`. These are neither ordering positions nor supersessions. The parent retains its “Only Applies To” conditions.

The audit reproduced normalized source facts from preserved HTML for **3,796 pages / ten selections**, including the four later gap imports. **2,712** invalid ordering rows are excluded. The corrected projection contains **87,562** valid positions; the hosted pre-repair inventory still contains 90,274. The projection updates matching old inventory totals once and leaves later server imports alone. Primary identities, quantities, conditions, genuine replacement observations and previous snapshots are retained.

`data/catalog-applicability.json` records per-page source hashes and counts. `data/catalog-position-exclusions.json` supplies the small shared public guard. Every public ordering surface applies it, including search, assembly rows, explicit position entry, other occurrences, interchange and reviewed evidence. Workshop source records publish under immutable `r2`; old `r1` bytes are retained. The prepared SQL deactivates these exact positions without deleting canonical identities or history. **It has not been applied to production.**

Reproduce the audit with a retained pre-fix parser and the original caches:

```
git show f2de557:tools/import_public_catalog.py > work/catalog-legacy-parser.py
python3 tools/audit_catalog_applicability.py --legacy-parser work/catalog-legacy-parser.py --output-dir work/catalog-applicability
python3 tools/author_component_catalog_rules.py
node --experimental-strip-types scripts/compile-component-catalog.mts
```

The audit fails unexplained primary-row changes and missing retained evidence. Future imports reject applicability children and never interpret `replaceOE` as a replacement.

## Verification

Source: **151 TypeScript tests / 18 files, 50 Python tests, typecheck and build passed**. Actual decoded runtime tests verify four outer door ray hits, complete mirror/lamp triangle groups, conserved source area/atlas and the 408-group visual body-envelope gate. Khronos reports zero errors/warnings. Updated body thumbnails rendered with zero failures.

Website: **216 unit tests / 28 files, 32 importer tests, typecheck and production build passed**. After final copy changes, targeted catalog/workshop suites and typecheck/build passed again. Targeted new-module lint has zero errors, with two existing-style static image optimization warnings. Full repository lint debt is not claimed fixed.

Browser checks: hero r14 loading, held slider at four and reset to zero, all seven slide controls; mobile shortcuts at 390/320; 540i catalog and site-search scoping; actual 525i-to-540i context switching; unsupported 1995 M5 refusal; new mirror OEM alternatives/manual panel; direct trunk-lamp picking; horizontal and vertical native orbit, zoom, expand, engine visibility and reassembly. The final narrow viewport override was reset. The source-bound account/garage verification from the previous preview milestone remains preserved; real owner data was not changed in this work.

Additional live setup and physical geometry acceptance remain explicit release requirements. Passing software tests is not a complete factory CAD/installed-BOM claim.
