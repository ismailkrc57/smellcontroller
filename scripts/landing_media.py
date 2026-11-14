"""SmellControl görsellerini (smellcontrol_analiz/) landing sayfasına ekler.

- Fotolar_edit/  → "Smelled by SmellControl AI" kayan galerisi + sektör kartları
- ürün/          → logo, cihaz, sensör, dashboard ve etkinlik fotoğrafları

prepare_media() görselleri web boyutuna küçültüp webp/png olarak public/media/ altına yazar,
apply_media() landing HTML'ine yerleştirir.
"""
import re
from pathlib import Path

from PIL import Image

M = "/media"

# (dosya, sektör, kullanım alanı) – sıra galerideki sırayla aynı
INDUSTRY_PHOTOS = {
    "ilac": ("ilaç.png", "Pharmaceuticals", "Manufacturing quality control"),
    "gida": ("gıda.png", "Food", "Freshness and spoilage monitoring"),
    "maden": ("maden.png", "Mining", "Mine air monitoring"),
    "water": ("water.png", "Wastewater Treatment", "Odor emissions monitoring"),
    "petrokimya": ("petrokimya.png", "Petrochemicals", "Process oil analysis"),
    "otomotiv": ("otomotiv.png", "Automotive", "Engine oil analysis"),
    "perfum": ("perfum.png", "Cosmetics and Fragrance", "Odor profile verification"),
    "ucucu": ("ucucu_bilesikler.png", "Chemical Manufacturing", "Volatile compound monitoring"),
    "hastane": ("hastahane_evdebakim.png", "Hospitals", "Patient care alerts"),
    "atik": ("atık_koku.png", "Waste Management", "Odor source analysis"),
}

# Galeri sütunları: "tall" tek dikey kare, "pair" iki yatay kare (Birdbuddy düzeni)
GALLERY_COLUMNS = [
    ("tall", ["ilac"]),
    ("tall", ["gida"]),
    ("pair", ["perfum", "hastane"]),
    ("tall", ["maden"]),
    ("tall", ["petrokimya"]),
    ("pair", ["ucucu", "atik"]),
    ("tall", ["water"]),
    ("tall", ["otomotiv"]),
]

# Sektör kartlarındaki (eski tıbbi) görseller → sektör fotoğrafları
CARD_PHOTOS = {
    "Pharmaceuticals": "ilac",
    "Food": "gida",
    "Hospitals": "hastane",
    "Chemical Manufacturing": "ucucu",
    "Cosmetics and Fragrance": "perfum",
}

SPARKLE = (
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1.2l1.35 3.9c.2.55.6.95 '
    "1.15 1.15L14.4 7.6l-3.9 1.35c-.55.2-.95.6-1.15 1.15L8 14l-1.35-3.9c-.2-.55-.6-.95-1.15-1.15L1.6 "
    '7.6l3.9-1.35c.55-.2.95-.6 1.15-1.15z"/></svg>'
)


def _fit(src: Path, dst: Path, width: int, *, height: int | None = None, quality: int = 80):
    im = Image.open(src)
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    if height:  # sabit en-boy oranı: merkezden kırp
        target = width / height
        w, h = im.size
        if w / h > target:
            nw = int(h * target)
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = int(w / target)
            im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        im = im.resize((width, height), Image.LANCZOS)
    elif im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.suffix == ".png":
        im.save(dst, optimize=True)
    else:
        im.save(dst, quality=quality, method=6)


def _tint(src: Path, dst: Path, rgb: tuple[int, int, int], height: int):
    im = Image.open(src).convert("RGBA")
    im = im.crop(im.getbbox())
    im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    alpha = im.getchannel("A")
    out = Image.new("RGBA", im.size, rgb + (0,))
    out.putalpha(alpha)
    out.save(dst, optimize=True)


