"""'Built for every industry' bölümünün yerine gelen 4 aşamalı kullanım alanları.

Her aşama tam ekran, kaydırdıkça bir öncekinin üstüne binen (sticky) bir panel:
büyük başlık + açıklama + sağ üstte canlı görünen küçük bir koku analizi kartı.
"""
from pathlib import Path

M = "/media"

# (anahtar, kaynak fotoğraf, başlık, metin, kart başlığı, durum, durum rengi, çizgi tipi)
STAGES = [
    ("security", "petrokimya.png", "Safety &amp; Security",
     "Gas leaks, solvent vapors and smoke precursors carry a chemical signature long before anyone "
     "notices them. SmellControl picks it up early and raises the alarm while there is still time to act.",
     "64-channel odor analysis", "Moderate risk", "#f5a524", "rise"),
    ("care", "hastahane_evdebakim.png", "Health &amp; Care",
     "Hospitals, clinics and care homes depend on clean air. Track disinfectant levels, waste odors and "
     "air quality around the clock, with alerts that reach the right person on their phone.",
     "Ward air quality", "Alert sent", "#ff5a6a", "spike"),
    ("food", "gıda.png", "Food &amp; Agriculture",
     "From harvest to shelf, freshness has a scent. Detect spoilage, fermentation and contamination "
     "early to cut waste and keep quality consistent across every batch.",
     "Freshness index", "Fresh · 92%", "#04e0b0", "steady"),
    ("environment", "atık_koku.png", "Environment &amp; Industry",
     "Wastewater plants, landfills and factories. Measure odor emissions continuously, keep a record "
     "for compliance and answer neighbor complaints with data instead of guesses.",
     "Emission monitor", "Within limits", "#7aa7ff", "wave"),
]

_PATHS = {
    "rise": "M0 92 L40 90 L80 88 L120 86 L150 80 L180 66 L210 58 L240 40 L270 34 L300 30",
    "spike": "M0 90 L50 89 L100 88 L140 86 L170 84 L190 60 L205 22 L220 30 L240 18 L270 24 L300 14",
    "steady": "M0 40 L40 42 L80 38 L120 41 L160 39 L200 43 L240 40 L270 42 L300 41",
    "wave": "M0 70 C30 50 50 50 75 66 S125 84 150 66 S200 46 225 62 S275 80 300 64",
}


def prepare_usecase_media(photos: Path, out: Path, fit):
    for key, src, *_ in STAGES:
        fit(photos / src, out / "usecase" / f"{key}.webp", 1920, height=1080, quality=78)


def _card(title: str, status: str, color: str, kind: str) -> str:
    grid = "".join(f'<line x1="0" x2="300" y1="{y}" y2="{y}"/>' for y in (20, 45, 70, 95))
    threshold = '<line class="sc-uc_thr" x1="0" x2="300" y1="48" y2="48"/>' if kind in ("rise", "spike") else ""
    bars = "".join(
        f'<i style="background:{color};opacity:{0.35 + (i % 4) * 0.18:.2f};height:{30 + (i * 37) % 70}%"></i>'
        for i in range(16)
    )
    return (
        '<div class="sc-uc_card" aria-hidden="true">'
        f'<div class="sc-uc_card-head"><span>{title}</span><b style="color:{color}">'
        f'<em style="background:{color}"></em>{status}</b></div>'
        f'<svg viewBox="0 0 300 110" preserveAspectRatio="none"><g class="sc-uc_grid">{grid}</g>{threshold}'
        f'<path class="sc-uc_line" d="{_PATHS[kind]}" stroke="{color}"/></svg>'
        f'<div class="sc-uc_bars">{bars}</div>'
        "</div>"
    )


def usecases_html() -> str:
    panels = "".join(
        f'<div class="sc-uc_panel" style="background-image:linear-gradient(180deg,rgba(0,0,0,.25) 0%,'
        f'rgba(0,0,0,.15) 40%,rgba(0,0,0,.78) 100%),url({M}/usecase/{key}.webp)">'
        f'<div class="sc-uc_inner">{_card(ct, st, col, kind)}'
        f'<div class="sc-uc_text"><span class="sc-uc_num">0{i + 1} / 04</span>'
        f'<h3 class="sc-uc_title">{title}</h3><p>{body}</p></div></div></div>'
        for i, (key, _src, title, body, ct, st, col, kind) in enumerate(STAGES)
    )
    return (
        '<section class="sc-uc">'
        '<div class="sc-uc_intro"><span>Use cases</span>'
        '<h2>Built for every industry<span class="text-color-secondary">.</span></h2>'
        '<p>One sensor platform, four worlds where a sense of smell changes what is possible.</p></div>'
        f"{panels}</section>"
    )


