"""Single source of truth for the Tidemark equity-compensation film.

Change COMPANY to "Anduril" or "Tesla" and re-run beat 1 only:
    python3 build.py --beats 1 --company Anduril
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
FONTS = os.path.join(ASSETS, "fonts")
LOGO = os.path.join(ASSETS, "tidemark_logo.png")
OUT = os.path.join(HERE, "out")

# ---- the one variable for the hook -------------------------------------
COMPANY = os.environ.get("FILM_COMPANY", "SpaceX")

# ---- compliance toggle: OFF until the CCO approves ----------------------
SHOW_MEDIA_LINE = False
MEDIA_LINE = "Quoted in Bloomberg, NYT DealBook and Yahoo Finance (2026)"

FPS = 30
DURATION = 40.0

# beat boundaries in seconds
BEATS = {1: (0.0, 3.0), 2: (3.0, 12.0), 3: (12.0, 22.0), 4: (22.0, 32.0), 5: (32.0, 40.0)}

ASPECTS = {            # name: (width, height)
    "4x5": (1080, 1350),
    "16x9": (1920, 1080),
    "9x16": (1080, 1920),
}
# safe area as fractions of the frame: left, top, right, bottom
SAFE = {
    "4x5": (0.07, 0.07, 0.07, 0.07),
    "16x9": (0.06, 0.07, 0.06, 0.07),
    "9x16": (0.07, 0.13, 0.07, 0.21),   # clear of LinkedIn/Reels UI
}

# ---- example figures; the film asserts the arithmetic at build time -----
VEST = 100_000
WITHHOLD_RATE = 0.22
BRACKET_RATE = 0.37
WITHHELD = round(VEST * WITHHOLD_RATE)
TAX_AT_BRACKET = round(VEST * BRACKET_RATE)
GAP = TAX_AT_BRACKET - WITHHELD
assert (WITHHELD, TAX_AT_BRACKET, GAP) == (22_000, 37_000, 15_000)


def money(n):
    return "${:,}".format(n)


# ---- on-screen text ------------------------------------------------------
def hook_text(company=None):
    return "If you work at {}, your next vest has a tax gap.".format(company or COMPANY)


LABELS = {
    "vest": "RSU vest: {} (example)".format(money(VEST)),
    "withheld": "Withheld: {}".format(money(WITHHELD)),
    "owed": "Still owed at a {:.0f}% federal\nbracket: {}".format(BRACKET_RATE * 100, money(GAP)),
    "gate": "Lockup release",
    "gate_sub": "example date",
    "timer_ex": "1 year from exercise",
    "timer_gr": "2 years from grant",
    "lot": "ISO lot",
    "amt": "AMT",
    "steps": ["Vest", "Set aside tax", "Exercise", "Sell", "Diversify"],
}

# captions: (start, end, text) in film seconds. The hook is caption 0.
CAPTIONS = [
    (3.6, 12.0, "22% is withheld. Your bracket may be higher."),
    (12.6, 22.0, "Lockups. ISOs. AMT. Each one has a date."),
    (22.6, 32.0, "The plan is deciding before the date, not after."),
]

END = {
    "service": "Equity Compensation Planning",
    "name": "Frank Alvarez, Financial Consultant | Tidemark Financial Partners",
    "tagline": "Fee-Only · Fiduciary · Independent",
    "disclosure": (
        "Example figures are hypothetical and for illustration only. Tidemark, LLC is an "
        "SEC-registered investment adviser. Registration does not imply a certain level of "
        "skill or training. For informational purposes only; not investment, tax or legal "
        "advice. Investing involves risk, including loss of principal. Disclosures: tidemarkfp.com"
    ),
}

BANNED = ["guaranteed", "best", "top", "maximize", "safe", "always"]

# brand
NAVY = (0x1B, 0x36, 0x5D)
BLUE = (0x00, 0x62, 0x98)
GOLD = (0xC9, 0xA2, 0x5A)
CREAM = (0xF5, 0xEF, 0xE2)
