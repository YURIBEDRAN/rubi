"""Generates the animated SVGs used in the README (python docs/assets/build_svgs.py).

GitHub renders SVGs referenced with <img> and runs their CSS animations,
so everything here is self-contained: no scripts, no external fonts.
"""
from pathlib import Path

OUT = Path(__file__).parent
BG, PANEL, LINE, TEXT, MUTED = "#0b0d12", "#12151c", "#252a36", "#e8eaf0", "#8b93a7"
RUBY, RUBY2, OK, WARN, GRAY = "#e0245e", "#ff5c8a", "#3ccf91", "#f5b84a", "#6b7385"
SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif"
MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"

GEM_DEFS = f"""<linearGradient id="gem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{RUBY2}"/><stop offset="1" stop-color="#9b113e"/></linearGradient>"""


def gem(x, y, s):
    k = s / 64
    return (f'<g transform="translate({x},{y}) scale({k})">'
            '<path d="M14 8h36l12 16-30 34L2 24z" fill="url(#gem)"/>'
            '<path d="M2 24h60M14 8l8 16 10 34 10-34 8-16M22 24l10-16 10 16" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/></g>')


def simulate(turns=600, per=1500, base=48000, win=150000, native=967000):
    def run(rubi):
        ctx, out = base, []
        for _ in range(turns):
            ctx += per
            if ctx >= (win if rubi else native):
                ctx = base + 12000
            out.append(ctx)
        return out
    return run(False), run(True)


def path(values, x0, y0, w, h, vmax):
    n = len(values)
    pts = [(x0, y0 + h - h * 48000 / vmax)] + [(x0 + w * (i + 1) / n, y0 + h - h * v / vmax) for i, v in enumerate(values)]
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)


# ---------------------------------------------------------------- hero
def hero():
    W, H = 1200, 420
    a, b = simulate()
    vmax = 1_000_000
    cx, cy, cw, ch = 140, 250, 920, 130
    pa, pb = path(a, cx, cy, cw, ch, vmax), path(b, cx, cy, cw, ch, vmax)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Rubi: only what's precious stays in context">
<defs>{GEM_DEFS}
<radialGradient id="glow" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="{RUBY}" stop-opacity=".32"/><stop offset="1" stop-color="{RUBY}" stop-opacity="0"/></radialGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{RUBY}" stop-opacity=".28"/><stop offset="1" stop-color="{RUBY}" stop-opacity="0"/></linearGradient>
<clipPath id="r"><rect width="{W}" height="{H}" rx="24"/></clipPath>
</defs>
<style>
.draw{{stroke-dasharray:4000;stroke-dashoffset:4000;animation:d 7s ease-in-out infinite}}
.b{{animation-delay:.15s}}
@keyframes d{{0%{{stroke-dashoffset:4000}}55%,88%{{stroke-dashoffset:0;opacity:1}}100%{{stroke-dashoffset:0;opacity:0}}}}
.pulse{{animation:p 2.4s ease-in-out infinite;transform-origin:600px 78px}}
@keyframes p{{50%{{transform:scale(1.06)}}}}
</style>
<g clip-path="url(#r)">
<rect width="{W}" height="{H}" fill="{BG}"/><rect width="{W}" height="{H}" fill="url(#glow)"/>
<g class="pulse">{gem(572, 46, 56)}</g>
<text x="600" y="160" text-anchor="middle" font-family="{SANS}" font-size="56" font-weight="800" fill="{TEXT}" letter-spacing="-1">Rubi</text>
<text x="600" y="198" text-anchor="middle" font-family="{SANS}" font-size="20" fill="{MUTED}"><tspan fill="{TEXT}" font-weight="700">Only what's precious stays in context.</tspan> Fewer tokens, same thread.</text>
<g font-family="{MONO}" font-size="12" fill="{GRAY}">
<line x1="{cx}" y1="{cy+ch}" x2="{cx+cw}" y2="{cy+ch}" stroke="{LINE}"/>
<line x1="{cx}" y1="{cy+ch-ch*120000/vmax:.1f}" x2="{cx+cw}" y2="{cy+ch-ch*120000/vmax:.1f}" stroke="{WARN}" stroke-opacity=".5" stroke-dasharray="4 4"/>
<text x="{cx-10}" y="{cy+6}" text-anchor="end">1M</text><text x="{cx-10}" y="{cy+ch+4}" text-anchor="end">0</text>
</g>
<path class="draw" d="{pa}" fill="none" stroke="{MUTED}" stroke-width="2.4" stroke-linejoin="round"/>
<path class="draw b" d="{pb}" fill="none" stroke="{RUBY2}" stroke-width="2.4" stroke-linejoin="round"/>
<g font-family="{SANS}" font-size="13">
<circle cx="{cx+cw-250}" cy="{cy-8}" r="5" fill="{MUTED}"/><text x="{cx+cw-238}" y="{cy-4}" fill="{MUTED}">context without Rubi</text>
<circle cx="{cx+cw-90}" cy="{cy-8}" r="5" fill="{RUBY2}"/><text x="{cx+cw-78}" y="{cy-4}" fill="{TEXT}">with Rubi</text>
</g>
</g>
</svg>"""


# ---------------------------------------------------------------- how it works
def how():
    W, H = 1200, 470
    T = 12  # loop seconds
    stages = [
        ("1", "Context grows", "every message re-sends\nthe whole conversation"),
        ("2", "Meter at 80%", "Claude saves a handoff:\ngoal, decisions, next step"),
        ("3", "Auto-compact", "Claude Code compacts on\nits own at 150k"),
        ("4", "Record", "requests, files and\ncommands → vault"),
        ("5", "Restore", "handoff injected back,\nwork continues from ~60k"),
    ]
    # timeline of the bar width (percent of track) and active stage over the loop
    # 0-3s grow to 80, 3-4.5 hold (handoff), 4.5-6 grow to 100, 6-7.5 record, 7.5-9 drop to 40, 9-12 hold
    tx, ty, tw, th = 120, 120, 960, 34
    cards = []
    cw, gap = 206, 12
    start_x = (W - (5 * cw + 4 * gap)) / 2
    windows = [(0, 3), (3, 4.5), (4.5, 6), (6, 7.5), (7.5, 10.5)]
    for i, (n, title, sub) in enumerate(stages):
        x = start_x + i * (cw + gap)
        a, z = windows[i]
        pa, pz = a / T * 100, z / T * 100
        lines = sub.split("\n")
        cards.append(f"""
