# Bellavista Airflow — Findings & Rationale

Reference doc for building the final show. Pulls together what Track A (empirical,
sensor-based) has established so far, and *why* each method was chosen — so claims made in
the show can be traced back to their evidence and their confidence level. Full numeric
evidence lives in `findings.md`; day-to-day project state lives in `CONTEXT.md`. This doc is
a distillation of both — findings, rationale, and the experiments recommended to resolve what
isn't settled yet (no general project todos, no Track B).

**Data window:** 2026-08-21 → 2026-09-12, 36 sensors (18 humidity + 18 temperature) inside the
Bellavista drying shed ("marquesina"), plus 6 external/ambient probes. Two experiment
families: **forced-air** (6 short fan pulses, 20–49 min) and **wet-coffee** (2 concurrent
13-day placements).

---

## Scope

The underlying objective is to (a) recommend where to place coffee based on how much
moisture it still carries, and (b) parametrize IoT control of the shed's hatches, fans and
heating. Track A works from real sensor readings only, independent of the (not-yet-started)
mechanistic model (Track B). Two questions per experiment family: for forced-air, *does the
fan's effect actually propagate outward from its entry point, and in which direction?* For
wet-coffee, *how far does the moisture plume reach, and how fast does each zone dry out after
the coffee is removed?* Humidity is the primary tracer throughout; temperature is secondary.

---

## Rationale

### Why a diff-in-diff correction, not a raw before/after comparison

A forced-air event is a 20–49 minute pulse riding on a diurnal humidity cycle of comparable
size over the 2–3 hour window each event spans — a plain pre-event baseline is confounded by
that drift. The fix adopted: compare the event day against the same time-of-day on "quiet"
days with no logged event, then subtract the ambient/external probes' own anomaly from the
same instant (they see the same shared weather, but sit outside the shed and can't see the
fan). This is diff-in-differences: `corrected_anomaly = anomaly − mean(external anomaly)`.

**Why it was necessary, not optional:** day-to-day ambient humidity variability turned out to
be large (10–22 points RH) and peaks exactly at midday — the same window all 6 forced-air
tests ran in. Without the correction, a comparison is measuring the day's weather more than
the fan. After correction, the residual noise floor (how much the 3 external probes disagree
with *each other* once their shared signal is removed) drops to 0.5–1.9 points — confirming
most of that raw variability was shared weather, not sensor noise, and that subtracting it is
valid.

### Why a systematic gradient check, not just "does the peak clear the noise floor"

An earlier, weaker check only asked whether the corrected anomaly at the *single best* sensor
exceeded 2× the noise floor. That check can pass even when the entire shed responds
uniformly — which is exactly the signature of an *uncorrected climate swing*, not a real fan
effect (see the forced-air findings below). The gradient check instead asks whether amplitude
actually *decays with distance* from the entry point (Spearman correlation between
`dist_to_entry` and `|corrected anomaly|`, computed **separately for humidity and
temperature** — pooling the two channels together was tried once and rejected, since it mixes
incompatible scales and physics into one number). An event only counts as conclusive if
r ≤ −0.3 and p ≤ 0.10. This is a stricter, more decision-relevant bar: it tests for a
*localized* effect, which is what direction-of-propagation questions actually need.

### Why wet-coffee uses a spatial control zone instead of a per-sensor decay fit

Wet coffee is a slow, 13-day *progressive* source, not a pulse — fitting a decay curve to an
isolated sensor's raw trace doesn't separate "coffee effect" from "this location's own daily
weather." Instead: each day, compare the zone next to a coffee pile against a zone far from
**both** concurrent piles (the "control" zone), then baseline-correct against each sensor's
own pre-event offset from that control (the two locations aren't identical to begin with,
independent of coffee — e.g. one line sits nearer the front door than another). This is the
same diff-in-diff instinct as the forced-air correction, applied against an internal spatial
control instead of an external climate control.

### A coordinate correction that changed nothing — because the method only trusts rank order