def prepare_media(src_dir: Path, public: Path):
    photos, product = src_dir / "Fotolar_edit", src_dir / "ürün"
    out = public / "media"
    for key, (fname, *_rest) in INDUSTRY_PHOTOS.items():
        im = Image.open(photos / fname)
        tall = im.height > im.width
        _fit(photos / fname, out / "industry" / f"{key}.webp", 872 if tall else 870,
             height=1240 if tall else 604)
        if key in CARD_PHOTOS.values():
            _fit(photos / fname, out / "industry" / f"{key}-card.webp", 1024)

    _fit(product / "son-4.png", out / "product" / "device.webp", 1100, quality=85)
    _fit(product / "sensör fotoğrafımız.jpeg", out / "product" / "sensor.webp", 796, quality=85)
    _fit(product / "8.png", out / "product" / "dashboard-devices.webp", 1800, quality=85)
    _fit(product / "9.png", out / "product" / "dashboard-screens.webp", 1400, quality=85)
    _fit(product / "260508_YARININ_TEKNOLOJI_LIDERLERI_2026KSP01888.JPG", out / "product" / "holding.webp", 2000, quality=82)
    _fit(product / "research-team.jpg", out / "product" / "research.webp", 2000)
    _fit(product / "smellcontrol-hero-4k.png", out / "product" / "hero-4k.webp", 1400, quality=85)
    _fit(product / "ayazagaya-da-bilisim-vadisi.jpg", out / "product" / "office.webp", 1920)
    _tint(product / "smellcontrol_logo.png", public / "smellcontrol-logo.png", (4, 224, 176), 80)
    _tint(product / "smellcontrol_logo.png", public / "smellcontrol-logo-white.png", (255, 255, 255), 96)


# ── Galeri ───────────────────────────────────────────────────────────

GALLERY_CSS = """
<style>
.sc-gal{background:#e1e5e8;color:#141414;padding:7rem 0 7rem;position:relative;z-index:1;overflow:hidden}
.sc-gal_head{max-width:52rem;margin:0 auto 3.5rem;padding:0 5%;text-align:center}
.sc-gal_title{color:#141414;margin-bottom:1.25rem}
.sc-gal_body{color:rgba(20,20,20,.7);max-width:40rem;margin:0 auto}
.sc-gal_body strong{color:#141414;font-weight:500}
.sc-gal_viewport{overflow:hidden;cursor:grab;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.sc-gal_viewport.is-dragging{cursor:grabbing}
.sc-gal_track{display:flex;gap:16px;width:max-content;will-change:transform}
.sc-gal_col{width:436px;height:620px;flex:none}
.sc-gal_col.is-pair{display:flex;flex-direction:column;gap:16px}
.sc-gal_shot{position:relative;margin:0;height:100%;flex:1;min-height:0}
.sc-gal_img{display:block;width:100%;height:100%;object-fit:cover;border-radius:24px;background:#d3d9dd;pointer-events:none;-webkit-user-drag:none}
.sc-gal_id{position:absolute;left:12px;bottom:12px;max-width:calc(100% - 24px);display:flex;align-items:center;
  border-radius:999px;overflow:hidden;color:#fff;font-size:13px;line-height:16px;
  background:rgba(10,20,18,.42);-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 4px 14px rgba(0,0,0,.12)}
.sc-gal_name{display:flex;align-items:center;gap:6px;padding:7px 11px 7px 9px;font-weight:500;white-space:nowrap}
.sc-gal_name svg{width:13px;height:13px;fill:#04e0b0;flex:none}
.sc-gal_more{padding:7px 12px 7px 10px;color:rgba(255,255,255,.8);text-decoration:none;white-space:nowrap;
  border-left:1px solid rgba(255,255,255,.18);transition:color .2s,background-color .2s}
.sc-gal_more:hover{color:#fff;background:rgba(255,255,255,.1)}
.sc-gal .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:767px){
  .sc-gal{padding:4.5rem 0}
  .sc-gal_head{margin-bottom:2.25rem}
  .sc-gal_col{width:272px;height:420px}
  .sc-gal_id{font-size:12px}
  .sc-gal_name{padding:6px 9px 6px 8px}.sc-gal_more{padding:6px 10px 6px 8px}
}
</style>
"""

