# Development and releases

Use the [development commands](../README.md#development) for a loopback preview or a local production-mode build. Use the [contribution guide](../CONTRIBUTING.md) for issues and pull requests.

GitHub Actions verifies source. It has no production deployment job or production environment. Keep production credentials in the hosting and database services. Check pull request workflow changes before allowing a fork run. Production releases are explicit maintainer operations.

Build and review changes locally before releasing. Keep released model revisions available for saved views and builds. Test account, Garage, and upload changes with synthetic records in an isolated database.

## Production source

The live site is [e34lore.com](https://e34lore.com). Record the source commit and model revisions for each production deployment. Use version tags for source releases.

Build with `E34_E30_BUILD=1` to include both series. The Sites deployment configuration lives in the maintainer's local `.openai/hosting.json`. Local and CI builds work without it. On macOS, run the Sites packaging command with `COPYFILE_DISABLE=1` so filesystem metadata does not inflate the upload. The size check runs after unshipped preview revisions are excluded and model assets are packed. The deployed reader verifies the original asset hashes after decoding.

## Before public visibility

- Audit all branches, tag and pull request references, closed issues, and CI logs. Redact personal Git metadata and private provisioning details. Restricted material in old commits still needs removal even when the current files are clean. GitHub pull request refs and cached views can survive a history rewrite. [GitHub history removal](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- Check the [license scope](../NOTICE) and verify redistribution rights for each third-party asset, including models, diagrams, manuals, photos, and bulk catalog snapshots. Keep attribution with distributed assets. Use public source links or an authorized substitute where redistribution is unavailable.
- Verify local account, Garage, and community development against an isolated Supabase stack with synthetic data. Keep owner-specific staff provisioning outside the repository.

The full local Workshop build uses provider-sourced catalog snapshots and derived indexes. Keep public distribution on hold until their redistribution is cleared or the build uses cleared replacement data. Apply the same check to the source tree and every history reference before changing repository visibility.

## When opening the repository

Enable protection for `main` when it is available on the repository's plan. Require a pull request and passing `check` and `android` jobs from **Verify E34 Lore**. Disallow force pushes and deletion. Keep merge access with maintainers. With one maintainer, require a pull request with zero required approvals. Require a maintainer approval once a second reviewer is available. GitHub Free supports branch protection for public repositories. [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

Keep Actions permissions read-only and require maintainer approval for outside fork runs. Before announcing the project, use a GitHub account without repository access to open an issue, fork the code, and submit a pull request. Verify the fork can run checks after approval and the contributor cannot merge or deploy the app. GitHub Free exposes these settings and public-fork checks after the repository changes visibility.
