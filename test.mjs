// Runnable check for the decoder. Extracts the real script out of index.html
// so the test cannot drift from what ships — there is no second copy of the
// logic to keep in sync.
//
// Run: node test.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Stub the three browser things the script touches at load.
const el = () => ({
  value: "", innerHTML: "", dataset: {}, focus() {}, addEventListener() {},
});
const ctx = {
  document: {
    getElementById: el,
    querySelectorAll: () => [],
  },
  fetch: () => Promise.reject(new Error("offline in test — fallback figures stand")),
};

const run = new Function(
  "document", "fetch",
  src + "\nreturn { decode: decode, RATES: RATES };"
);
const { decode } = run(ctx.document, ctx.fetch);

const row = (r, k) => (r.rows.find(([label]) => label === k) || [])[1];

// --- standard codes ---------------------------------------------------------
let r = decode("1257L");
assert.equal(row(r, "Tax-free allowance"), "£12,570 a year");
assert.equal(row(r, "Per month"), "£1,048");
assert.equal(r.region, "England and Northern Ireland");
assert.equal(r.emergency, false);

r = decode("1131N");
assert.equal(row(r, "Tax-free allowance"), "£11,310 a year");
assert.match(r.lines.join(" "), /transferred 10%/);
assert.match(r.lines.join(" "), /£1,260 below/); // 12570 - 11310

r = decode("1383M");
assert.match(r.lines.join(" "), /received 10%/);
assert.match(r.lines.join(" "), /£1,260 above/);

// --- no-allowance codes -----------------------------------------------------
r = decode("0T");
assert.match(r.title, /No tax-free allowance/);
assert.equal(row(r, "Allowance"), "None");

r = decode("NT");
assert.equal(row(r, "Tax deducted"), "None");

r = decode("BR");
assert.equal(row(r, "Rate"), "20%");

// --- D codes: the band-index rule, the whole reason this test exists ---------
// England D0 is the first band ABOVE basic → 40%. Scotland's D0 is 21%,
// because its basic rate sits behind a 19% starter band, so "one above basic"
// lands on the intermediate rate rather than the higher one.
assert.equal(row(decode("D0"), "Rate"), "40%");
assert.equal(row(decode("D1"), "Rate"), "45%");
assert.equal(row(decode("SD0"), "Rate"), "21%");
assert.equal(row(decode("SD1"), "Rate"), "42%");
assert.equal(row(decode("SD2"), "Rate"), "45%");
assert.equal(row(decode("SD3"), "Rate"), "48%");
assert.equal(row(decode("CD0"), "Rate"), "40%"); // Wales tracks England
assert.ok(decode("D9").warn, "D9 exists in no region and must warn");

// Scottish BR is the 20% basic rate, not the 19% starter rate.
assert.equal(row(decode("SBR"), "Rate"), "20%");

// --- K codes ----------------------------------------------------------------
r = decode("K475");
assert.equal(row(r, "Added to taxable pay"), "£4,750 a year");
assert.equal(row(r, "Overriding limit"), "50% of each payment");
assert.match(r.title, /added to your taxable pay/);

// --- prefixes and suffixes compose ------------------------------------------
r = decode("S1257L");
assert.equal(r.region, "Scotland");
assert.equal(row(r, "Tax-free allowance"), "£12,570 a year");

r = decode("1257L M1");        // space must not break the match
assert.equal(r.emergency, true);
assert.equal(row(r, "Tax-free allowance"), "£12,570 a year");

r = decode("S1257L W1");       // prefix AND suffix together
assert.equal(r.region, "Scotland");
assert.equal(r.emergency, true);
assert.equal(row(r, "Tax-free allowance"), "£12,570 a year");

assert.equal(decode("1257lx").emergency, true);   // lowercase, X suffix
assert.equal(decode("  1257 L ").emergency, false); // stray whitespace

// --- rejects ----------------------------------------------------------------
assert.ok(decode("HELLO").warn);
assert.ok(decode("12X7Q").warn);
assert.equal(decode(""), null);

console.log("decoder: all assertions passed");
