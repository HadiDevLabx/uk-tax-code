# UK tax code decoder

Type a tax code, get what it actually means — the allowance it grants, the
rate it applies, and whether it is an emergency code. England, Wales and
Scotland.

**Live:** <https://hadidevlabx.github.io/uk-tax-code/>

One static page. No framework, no build step, no dependencies, no tracking.

## Codes it handles

| Form | Example | Meaning |
| --- | --- | --- |
| Number + letter | `1257L` `1383M` `1131N` `1257T` | Allowance = number × 10 |
| No allowance | `0T` | Allowance gone or unknown; normal bands still apply |
| Flat rate | `BR` `D0` `D1` | Whole income at one rate |
| Negative allowance | `K475` | £4,750 *added* to taxable pay, 50% overriding limit |
| No tax | `NT` | Nothing deducted |
| Region | `S1257L` `C1257L` | Scottish / Welsh rates |
| Emergency | `1257L M1` `1257L W1` `1257L X` | Non-cumulative |

## The bit worth knowing

`D0` means 40% in England but **21%** in Scotland. D-codes count bands *above
basic*, and Scotland has six bands to England's three, so the same letter lands
somewhere else entirely. The decoder resolves them by band index rather than by
hardcoded rate, which is why `SD0`→21%, `SD1`→42%, `SD2`→45%, `SD3`→48%.

That is also the case most decoders get wrong, so it has its own assertions in
[`test.mjs`](test.mjs).

## Rates

Fetched at page load from [uk-tax-rates](https://github.com/HadiDevLabx/uk-tax-rates),
a free CC BY 4.0 dataset of UK income tax bands, NI thresholds and student loan
plans. The page ships fallback figures and works offline if the fetch fails.

## Test

```bash
node test.mjs
```

It extracts the real script out of `index.html` and asserts against it, so the
test cannot drift from what ships.

## Take it further

This explains the code. To apply one to an actual salary, see the
[tax code checker](https://truetakehome.co.uk/tax-code-checker/) on
[True Take-Home](https://truetakehome.co.uk/).

**Not tax advice.** Your HMRC coding notice is the authority on your own code.

MIT licensed.