<g>
<style>.c{i}{{animation:c{i} {T}s linear infinite}}
@keyframes c{i}{{0%,{max(pa-0.1,0):.2f}%{{opacity:.38}}{pa:.2f}%,{pz:.2f}%{{opacity:1}}{min(pz+0.1,100):.2f}%,100%{{opacity:.38}}}}
.s{i}{{animation:s{i} {T}s linear infinite}}
@keyframes s{i}{{0%,{max(pa-0.1,0):.2f}%{{stroke:{LINE}}}{pa:.2f}%,{pz:.2f}%{{stroke:{RUBY}}}{min(pz+0.1,100):.2f}%,100%{{stroke:{LINE}}}}}</style>
<g class="c{i}">
<rect class="s{i}" x="{x}" y="260" width="{cw}" height="150" rx="14" fill="{PANEL}" stroke-width="1.5"/>
<circle cx="{x+26}" cy="290" r="13" fill="{RUBY}" fill-opacity=".18"/><text x="{x+26}" y="295" text-anchor="middle" font-family="{MONO}" font-size="13" font-weight="700" fill="{RUBY2}">{n}</text>
<text x="{x+48}" y="295" font-family="{SANS}" font-size="16" font-weight="700" fill="{TEXT}">{title}</text>
<text font-family="{SANS}" font-size="13.5" fill="{MUTED}">{''.join(f'<tspan x="{x+18}" y="{332+j*21}">{l}</tspan>' for j, l in enumerate(lines))}</text>
</g></g>""")

    def kf(points):
        return "".join(f"{t / T * 100:.2f}%{{width:{w / 100 * tw:.1f}px}}" for t, w in points)

    bar = kf([(0, 5), (3, 80), (4.5, 80), (6, 100), (7.5, 100), (9, 40), (12, 40)])
    color = f"0%,49.9%{{fill:{RUBY2}}}50%,62.4%{{fill:{WARN}}}62.5%,100%{{fill:{RUBY2}}}"
    label = lambda txt, a, z, colr: f"""<text x="{W/2}" y="200" text-anchor="middle" font-family="{MONO}" font-size="15" fill="{colr}" opacity="0" style="animation:l{int(a*10)} {T}s linear infinite">{txt}</text>
