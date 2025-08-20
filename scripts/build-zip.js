// scripts/build-zip.js
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(DIST, "computed-css-inspector.zip");

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error("src/ not found. Are you in the repo root?");
    process.exit(1);
  }
  fs.mkdirSync(DIST, { recursive: true });

  const output = fs.createWriteStream(OUT);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`Built: ${OUT} (${archive.pointer()} bytes)`);
  });
  archive.on("warning", (err) => { if (err.code !== "ENOENT") throw err; });
  archive.on("error", (err) => { throw err; });

  archive.pipe(output);
  // include contents of src/ at zip root
  archive.directory(SRC + "/", false);
  await archive.finalize();
})();
