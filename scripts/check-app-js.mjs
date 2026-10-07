// Syntax-check every browser module in src/.
//
// The files are ES modules, but the repo has no package.json with
// "type": "module", so `node --check file.js` would parse them as
// CommonJS and reject import/export syntax. As the old inline-JS check
// did, each file is copied to a temp .mjs before checking.
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const files = readdirSync(srcDir).filter((f) => f.endsWith(".js")).sort();
if (files.length === 0) {
  console.error("No .js files found in src/");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "app-js-"));
for (const file of files) {
  const target = join(dir, file.replace(/\.js$/, ".mjs"));
  writeFileSync(target, readFileSync(join(srcDir, file), "utf8"));
  execFileSync(process.execPath, ["--check", target], { stdio: "inherit" });
}
console.log(`Syntax OK: ${files.length} modules in src/`);