<style>@keyframes l{int(a*10)}{{0%,{a/T*100-0.1:.2f}%{{opacity:0}}{a/T*100:.2f}%,{z/T*100:.2f}%{{opacity:1}}{z/T*100+0.1:.2f}%,100%{{opacity:0}}}}</style>"""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="How Rubi works: meter, handoff, compaction, record, restore">
<defs><clipPath id="r"><rect width="{W}" height="{H}" rx="24"/></clipPath>
<clipPath id="track"><rect x="{tx}" y="{ty}" width="{tw}" height="{th}" rx="17"/></clipPath>
<linearGradient id="fill" x1="0" x2="1"><stop offset="0" stop-color="#a3123f"/><stop offset="1" stop-color="{RUBY2}"/></linearGradient></defs>
<style>
.bar{{animation:bar {T}s ease-in-out infinite}}
@keyframes bar{{{bar}}}
</style>
<g clip-path="url(#r)">
<rect width="{W}" height="{H}" fill="{BG}"/>
<text x="{tx}" y="{ty-22}" font-family="{SANS}" font-size="14" font-weight="700" fill="{MUTED}" letter-spacing="1.5">CONTEXT WINDOW</text>
<text x="{tx+tw}" y="{ty-22}" text-anchor="end" font-family="{MONO}" font-size="13" fill="{GRAY}">compacts at 150k</text>
<rect x="{tx}" y="{ty}" width="{tw}" height="{th}" rx="17" fill="{PANEL}" stroke="{LINE}"/>
<g clip-path="url(#track)"><rect class="bar" x="{tx}" y="{ty}" height="{th}" width="40" fill="url(#fill)"/></g>
<line x1="{tx+tw*0.8}" y1="{ty-8}" x2="{tx+tw*0.8}" y2="{ty+th+8}" stroke="{WARN}" stroke-width="2" stroke-dasharray="4 3"/>
<text x="{tx+tw*0.8}" y="{ty+th+24}" text-anchor="middle" font-family="{MONO}" font-size="12" fill="{WARN}">80% · handoff</text>
{label("[rubi] context at 120k of 150k → save a handoff now", 3, 4.5, WARN)}
{label("auto-compacting… [rubi] recording requests, files, commands → vault", 4.5, 7.5, RUBY2)}
{label("✓ handoff restored · back to 60k tokens · same thread", 7.5, 11.5, OK)}
{''.join(cards)}
</g>
</svg>"""


# ---------------------------------------------------------------- terminal
def terminal():
    W = 1000
    lines = [
        ("$", "claude", TEXT, "cmd"),
        (">", "/plugin install rubi@rubi", TEXT, "cmd"),
        ("", "✓ Installed rubi. Hooks: meter · record · restore · guard", OK, "out"),
        (">", "refactor the checkout flow and add tests", TEXT, "cmd"),
        ("", "● Reading web/Checkout.tsx, api/routes.ts …", MUTED, "out"),
        ("", "[rubi] api/orders.log has 48,210 lines (~410k tokens). Use Grep or offset/limit.", WARN, "out"),
        ("", "● Grep \"PaymentError\" api/orders.log → 12 matches", MUTED, "out"),
        ("", "  … 140 messages later …", GRAY, "out"),
        ("", "[rubi] Context at 121k of 150k. Saving a handoff before compaction.", RUBY2, "out"),
        ("", "✓ Handoff saved → vault/shop/handoffs/2026-10-17-1530.md", OK, "out"),
        ("", "● Conversation compacted (150k → 61k)", MUTED, "out"),
        ("", "✓ [rubi] Handoff restored. Next step: tests for the coupon edge case.", OK, "out"),
    ]
    T, step = 16, 0.95
    H = 70 + len(lines) * 27 + 26
    rows = []
    for i, (prompt, text, col, kind) in enumerate(lines):
        y = 82 + i * 27
        a = 0.6 + i * step
        pa = a / T * 100
        anim = f"animation:t{i} {T}s steps(1) infinite"
        rows.append(f"""<style>@keyframes t{i}{{0%,{pa-0.01:.2f}%{{opacity:0}}{pa:.2f}%,94%{{opacity:1}}94.01%,100%{{opacity:0}}}}</style>
<g style="{anim}" opacity="0">{f'<text x="30" y="{y}" fill="{RUBY2}">{prompt}</text>' if prompt else ''}<text x="{50 if prompt else 30}" y="{y}" fill="{col}" xml:space="preserve">{text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')}</text></g>""")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Terminal demo of Rubi inside Claude Code">
<defs><clipPath id="r"><rect width="{W}" height="{H}" rx="16"/></clipPath></defs>
<style>.cur{{animation:b 1s steps(1) infinite}}@keyframes b{{50%{{opacity:0}}}}</style>
<g clip-path="url(#r)">
<rect width="{W}" height="{H}" fill="#07080c"/>
<rect width="{W}" height="40" fill="{PANEL}"/>
<circle cx="24" cy="20" r="6" fill="#ff5f57"/><circle cx="44" cy="20" r="6" fill="#febc2e"/><circle cx="64" cy="20" r="6" fill="#28c840"/>
<text x="{W/2}" y="25" text-anchor="middle" font-family="{SANS}" font-size="13" fill="{MUTED}">claude · ~/shop</text>
<g font-family="{MONO}" font-size="14.5">{''.join(rows)}</g>
<rect class="cur" x="30" y="{82 + len(lines) * 27 - 14}" width="9" height="17" fill="{RUBY2}"/>
</g>
</svg>"""


for name, fn in [("hero.svg", hero), ("how-it-works.svg", how), ("terminal.svg", terminal)]:
    (OUT / name).write_text(fn(), encoding="utf-8")
    print("wrote", name)
