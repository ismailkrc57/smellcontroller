#!/usr/bin/env python3
"""HTTrack ile çekilen noze.ca kopyasından SmellControl landing sayfasını üretir.

Kullanım:
    httrack "https://www.noze.ca/" -O landing_raw ...   (README'ye bakın)
    python3 scripts/build_landing.py landing_raw frontend/public ../smellcontrol_analiz

Üçüncü argüman (isteğe bağlı) SmellControl görsel klasörüdür (Fotolar_edit/, ürün/);
verilirse görseller küçültülüp <out>/media/ altına yeniden yazılır.

Çıktı:
    <out>/landing.html                        → Vite tarafından "/" adresinde sunulur
    <out>/cdn.prod.website-files.com/...      → sayfanın CSS/JS/görselleri
    <out>/cdn.jsdelivr.net/..., d3e54v103j8qbb.cloudfront.net/...
    <out>/media/..., smellcontrol-logo*.png, smellcontrol-favicon.svg

Değişiklikler Canva tasarımındaki notlara göre yapılır.
"""
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from landing_media import apply_media, prepare_media  # noqa: E402

LOGIN_URL = "/app/login"
INSTAGRAM_URL = "https://www.instagram.com/"  # TODO: gerçek Instagram hesabı
ACCENT = "#04E0B0"

ASSET_DIRS = [
    "cdn.prod.website-files.com/68caa5662c5043080c6bd4d7",
    "cdn.prod.website-files.com/6022af993a6b2191db3ed10c",
    "cdn.jsdelivr.net",
    "d3e54v103j8qbb.cloudfront.net",
]


def must_replace(s: str, old: str, new: str, count: int = 1) -> str:
    n = s.count(old)
    if n < count:
        raise SystemExit(f"Beklenen metin bulunamadı ({n}/{count}): {old[:80]!r}")
    return s.replace(old, new)


def remove_section(s: str, marker: str) -> str:
    idx = s.find(marker)
    if idx < 0:
        raise SystemExit(f"Bölüm bulunamadı: {marker}")
    start = s.rfind("<section", 0, idx)
    end = s.find("</section>", idx) + len("</section>")
    return s[:start] + s[end:]


FAVICON = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" '
    'fill="#0b0b0b"/><text x="32" y="44" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" '
    f'font-size="36" font-weight="700" fill="{ACCENT}">S</text></svg>\n'
)

INSTAGRAM_SVG = (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
    '<rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/>'
    '<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>'
    '<circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>'
)

FEATURES = [
    ("Multi-Odor Detection", "Detect a wide range of odors with a single device."),
    ("Train Your Own Odor Model", "Use the samples you collect to teach AI to recognize the odors that matter to you."),
    ("Personalized Alerts with Odor AI Agents",
     "Set your alert rules on web or mobile. Receive notifications via WhatsApp, Telegram, or email."),
    ("Low Power, High Sensitivity", "Sensitive detection and low power consumption in one compact device."),
]

INDUSTRIES = [
    ("Pharmaceuticals", "Manufacturing quality control"),
    ("Food", "Freshness and spoilage monitoring"),
    ("Mining", "Mine air monitoring"),
    ("Wastewater Treatment", "Odor emissions monitoring"),
    ("Petrochemicals", "Process oil analysis"),
    ("Automotive", "Engine oil analysis"),
    ("Cosmetics and Fragrance", "Odor profile verification"),
    ("Chemical Manufacturing", "Volatile compound monitoring"),
    ("Hospitals", "Patient care alerts"),
    ("Waste Management", "Odor source analysis"),
]

# Sektör kartları (5 görsel kart) → listedeki sektörlerden 5'i
CARD_MAP = {
    "Oncology": INDUSTRIES[0],
    "Infectious Diseases": INDUSTRIES[1],
    "Metabolic Health": INDUSTRIES[8],
    "Critical Care": INDUSTRIES[7],
    "Asthma &amp; Respiratory": INDUSTRIES[6],
}

HOME_DESC = (
    "SmellControl uses AI to analyze odors. It detects and classifies odors in your environment "
    "and turns the results into insights."
)


