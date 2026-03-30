
# Callout Picker — Obsidian Plugin
 
Obsidian için minimalist, görsel bir callout ekleme eklentisi. Standart callout bloklarını tek tıkla ekleyin veya seçili metni sarın.

> A minimalist, visual callout picker for Obsidian. Insert standard callouts, wrap text, and customize default titles easily.

 
---
 
## Kurulum
 
### Manuel Kurulum
 
1. [Releases](https://github.com/alitekdemir/callout-picker/releases) sayfasından en son sürümü indirin
   **veya** kaynak koddan derleyin:
   ```bash
   git clone https://github.com/alitekdemir/callout-picker.git
   cd callout-picker
   npm install
   NODE_ENV=production npm run build
   ```
 
2. Şu 3 dosyayı vault'unuzdaki `.obsidian/plugins/callout-picker/` klasörüne kopyalayın:
   - `main.js`
   - `manifest.json`
   - `styles.css`
 
3. Obsidian'ı yeniden başlatın (veya eklentileri yenileyin)
 
4. **Settings → Community Plugins → Callout Picker** → etkinleştirin
 
---
 
## Kullanım
 
### Callout Picker'ı Açma
 
Üç farklı yol ile açabilirsiniz:
 
| Yöntem | Nasıl |
|--------|-------|
| **Komut Paleti** | `Ctrl/Cmd + P` → `Callout Seçici` |
| **Kısayol Tuşu** | Settings → Hotkeys → `Callout Seçici` için kısayol atayın |
| **Sağ Tık Menüsü** | Editörde sağ tık → **Callout Ekle** |
 
### Modal Arayüzü
 
Modal açıldığında 13 callout türü 3 sütunlu ızgara düzeninde gösterilir.
 
Her kart şunları içerir:
- Renkli sol kenarlık (callout rengi)
- Lucide ikonu
- Callout adı
- Varsa alias'lar (diğer adlar)
- Ayarlanmış varsayılan başlık (varsa, italik)
 
```
┌──────────────────────────────────────────────────┐
│ CALLOUT SEÇ                         ↑↓←→ · Enter │
├─────────────┬─────────────┬──────────────────────┤
│ │ Note      │ │ Abstract  │ │ Info               │
│ │           │ │ summary…  │ │                    │
├─────────────┼─────────────┼──────────────────────┤
│ │ Tip       │ │ Success   │ │ Question           │
│ │ hint…     │ │ check…    │ │ help…              │
├─────────────┼─────────────┼──────────────────────┤
│ │ Warning   │ │ Failure   │ │ Danger             │
│ │ caution…  │ │ fail…     │ │ error              │
├─────────────┼─────────────┼──────────────────────┤
│ │ Bug       │ │ Example   │ │ Quote              │
│ │           │ │           │ │ cite               │
└─────────────┴─────────────┴──────────────────────┘
```
 
### Klavye Navigasyonu
 
| Tuş | İşlev |
|-----|-------|
| `←` `→` `↑` `↓` | Kartlar arasında gezin |
| `Enter` veya `Space` | Seçili callout'u ekle |
| `Escape` | Modalı kapat |
 
---
 
## Editör Davranışı
 
### Seçili Metin Varsa → Sarma (Wrap)
 
Metni seçin, ardından bir callout türü seçin:
 
**Önce:**
```
Bu önemli bir uyarıdır.
```
 
**Sonra** (`warning` seçildiğinde, varsayılan başlık "Dikkat"):
```
> [!warning] Dikkat
> Bu önemli bir uyarıdır.
```
 
**Çok satırlı seçimde:**
```
> [!warning]
> Birinci satır
> İkinci satır
> Üçüncü satır
```
 
### Seçili Metin Yoksa → Boş Callout Ekle
 
İmleç konumuna boş bir callout bloğu eklenir, imleç `> ` kısmına yerleşir:
 
```
> [!tip]
> |  ← imleç burada
```
 
---
 
## Ayarlar
 
**Settings → Community Plugins → Callout Picker → Options**
 
### Dil Seçimi
 
| Seçenek | Açıklama |
|---------|----------|
| **Otomatik** | Obsidian'ın arayüz dili kullanılır |
| **Türkçe** | Eklenti arayüzü Türkçe gösterilir |
| **İngilizce** | Eklenti arayüzü İngilizce gösterilir |
 
### Varsayılan Başlıklar
 
Her callout türü için özel bir varsayılan başlık belirleyebilirsiniz.
 
**Örnek:** `warning` için `Dikkat` yazarsanız:
 
```
> [!warning] Dikkat
>
```
 
Başlık alanı boş bırakılırsa callout başlıksız eklenir:
 
```
> [!warning]
>
```
 
---
 
## Desteklenen Callout Türleri
 
| Tür | Renk | Alias'lar |
|-----|------|-----------|
| `note` | Mavi | — |
| `abstract` | Açık mavi | `summary`, `tldr` |
| `info` | Açık mavi | — |
| `todo` | Mavi | — |
| `tip` | Camgöbeği | `hint`, `important` |
| `success` | Yeşil | `check`, `done` |
| `question` | Sarı-yeşil | `help`, `faq` |
| `warning` | Turuncu | `caution`, `attention` |
| `failure` | Kırmızı | `fail`, `missing` |
| `danger` | Koyu kırmızı | `error` |
| `bug` | Pembe-kırmızı | — |
| `example` | Mor | — |
| `quote` | Gri | `cite` |
 
---
 
## Geliştirme
 
```bash
git clone https://github.com/alitekdemir/callout-picker.git
cd callout-picker
npm install
 
# Geliştirme modunda çalıştır (watch)
npm run dev
 
# Production build
NODE_ENV=production npm run build
```
 
### Teknoloji Yığını
 
- **TypeScript** — tip güvenli plugin kodu
- **Svelte 4** — reaktif modal arayüzü
- **esbuild** — hızlı bundler
 
### Klasör Yapısı
 
```
callout-picker/
├── src/
│   ├── main.ts                    # Plugin giriş noktası
│   ├── types.ts                   # PluginSettings arayüzü
│   ├── i18n.ts                    # TR/EN çeviriler
│   ├── calloutData.ts             # 13 callout tanımı + SVG ikonlar
│   ├── CalloutPickerModal.ts      # Obsidian Modal + editör mantığı
│   ├── SettingsTab.ts             # Ayarlar sekmesi
│   └── components/
│       └── CalloutPicker.svelte   # Görsel ızgara bileşeni
├── main.js                        # Derlenmiş çıktı (Obsidian yükler)
├── manifest.json
├── styles.css
├── esbuild.config.mjs
└── package.json
```
 
---
 
## Lisans
 
MIT © [Ali Tekdemir](https://github.com/alitekdemir)
