# Kirpi — Tanıtım Sitesi

Bu depo, **Kirpi** mobil uygulamasının tanıtım (landing) sayfasını içerir.

Kirpi, emlak danışmanları için akıllı bir **kira sözleşmesi ve yenileme takip** uygulamasıdır.
Sözleşmeleri, yenileme tarihlerini ve artış oranlarını tek yerde tutar; zamanı gelince
kullanıcıyı hatırlatmalarla uyarır. Uygulama **çok yakında** iOS ve Android'de yayınlanacaktır.

## İçerik

| Dosya | Açıklama |
|-------|----------|
| `index.html` | Tek dosyalık, bağımsız tanıtım sayfası (Albert Sans + JetBrains Mono, Slate/Sky teması) |
| `kirpi-hedgehog.png` | Kirpi maskotu (logo) |
| `icon.png` | Uygulama ikonu / favicon |

## Yerelde Görüntüleme

Ayrı bir kurulum gerekmez — `index.html` dosyasını doğrudan tarayıcıda açın:

```bash
# Windows
start index.html
```

İsterseniz basit bir yerel sunucuyla da çalıştırabilirsiniz:

```bash
python -m http.server 8000
# ardından http://localhost:8000 adresini açın
```

## Yayınlama (GitHub Pages)

Bu site tek bir statik HTML dosyasıdır ve GitHub Pages ile yayınlanabilir:

1. **Settings → Pages** bölümüne gidin.
2. **Source** olarak `Deploy from a branch` seçin.
3. Branch'i `main` ve klasörü `/ (root)` olarak ayarlayıp kaydedin.

Birkaç dakika içinde site `https://yagmurgok770.github.io/kirpiasistan/` adresinde yayında olur.

---

© 2026 Kirpi · Emlak danışmanları için kira yenileme takipçisi