USECASES_CSS = """
<style>
.sc-uc{background:#0b0b0b;color:#fff;position:relative;z-index:1}
.sc-uc_intro{padding:9rem 5vw 6rem;text-align:center}
.sc-uc_intro span{font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;opacity:.6}
.sc-uc_intro h2{font-size:clamp(2.4rem,5vw,4.5rem);font-weight:400;line-height:1.1;margin:1rem 0}
.sc-uc_intro p{max-width:34rem;margin:0 auto;opacity:.7;font-size:1.1rem}
.sc-uc_panel{position:sticky;top:0;height:100vh;min-height:560px;background-size:cover;background-position:center;
  overflow:hidden;box-shadow:0 -24px 60px rgba(0,0,0,.45)}
.sc-uc_inner{position:relative;height:100%;max-width:90rem;margin:0 auto;padding:0 5vw}
.sc-uc_text{position:absolute;left:5vw;right:5vw;bottom:9vh;max-width:46rem}
.sc-uc_num{font-size:.85rem;letter-spacing:.14em;opacity:.65}
.sc-uc_title{font-size:clamp(3rem,7.5vw,7rem);font-weight:300;line-height:1;margin:.6rem 0 1.4rem;letter-spacing:-.02em}
.sc-uc_text p{font-size:1.05rem;line-height:1.6;opacity:.85;max-width:40rem}
.sc-uc_card{position:absolute;top:16vh;right:5vw;width:min(25rem,40vw);padding:1rem 1.1rem 1.1rem;border-radius:1rem;
  background:rgba(22,22,24,.62);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(14px);
  -webkit-backdrop-filter:blur(14px);box-shadow:0 20px 50px rgba(0,0,0,.4);transform:translateY(24px);opacity:0;
  transition:opacity .7s ease,transform .7s ease}
.sc-uc_panel.is-in .sc-uc_card{opacity:1;transform:none}
.sc-uc_card-head{display:flex;justify-content:space-between;align-items:center;font-size:.78rem;margin-bottom:.6rem}
.sc-uc_card-head span{opacity:.7}
.sc-uc_card-head b{font-weight:500;display:flex;align-items:center;gap:.4rem}
.sc-uc_card-head em{width:.5rem;height:.5rem;border-radius:50%;animation:sc-uc-pulse 1.6s infinite}
.sc-uc_card svg{display:block;width:100%;height:7rem;overflow:visible}
.sc-uc_grid line{stroke:rgba(255,255,255,.08);stroke-width:1}
.sc-uc_thr{stroke:rgba(255,90,106,.7);stroke-width:1;stroke-dasharray:4 4}
.sc-uc_line{fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:420;stroke-dashoffset:420;
  vector-effect:non-scaling-stroke}
.sc-uc_panel.is-in .sc-uc_line{transition:stroke-dashoffset 2.2s ease .3s;stroke-dashoffset:0}
.sc-uc_bars{display:flex;gap:3px;align-items:flex-end;height:1.6rem;margin-top:.7rem}
.sc-uc_bars i{flex:1;border-radius:2px;transform-origin:bottom;animation:sc-uc-bar 1.8s ease-in-out infinite alternate}
.sc-uc_bars i:nth-child(3n){animation-delay:-.6s}.sc-uc_bars i:nth-child(3n+1){animation-delay:-1.2s}
@keyframes sc-uc-pulse{50%{opacity:.25}}
@keyframes sc-uc-bar{from{transform:scaleY(.45)}to{transform:scaleY(1)}}
@media (max-width:767px){
  .sc-uc_intro{padding:6rem 1.25rem 4rem}
  .sc-uc_card{top:12vh;left:1.25rem;right:1.25rem;width:auto}
  .sc-uc_text{left:1.25rem;right:1.25rem;bottom:6vh}
  .sc-uc_text p{font-size:.95rem}
}
@media (prefers-reduced-motion:reduce){.sc-uc_line{stroke-dashoffset:0}.sc-uc_card{opacity:1;transform:none}
  .sc-uc_bars i,.sc-uc_card-head em{animation:none}}
</style>
"""

USECASES_JS = """
<script>
(function(){var ps=document.querySelectorAll('.sc-uc_panel');if(!('IntersectionObserver' in window)){
ps.forEach(function(p){p.classList.add('is-in')});return}var io=new IntersectionObserver(function(es){
es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in')}})},{threshold:.45});
ps.forEach(function(p){io.observe(p)})})();
</script>
"""