GALLERY_JS = """
<script>
(function () {
  var vp = document.querySelector('.sc-gal_viewport');
  if (!vp) return;
  var track = vp.querySelector('.sc-gal_track');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var speed = 38, x = 0, loopW = 0, last = 0, hover = false, drag = null, visible = true;

  function measure() {
    var first = track.querySelector('[data-copy]');
    loopW = first ? first.offsetLeft - track.firstElementChild.offsetLeft : track.scrollWidth / 2;
  }
  function wrap() {
    if (!loopW) return;
    while (x <= -loopW) x += loopW;
    while (x > 0) x -= loopW;
  }
  function frame(t) {
    var dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    if (!drag && visible && !reduce) x -= speed * (hover ? 0.35 : 1) * dt;
    wrap();
    track.style.transform = 'translate3d(' + x + 'px,0,0)';
    requestAnimationFrame(frame);
  }

  vp.addEventListener('pointerenter', function () { hover = true; });
  vp.addEventListener('pointerleave', function () { hover = false; });
  vp.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a')) return;
    drag = { start: e.clientX, x: x, moved: false };
    vp.setPointerCapture(e.pointerId);
    vp.classList.add('is-dragging');
  });
  vp.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.start;
    if (Math.abs(dx) > 3) drag.moved = true;
    x = drag.x + dx;
  });
  function end() { drag = null; vp.classList.remove('is-dragging'); }
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(vp);
  }
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  measure();
  requestAnimationFrame(frame);
})();
</script>
"""


def _shot(key: str, login_url: str, copy: bool) -> str:
    fname, name, use = INDUSTRY_PHOTOS[key]
    alt = "" if copy else f"SmellControl monitoring odors in {name.lower()}: {use.lower()}"
    tab = ' tabindex="-1"' if copy else ""
    return (
        f'<figure class="sc-gal_shot"><img class="sc-gal_img" src="{M}/industry/{key}.webp" alt="{alt}" '
        f'loading="lazy" decoding="async" draggable="false">'
        f'<figcaption class="sc-gal_id"><span class="sc-gal_name">{SPARKLE}'
        f'<span class="sr-only">Smelled by SmellControl AI: </span>{name}</span>'
        f'<a class="sc-gal_more" href="{login_url}" draggable="false"{tab}>Learn more'
        f'<span class="sr-only"> about {name.lower()}</span></a></figcaption></figure>'
    )


def gallery_html(login_url: str) -> str:
    cols = []
    for copy in (False, True):
        for i, (kind, keys) in enumerate(GALLERY_COLUMNS):
            attrs = ' aria-hidden="true"' if copy else ""
            if copy and i == 0:
                attrs += " data-copy"
            cls = "sc-gal_col is-pair" if kind == "pair" else "sc-gal_col"
            cols.append(f'<div class="{cls}"{attrs}>' + "".join(_shot(k, login_url, copy) for k in keys) + "</div>")
    return (
        '<section class="sc-gal" aria-labelledby="sc-gal-title"><div class="sc-gal_head">'
        '<h2 id="sc-gal-title" class="heading-style-h1 sc-gal_title">Every industry has a scent'
        '<span class="text-color-secondary">.</span></h2>'
        '<p class="text-size-medium sc-gal_body"><strong>One sensor, many noses.</strong> SmellControl learns the '
        "odor signatures that matter in your operation and recognizes them in real time.</p></div>"
        '<div class="sc-gal_viewport"><div class="sc-gal_track">' + "".join(cols) + "</div></div></section>"
    )


# ── HTML'e yerleştirme ───────────────────────────────────────────────