On 2026-09-26 the user found that the entry point for forced-air tests 3–4 had been
mismeasured: (204, 1380, 60) instead of the real (204, 1680, 60). Re-running the full
gradient check and direction/reach analysis against the corrected coordinate produced
byte-identical output — same r, same p, same conclusive/inconclusive calls, for all 6 tests
and both metrics. This isn't a coincidence: every statistic here is a Spearman (rank)
correlation between distance-to-entry and amplitude, precisely because absolute event
magnitude/position was known to be uncertain (see the plan's own "lean on ordering, not
absolute values" principle). All 14 humidity sensors sit at y ≤ 1340, strictly on one side of
both the wrong and the correct entry position — shifting the entry 300 cm farther in the same
direction is a monotonic change that can't reorder which sensor is closer or farther, so the
rank statistic is mathematically invariant to it. The one thing that *did* change was the
absolute `dist_to_entry` values (used for the "nearest opening" distances in the table above)
and the entry marker's plotted position.

**Important limitation this rationale surfaces:** the two wet-coffee placements run
**concurrently**, at the exact same `[start, end]` window, at two different locations. A
sensor far from both piles measures their *combined* effect — there is no way to attribute it
to one pile individually. Only the sensor immediately adjacent to each pile (the nearest
sensor line, ~83–90 cm away) actually separates the two. An earlier draft of this analysis
computed two near-duplicate reach/decay tables (one per pile) using the same underlying
signal against each pile's distance — that was a methodological error, corrected by reporting
one combined table keyed on distance-to-nearest-pile for anything beyond the adjacent sensor.

---

## Findings: forced-air

**Headline: only 2 of the 6 forced-air tests are conclusive by the gradient check.** An
earlier informal read of the data ("5 of 6 validated") used the weaker single-sensor
threshold described above; the systematic check revises that down.

| Test | Date/time | Entry point | Nearest opening | r (dist vs. amplitude) | p | Conclusive? |
|---|---|---|---|---|---|---|
| 1 | 22-Aug 12:00 | (204, 50, 60) — front | Puerta S, 204 cm | −0.86 | 8×10⁻⁵ | **Yes** |
| 2 | 22-Aug 14:00 | (30, 820, 140) — mid-depth | Ventana O, 513 cm | +0.32 | 0.26 | No |
| 3 | 22-Aug 16:00 | (204, 1680, 60) — back | Puerta N, 204 cm | −0.85 | 1×10⁻⁴ | **Yes** |
| 4 | 23-Aug 09:00 | (204, 1680, 60) — back | Puerta N, 204 cm | +0.07 | 0.82 | No |
| 5 | 23-Aug 11:00 | (30, 820, 140) — mid-depth | Ventana O, 513 cm | +0.58 | 0.025 (wrong sign) | No |
| 6 | 23-Aug 13:00 | (204, 50, 60) — front | Puerta S, 204 cm | −0.42 | 0.12 | No |

("Nearest opening" is the real 3D distance from the entry point to the closest edge of that
opening's full extent — `config.yaml`'s `openings:` block, corrected 2026-09-26 from
`config.json`'s single-point features. The entry coordinate for tests 3–4 was also corrected
that day, from a mismeasured (204, 1380, 60) to the real (204, 1680, 60); every statistic in
this doc was recomputed and came out identical — see "A coordinate correction that changed
nothing" below.)

(Humidity channel; correlation is between distance-to-entry and \|corrected peak anomaly\|.
Test 4's earlier diagnosis: that morning's ambient humidity swung from about −8 to +19 points
in 1.5 hours — faster than the shed's own thermal/hygric inertia could track, which shows up
as a near-uniform negative anomaly across the whole volume rather than a local effect.)

**Direction & reach, for the 2 conclusive tests only** (not generalized to the other 4 — their
gradient isn't distinguishable from climate noise):

- **Test 1** (entry at the front, near-floor): latency *increases* with distance (r=+0.61,
  p=0.02) — the humidity peak arrives measurably later at sensors farther away. This is the
  signature of a genuinely propagating front. More signal on the front half of the shed than
  the back (as expected, given the entry point).
- **Test 3** (entry at the back, near-floor): amplitude decays with distance just as strongly
  (r=−0.85), but latency does **not** correlate with distance (r=−0.07, n.s.) — the peak
  arrives at roughly the same time everywhere, just weaker far from the entry. More signal
  near the floor and on the back half, consistent with the entry point, but this looks like
  attenuated diffusion rather than a traveling front.

These are two different physical signatures under the same "forced-air" label; with only 2
usable tests there isn't enough evidence to say which is the shed's typical behavior.

---

## Findings: post-fan-off dynamics

Field detail from the user (not in `data/events.csv`): doors stayed closed for all 6 tests.
On day 2 only (tests 4-6), both windows were opened right after each test's fan-off and held
open for over 60 minutes; on day 1 nothing was opened. This reframes day 2 from "a noisier
repeat of day 1" into a genuinely different experiment — fan pulse + assisted venting, vs.
fan pulse + natural relaxation — which the original gradient check couldn't distinguish
because it only ever checked distance against the fan's entry point.

Checking the post-fan-off anomaly (30-90 min after fan-off) against distance to the fan vs.
distance to the nearest window:

| Test | vs. fan distance | vs. window distance | Reading |
|---|---|---|---|
| 1 (day 1, front) | r=−0.80, p=0.001 | r=+0.24, n.s. | centered on the fan, as expected with no venting |
| 2 (day 1, mid) | r=+0.56, p=0.035 (wrong sign) | r=−0.27, n.s. | neither fits well |
| 3 (day 1, back) | r=−0.60, p=0.022 | r=+0.03, n.s. | centered on the fan |
| 4 (day 2, back) | r=+0.49, p=0.072 (wrong sign) | r=−0.33, n.s. | neither fits — still best explained by that morning's climate swing (test 4's existing diagnosis) |
| **5 (day 2, mid)** | **r=+0.41, p=0.125 (wrong sign)** | **r=−0.72, p=0.003** | **re-centers on the window** |
| 6 (day 2, front) | r=+0.38, p=0.164 | r=+0.11, n.s. | neither fits |

Test 5 is a real, clean result — the post-phase anomaly correlates with distance to the
window (correct sign, p=0.003) and not with distance to the fan, exactly where the fan itself
never had a competing signal to begin with. That's genuine evidence that opening the windows
doesn't just add noise — it relocates where the humidity signature is centered. **Caveat:**
for this entry (against the x=0 wall), distance-to-window and distance-to-fan aren't
independent — the windows sit on the opposite wall (x=440), so "close to window" and "far
from fan" partly describe the same sensor column. This is consistent with the venting
hypothesis, not an isolated proof of it. The other two day-2 tests don't help resolve it
further: test 4 still fits its own already-diagnosed climate-swing explanation better than
either geometry, and test 6 fits neither.

The decay-magnitude comparison (does day 2 return to baseline faster?) is too confounded by
other differences — entry location, pulse duration, and available time horizon — to read
cleanly on its own.

**What this means for the IoT objective:** one out of three day-2 tests gives a clean signal
that post-cycle venting changes *where* the residual humidity sits, not just how much of it
there is. That's directly relevant to hatch/vent control, but it's 1 data point, produced as
a side effect of a different experiment rather than a deliberate one. The natural next step
is a dedicated experiment: same entry point, fan pulse, then a *logged* venting protocol
(which opening, exact timing, duration) instead of one reconstructed from memory afterward —
see the confidence table below.

---

## Findings: wet-coffee

**Rise phase (first 5 days, both piles combined):** humidity rose across nearly the entire
shed, not just close to the coffee. The sensor immediately next to each pile shows the
strongest, most reliable signal — +8.8 points RH (pile at x=204) and +9.4 points (pile at
x=355) above the pre-event baseline. But nearly every other internal sensor out to ~9 m from
the nearest pile also shows a corrected rise of roughly +2 to +4 points, without a marked
fall-off across that range. The control zone (the line farthest from both piles, ≥10 m away)
is, by construction, the reference with no rise. One sensor (id 311, +7.95) is an outlier
whose pre-event baseline was estimated from only 2 days of data instead of 4 (its own
`replaceBefore` data-quality cutoff cut its history short) — treat that one point as less
reliable than the rest.

**Decay phase (5 days after removal on 7-Sep, the only post-removal data available):**
almost every sensor with signal shows a negative slope (drying back toward baseline), ranging
from −0.01 to −0.25 points RH/day — directionally consistent with drying everywhere. **None of
these slopes is individually statistically significant** (all p > 0.11, n=5 days per sensor) —
the direction is suggestive, the magnitude is not yet confirmed. One sensor (id 323, at the
far edge of the sensor grid) shows a small positive slope (+0.056, also not significant),
plausibly just noise given the small n.

**What this means for placement:** proximity to a pile isn't what predicts a drier spot during
storage — most of the shed shares a similar humidity load while wet coffee is present. The one
zone that stands apart is the far line near "Ventana O," which shows no rise at all; that's
the strongest, most defensible candidate for a "drier zone" claim, precisely because it's
qualitatively different (no signal) rather than a fuzzy gradient. The decay/drying-rate
question — the one most directly relevant to a placement recommendation — needs more days of
post-removal data before any per-zone rate can be shown with confidence.

---

## Confidence summary — what the show can and can't claim yet

| Claim | Status | Basis |
|---|---|---|
| Diff-in-diff correction removes most of the day-to-day climate confound | **Solid** | Residual noise floor 0.5–1.9 pts vs. 10–22 pts raw |
| Only 2 of 6 forced-air tests show a real, localized fan effect | **Solid** | Systematic gradient check, both metrics computed separately |
| Those 2 tests show two different propagation patterns (traveling front vs. uniform attenuation) | **Solid, but n=2** | Latency-vs-distance correlation |
| Wet coffee raises humidity across most of the shed, not just nearby | **Solid** | Consistent across 11 of 12 non-control internal sensors |
| The far corner (Ventana O line) is a distinct "unaffected" zone | **Solid** | Zero rise vs. clear rise everywhere else |
| Wet-coffee zones dry out at different rates after removal | **Not yet confirmed** | Directionally consistent, but no slope is statistically significant (p>0.11, n=5 days) |
| Forced-air fan settings could be parametrized (settling time, etc.) from this data | **Not supported yet** | Sample too small/inconsistent (2 usable tests, 2 different dynamics) |
| Post-fan-off venting relocates the humidity signature toward the opened window | **Suggestive, n=1** | One of three day-2 tests, correct sign, p=0.003 — but distance-to-window and distance-to-fan are partly collinear for that entry point |
| Venting speeds up the return to baseline after a fan pulse | **Not supported yet** | Decay-magnitude comparison too confounded (location, pulse duration, available horizon) to read |
| Being ~2 m from an opening (not the door itself) is what makes a fan test locally detectable | **Suggestive** | The only 2 conclusive tests are both exactly 204 cm from a door; the mid-shed entry (513 cm from the nearest opening) never showed a gradient in 2 tries — but n=3 entry points total, and the mechanism (wall confinement vs. actual air exchange) isn't isolated from other explanations |

---

## Recommended experiments — what would actually move each open question

Ordered by which claim above it would resolve.

**1. Isolate the opening-proximity effect from everything else (resolves the door-proximity row, and would give the propagation-pattern row a 3rd data point).**
Same entry point, same fan/nebulizer settings, run twice: once with the nearest door/window
open, once closed. Right now "near an opening" and "day 1 vs day 2" are tangled together —
every test that ever showed a gradient was also a day-1 test, and every day-2 test also had
venting. A same-day, same-location, open-vs-closed pair is the only way to tell whether
proximity to a wall opening matters because of the opening (air exchange) or just because of
the solid boundary next to it (a wall-jet effect that a closed door would produce just as
well).

**2. Schedule future forced-air validation runs on climatically calm mornings (resolves the
day-1-vs-day-2 pattern, addresses why 4 of 6 tests failed).**
Pull the external-sensor trace for the scheduled window *before* running the test (the same
5-minute external humidity series already built for `external_humidity_5min.csv`) and only
run when it's flat. Test 4's failure is already diagnosed as a fast climate swing; screening
for that condition in advance, instead of discovering it after the fact, should raise the
conclusive-test rate on its own.

**3. Give same-day tests enough gap to see the full post-decay curve (resolves the "decay
magnitude" reading in the post-fan-off finding).**
The current ~2-hour spacing between same-day tests forces the post-window analysis to clip at
~90 minutes to avoid bleeding into the next test — too short to see whether the anomaly fully
returns to baseline. Either space same-day tests further apart, or accept fewer tests per day
in exchange for a clean, uncut decay trace.

**4. A dedicated, logged venting experiment (resolves both post-fan-off rows).**
Same entry point, fan pulse, then a *deliberately logged* venting protocol — which opening,
exact open/close timestamps, duration — as structured data captured at the time, not
reconstructed from memory afterward the way this round's window-opening detail was. Run a
paired no-vent trial at the same location for direct comparison. This is the only way to
turn the current n=1 clean result into an actual pattern.

**5. More post-removal days for the current wet-coffee placements (resolves the wet-coffee
decay row).**
No new experiment needed — the two piles are already removed (7-Sep); the decay analysis
just needs re-running once more days of post-removal sensor data have accumulated in the DB,
since the current 5-day window doesn't have the statistical power to call any single zone's
drying rate significant (all p > 0.11).

**6. Test the "isolated corner" directly instead of inferring it from an absence of signal
(sharpens the wet-coffee placement row).**
Place a wet-coffee pile at (or very near) the Ventana O line itself — the zone that showed no
rise from the two existing piles — and see whether it also disperses broadly like the current
placements, or actually stays contained the way its lack of received signal suggests. Right
now that zone's "isolated" status is inferred from what it *doesn't* receive from elsewhere;
this would test it as a source instead.

**7. A direct grain-moisture measurement, not just ambient air humidity (a structural
limitation, not a fixable analysis gap).**
Every wet-coffee finding here is about air humidity around the pile, which is a reasonable
proxy but not the same thing as how much moisture the coffee itself is carrying. If the
placement decision needs to be about the coffee's own drying trajectory specifically, that
needs either weighed samples or an in-grain moisture sensor at a few candidate zones — no
amount of re-running the current sensor data gets there.
