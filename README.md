# SmellController

SmartNanotubes Smell Inspector e-burun cihazı için web tabanlı kontrol ve analiz uygulaması.

---

## Gereksinimler

| Araç | Minimum Sürüm |
|------|---------------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |

---

## Başlatma

```bash
bash start.sh
```

Script ilk çalıştırmada tüm bağımlılıkları otomatik kurar:

- Python sanal ortamı oluşturur ve `requirements.txt` paketlerini yükler
- `npm install` ile frontend paketlerini yükler
- 8000 ve 5173 portları doluysa otomatik olarak boş port bulur

Uygulama başladıktan sonra:

- **Web Arayüzü:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs

Durdurmak için `Ctrl+C`.

---

## Sayfalar

### Canlı İzleme
Cihazdan gelen ham sensör verilerini gerçek zamanlı görselleştirir.

- **Isı Haritası** — 4 çip × 16 kanal değerlerini renk skalasıyla gösterir
- **Koku Parmak İzi** — Radar grafikle her çipin profili
- **Kanal Grafikleri** — Tüm 64 kanal çizgi grafiği
- **Zaman Serisi** — Seçilen kanalların zaman içindeki değişimi

Bağlantı için "Cihaza Bağlan" düğmesine tıklayın. Cihaz yoksa "Demo Modu" ile simülasyon çalıştırabilirsiniz.

---

### Veri Toplama
ML modeli eğitmek için koku örnekleri kaydeder.

**Kullanım adımları:**

1. Etiket alanına koku adı yazın (ör. `kahve`, `taze_muz`, `bozuk_muz`)
2. Sensörü koku kaynağına yaklaştırın
3. "Kayıt Başlat" → en az 30 saniye bekleyin → "Durdur"
4. Her koku etiketi için ayrı kayıt alın

> Model eğitmek için en az **2 farklı etiket** gereklidir. Her etiket için en az 5 kayıt önerilir.

**Örnek — bozulmuş muz tespiti:**

| Adım | Etiket | Süre |
|------|--------|------|
| 1 | `ambient_hava` | 60 sn (temiz hava, baseline) |
| 2 | `taze_muz` | 60 sn (taze muz koklatın) |
| 3 | `bozuk_muz` | 60 sn (bozulmuş muz koklatın) |

---

### Model Eğitimi
Kaydedilen CSV dosyalarından ML modeli eğitir.

1. Listeden eğitmek istediğiniz CSV dosyalarını seçin
2. Algoritma seçin (önerilen: **Random Forest**)
3. Model adı girin
4. "Eğitimi Başlat" düğmesine tıklayın

Eğitim tamamlandığında doğruluk oranı ve sınıflandırma raporu görüntülenir.

> `kentucky_clean.csv` hazır ve temizlenmiş 2532 örnekli veri setidir (7 sınıf). Hızlı test için onu kullanın.

---

### Koku Tespiti
Aktif ML modeliyle anlık koku analizi yapar.

1. **Model Seç** — Listeden bir model seçip "Seç" düğmesine tıklayın
2. **Cihazı Bağla** — Canlı İzleme sayfasından bağlantı kurun
3. **Şimdi Tara** — Anlık ölçüm alır ve güven yüzdelerini gösterir

Sonuç kutusunun altında hangi modelin kullanıldığı yazar. Aktif modelden farklı bir sonuç gelirse ⚠ uyarısı çıkar.

---

## Cihaz Bilgisi

**SmartNanotubes Smell Inspector**

- Bağlantı: USB (CP2102, `/dev/cu.usbserial-*`)
- Çip sayısı: 4
- Kanal sayısı: 64 (çip başına 16)
- Ölçüm: Kimyasal direnç (Ω)
- Veri hızı: ~1.8 saniyede bir ölçüm

---

## Proje Yapısı

```
smellcontroller/
├── start.sh                  # Tek komutla başlatma scripti
├── backend/
│   ├── main.py               # FastAPI uygulaması
│   ├── config.py             # Yollar ve sabitler
│   ├── api/
│   │   ├── routes/           # REST endpoint'leri
│   │   └── websocket.py      # Gerçek zamanlı veri akışı
│   ├── ml/
│   │   ├── trainer.py        # Model eğitimi
│   │   ├── predictor.py      # Tahmin motoru
│   │   └── feature_extractor.py
│   ├── sensor/
│   │   ├── reader.py         # Seri port okuyucu
│   │   └── simulator.py      # Demo modu
│   └── data/
│       ├── recordings/       # Kaydedilen CSV dosyaları
│       └── models/           # Eğitilmiş modeller (.pkl)
└── frontend/
    └── src/
        ├── pages/            # Monitor, Collection, Training, Detection
        ├── components/       # Grafik bileşenleri
        ├── hooks/            # WebSocket hook
        └── services/         # API istemcisi
```

---

## Sorun Giderme

**Backend başlamıyor**
```bash
# Port meşgulse script otomatik başka port bulur
# Manuel kontrol için:
lsof -iTCP:8000 -sTCP:LISTEN
```

**Cihaz listelenmiyor**
- USB kablosunu çıkarıp takın
- macOS'ta System Preferences → Privacy → USB erişim izni kontrol edin

**Model yüklendikten sonra tespit çalışmıyor**
- Backend yeniden başlatıldıysa modeli tekrar "Seç" ile yükleyin (in-memory model sıfırlanır)

**Eğitim hatası: "tek sınıf"**
- En az 2 farklı etiketli CSV dosyası seçin
