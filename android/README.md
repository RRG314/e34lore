# Android wrapper

The Gradle project in `project/` wraps the E34 Lore website as a Trusted Web Activity. The [browser app](https://e34lore.com/app) is the install option offered by the website.

Use JDK 21 and the Android SDK. Set `ANDROID_HOME` or provide `project/local.properties` with the local SDK directory.

```sh
cd android/project
./gradlew --no-daemon :app:bundleRelease :app:assembleDebug
```

CI uses the same tasks. The release bundle is unsigned. Keep store credentials and signing keys outside source control. A store build also needs a verified Digital Asset Links association for its domain and signing certificate.
