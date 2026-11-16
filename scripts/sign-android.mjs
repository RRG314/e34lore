// E34-only signing. The password stays in the macOS Keychain and process memory.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, chmodSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../", import.meta.url));
const jdk = process.env.JAVA_HOME;
if (!jdk) throw new Error("Set JAVA_HOME to a JDK 21 installation.");
const password = execFileSync(
  "/usr/bin/security",
  [
    "find-generic-password",
    "-a",
    "E34 Lore Android",
    "-s",
    "com.e34lore.android.upload",
    "-w",
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
).trim();
if (!password) throw new Error("E34 upload password is unavailable.");
const env = { ...process.env, E34_KEYSTORE_PASSWORD: password };
const privateDir = root + "android/.private",
  keystore = privateDir + "/e34-upload.keystore";
mkdirSync(privateDir, { recursive: true, mode: 0o700 });
if (!existsSync(keystore))
  execFileSync(
    jdk + "/bin/keytool",
    [
      "-genkeypair",
      "-keystore",
      keystore,
      "-alias",
      "e34-upload",
      "-storetype",
      "PKCS12",
      "-keyalg",
      "RSA",
      "-keysize",
      "4096",
      "-validity",
      "10000",
      "-dname",
      "CN=E34 Lore, OU=Android, O=E34 Lore",
      "-storepass:env",
      "E34_KEYSTORE_PASSWORD",
      "-keypass:env",
      "E34_KEYSTORE_PASSWORD",
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
chmodSync(keystore, 0o600);
const cert = execFileSync(
  jdk + "/bin/keytool",
  [
    "-exportcert",
    "-keystore",
    keystore,
    "-alias",
    "e34-upload",
    "-storepass:env",
    "E34_KEYSTORE_PASSWORD",
  ],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
const fingerprint = createHash("sha256")
  .update(cert)
  .digest("hex")
  .toUpperCase()
  .match(/.{2}/g)
  .join(":");
writeFileSync(
  root + "android/upload-certificate.json",
  JSON.stringify(
    {
      packageId: "com.e34lore.app",
      alias: "e34-upload",
      sha256: fingerprint,
      purpose:
        "Upload certificate only. Use the Google Play app-signing certificate for Digital Asset Links.",
    },
    null,
    2,
  ) + "\n",
);
const unsigned = root + "outputs/e34-lore-release-unsigned.aab",
  signed = root + "outputs/e34-lore-release-signed.aab";
if (!existsSync(unsigned))
  throw new Error(
    "Compile and copy the unsigned release bundle to outputs first.",
  );
execFileSync(
  jdk + "/bin/jarsigner",
  [
    "-keystore",
    keystore,
    "-storepass:env",
    "E34_KEYSTORE_PASSWORD",
    "-keypass:env",
    "E34_KEYSTORE_PASSWORD",
    "-signedjar",
    signed,
    unsigned,
    "e34-upload",
  ],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
console.log(
  JSON.stringify({
    signedBundle: signed,
    uploadCertificateSha256: fingerprint,
    keychainService: "com.e34lore.android.upload",
  }),
);