def transform(s: str) -> str:
    # ── <head> ───────────────────────────────────────────────────────
    s = re.sub(r"<title>.*?</title>", "<title>SmellControl | AI-Powered Odor Detection</title>", s, count=1)
    s = re.sub(r'(<meta content=")[^"]*(" name="description")', rf"\g<1>{HOME_DESC}\2", s)
    s = re.sub(r'(<meta content=")[^"]*(" property="og:description")', rf"\g<1>{HOME_DESC}\2", s)
    s = re.sub(r'(<meta content=")[^"]*(" property="twitter:description")', rf"\g<1>{HOME_DESC}\2", s)
    s = re.sub(r'<link href="[^"]*Favicon\.png" rel="shortcut icon"[^>]*/>',
               '<link href="/smellcontrol-favicon.svg" rel="icon" type="image/svg+xml"/>', s)
    s = re.sub(r'<link href="[^"]*Webclip\.jpg" rel="apple-touch-icon"/>', "", s)
    s = s.replace('<link href="../cdn.prod.website-files.com/index.html" rel="preconnect" crossorigin="anonymous"/>', "")
    # Noze'a ait JSON-LD şemasını kaldır
    s = re.sub(r'<script type="application/ld\+json">.*?</script>', "", s, flags=re.S)

    # ── Logolar ──────────────────────────────────────────────────────
    s = re.sub(r'src="[^"]*Noze_logogreen\.svg"', 'src="/smellcontrol-logo.svg"', s)
    s = re.sub(r'src="[^"]*_Logo\.svg"', 'src="/smellcontrol-logo-footer.svg"', s)
    s = s.replace("</head>", "<style>.nav_logo{width:auto!important;height:22px!important}"
                  ".footer_logo{width:auto!important}.footer_logo img{height:1.9rem;width:auto}</style></head>", 1)

    # ── Üst menü: Noze sayfaları yerine Giriş ────────────────────────
    s = re.sub(
        r'(<nav role="navigation" class="nav_menu w-nav-menu">).*?(</nav>)',
        rf'\1<a href="{LOGIN_URL}" class="nav_menu_link w-nav-link">Log in</a>\2',
        s, count=1, flags=re.S,
    )

    # ── Canva s.1: "From molecules to meaning" kartları → 4 özellik ──
    # Orijinalde 3 kart + boş "is-4" kaydırma boşluğu var; 4. kart is-3 stilini
    # devralır (mobilde statik), masaüstünde biraz daha aşağıda yapışır.
    def card(cls: str, title: str, body: str) -> str:
        return (
            f'<div class="modules_card {cls}"><div class="modules_card-title margin-bottom margin-small">'
            f'<h3 class="text-size-large no-shink text-weight-medium">{title}</h3></div>'
            f'<p class="text-size-medium-small text-black-opacity_70">{body}</p></div>'
        )

    for i, (title, body) in enumerate(FEATURES[:3], start=1):
        s, n = re.subn(
            rf'<div class="modules_card is-{i}"><div class="modules_card-title.*?</p></div>',
            card(f"is-{i}", title, body), s,
        )
        if n != 2:
            raise SystemExit(f"Özellik kartı {i} bulunamadı ({n})")
    s = s.replace(
        '<div class="modules_card is-4"></div>',
        card("is-3 is-extra", *FEATURES[3]) + '<div class="modules_card is-4"></div>',
    )
    s = s.replace("</head>", "<style>@media (min-width:992px){.modules_card.is-1{margin-bottom:15rem}.modules_card.is-2{margin-bottom:10rem}.modules_card.is-3{margin-bottom:5rem}.modules_card.is-3.is-extra{top:40rem;margin-bottom:0}}</style></head>", 1)

    # ── Canva s.2: hero altı paragraf ─────────────────────────────────
    s, n = re.subn(r"The sense of smell is nature’s most powerful detector\.[^<]*", HOME_DESC, s)
    if n < 2:
        raise SystemExit(f"Hero paragrafı bulunamadı ({n}/2)")

    # ── Canva s.3 & s.4: "Backed by leaders" ve "The minds behind" kaldırılır ──
    s = remove_section(s, "Backed by leaders")
    s = remove_section(s, "The minds behind the breakthroughs")

    # ── Canva s.7: sektörler ──────────────────────────────────────────
    for old, (name, use) in CARD_MAP.items():
        s = re.sub(
            rf'<div class="text-size-medium text-align-center">{re.escape(old)}</div>'
            rf'<div class="text-align-center mode_card-text-title">.*?</div>',
            f'<div class="text-size-medium text-align-center">{name}</div>'
            f'<div class="text-align-center mode_card-text-title">{use}.</div>',
            s, count=1, flags=re.S,
        )
    items = "".join(
        f'<li style="padding:.55em 0;border-bottom:1px solid rgba(255,255,255,.12);display:flex;'
        f'justify-content:space-between;gap:1em"><span>{n}</span>'
        f'<span style="opacity:.6;text-align:right">{u}</span></li>'
        for n, u in INDUSTRIES
    )
    s = re.sub(
        r'<div class="care_text-wrap">.*?</div>',
        '<div class="care_text-wrap"><h3 class="margin-bottom margin-medium">Built for every industry'
        '<span class="text-color-secondary">.</span></h3>'
        f'<ul class="text-size-medium" style="list-style:none;padding:0;margin:0">{items}</ul></div>',
        s, count=1, flags=re.S,
    )

    # ── Canva s.5: "Stay in the Noze" → SmellControl ─────────────────
    s = must_replace(s, "Stay in the Noze", "Stay with SmellControl")
    s = s.replace("You&#x27;re now officially in the Noze!", "You&#x27;re now officially with SmellControl!")

    # ── Canva s.6: footer ────────────────────────────────────────────
    s = re.sub(
        r'<div class="footer_links-wrapper">.*?</div>',
        '<div class="footer_links-wrapper"><span class="footer_link" style="cursor:default">'
        'An Astroit product</span></div>',
        s, count=1, flags=re.S,
    )
    s = re.sub(
        r'<a href="https://www\.linkedin\.com/[^"]*"(.*?)<div class="code-embed w-embed"><svg.*?</svg>',
        rf'<a href="{INSTAGRAM_URL}" aria-label="Instagram"\1<div class="code-embed w-embed">{INSTAGRAM_SVG}',
        s, count=1, flags=re.S,
    )
    s = s.replace("© 2025 Noze. All rights reserved.", "© 2026 SmellControl. All rights reserved.")
    s = re.sub(r'href="(privacy-policy|terms-of-service)\.html"', 'href="#"', s)

    # ── Kalan Noze sayfa bağlantıları ────────────────────────────────
    s = re.sub(r'href="(contact|the-team)\.html"', f'href="{LOGIN_URL}"', s)
    s = s.replace('href="publications.html"', 'href="#"')
    s = s.replace('href="fr.html"', 'href="/"')
    s = s.replace('href="index.html"', 'href="/"')

    # ── Yerel kopya düzeltmeleri ─────────────────────────────────────
    # HTTrack CSS/JS içindeki yolları yeniden yazdığı için SRI hash'leri tutmaz
    s = re.sub(r'\s(integrity|crossorigin)="[^"]*"', "", s)
    # jsdelivr klasörleri "@" ile kaydedildi; %40 kodlu yolları düzelt
    s = re.sub(r'(cdn\.jsdelivr\.net/npm/[^"]*?)%40', r"\1@", s)

    s = re.sub(r"%2[cC]", "_", s)

    # ── Webflow arka plan videolarını yerel kopyaya yönlendir ─────────
    s = s.replace("https://cdn.prod.website-files.com/68caa5662c5043080c6bd4d7%2F",
                  "/cdn.prod.website-files.com/68caa5662c5043080c6bd4d7/")

    # ── Görünür metinlerdeki marka adı ───────────────────────────────
    def rebrand(m: re.Match) -> str:
        return re.sub(r"\bNoze\b", "SmellControl", m.group(0))

    s = re.sub(r">[^<]+<", rebrand, s)
    s = re.sub(r'(alt|content|placeholder|data-wait)="[^"]*"', rebrand, s)
    return s


def main():
    raw = Path(sys.argv[1] if len(sys.argv) > 1 else "landing_raw")
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "frontend/public")
    media = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    out.mkdir(parents=True, exist_ok=True)
    if media:
        prepare_media(media, out)
    elif not (out / "media").exists():
        raise SystemExit("public/media yok: görsel klasörünü 3. argüman olarak verin")

    for d in ASSET_DIRS:
        src, dst = raw / d, out / d
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
        # Virgüllü dosya adları srcset içinde sorun çıkarır → "_" yap
        for f in dst.rglob("*,*"):
            f.rename(f.with_name(f.name.replace(",", "_")))

    html = (raw / "www.noze.ca" / "index.html").read_text(encoding="utf-8")
    html = re.sub(r"<!-- Mirrored from .*?-->\n?", "", html)
    html = apply_media(transform(html), LOGIN_URL)
    (out / "landing.html").write_text(html, encoding="utf-8")

    for old in ("smellcontrol-logo.svg", "smellcontrol-logo-footer.svg"):
        (out / old).unlink(missing_ok=True)
    (out / "smellcontrol-favicon.svg").write_text(FAVICON)
    print(f"Landing oluşturuldu → {out / 'landing.html'}")


if __name__ == "__main__":
    main()
