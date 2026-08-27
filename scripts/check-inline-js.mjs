import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const html = readFileSync("index.html", "utf8");
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!match) {
  console.error('No inline <script type="module"> found in index.html');
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "inline-js-"));
const file = join(dir, "inline.mjs");
writeFileSync(file, match[1]);

execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
console.log("Inline JS syntax OK");