def _set_img(s: str, file_marker: str, new_src: str, extra_style: str = "") -> str:
    """İçinde file_marker geçen tüm <img> etiketlerinin src'sini değiştirir, srcset/sizes'ı siler."""
    def repl(m):
        tag = m.group(0)
        if file_marker not in tag:
            return tag
        tag = re.sub(r'\s(srcset|sizes)="[^"]*"', "", tag)
        tag = re.sub(r'src="[^"]*"', f'src="{new_src}"', tag)
        if extra_style:
            tag = tag.replace("<img ", f'<img style="{extra_style}" ', 1)
        return tag

    out, n = re.subn(r"<img[^>]*>", repl, s)
    if file_marker not in s:
        raise SystemExit(f"Görsel bulunamadı: {file_marker}")
    return out


def apply_media(s: str, login_url: str) -> str:
    # Logolar: gerçek SmellControl logosu
    s = s.replace('src="/smellcontrol-logo.svg"', 'src="/smellcontrol-logo.png" alt="SmellControl"')
    s = s.replace('src="/smellcontrol-logo-footer.svg"', 'src="/smellcontrol-logo-white.png" alt="SmellControl"')

    # "From molecules to meaning": NOZE çipli el → SmellControl sensörü
    sensor_style = "object-fit:contain;mix-blend-mode:multiply;box-sizing:border-box"
    s = _set_img(s, "WhiteChip%20big", f"{M}/product/sensor.webp", sensor_style + ";padding:34vh 16% 7vh")
    s = _set_img(s, "WhiteChip_Mobile", f"{M}/product/sensor.webp", sensor_style + ";padding:2rem 22%")

    # "A breakthrough to [be]hold": NOZE cihazı → SmellControl cihazı + kutu
    s = _set_img(s, "new%202%20noze", f"{M}/product/holding.webp", "object-fit:cover;object-position:55% 22%")
    s = _set_img(s, "noze%20mobile", f"{M}/product/holding.webp", "object-fit:cover;object-position:60% 22%;border-radius:1rem")
    s = _set_img(s, "Noze%20Pill", f"{M}/product/device.webp", "display:none")

    # Sektör kartları: tıbbi görseller → sektör fotoğrafları
    for name, key in CARD_PHOTOS.items():
        pat = (rf'(<div class="text-size-medium text-align-center">{re.escape(name)}</div>.*?'
               rf'<img )([^>]*class="mode_card-background"[^>]*>)')
        def card(m, key=key):
            tag = re.sub(r'\s(srcset|sizes)="[^"]*"', "", m.group(2))
            tag = re.sub(r'src="[^"]*"', f'src="{M}/industry/{key}-card.webp"', tag)
            return m.group(1) + tag
        s, n = re.subn(pat, card, s, count=1, flags=re.S)
        if n != 1:
            raise SystemExit(f"Sektör kartı bulunamadı: {name}")

    # Arka planlar: haber görseli → etkinlik, Noze binası → Bilişim Vadisi
    s = _set_img(s, "_News.avif", f"{M}/product/research.webp", "filter:brightness(.5)")
    s = _set_img(s, "_Building.avif", f"{M}/product/office.webp", "filter:brightness(.62)")

    # "The future is in motion": dashboard ekranları
    s, n = re.subn(
        r'(The future is in motion<span class="text-color-secondary">\.</span></h2>.*?</a>)',
        r'\1<img src="' + M + '/product/dashboard-devices.webp" alt="SmellControl dashboard on laptop, '
        'tablet and phone" loading="lazy" style="display:block;width:100%;max-width:min(36rem,48vh * 1.78);'
        'margin:2.5rem auto 0">',
        s, count=1, flags=re.S,
    )
    if n != 1:
        raise SystemExit("'The future is in motion' bölümü bulunamadı")
    s = s.replace("Start a conversation", "Explore the dashboard")

    # Galeri: özellik kartları bölümünden (masaüstü + mobil) hemen sonra
    anchor = s.find('class="section modules mobile"')
    end = s.find("</section>", anchor) + len("</section>")
    s = s[:end] + gallery_html(login_url) + s[end:]
    s = s.replace("</head>", GALLERY_CSS + "</head>", 1)
    s = s.replace("</body>", GALLERY_JS + "</body>", 1)
    return s
