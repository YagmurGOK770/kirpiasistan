/**
 * Kirpi Asistan — e-posta kayıt backend'i (Google Apps Script Web App)
 * ---------------------------------------------------------------------
 * Web sitesindeki "Haber ver" formundan gelen e-postaları bir Google
 * Sheet'e satır olarak ekler. Tasarımda hiçbir değişiklik gerektirmez.
 *
 * KURULUM (bir kez):
 *   1. https://sheets.google.com adresinde yeni bir Google Sheet oluştur
 *      (örn. "Kirpi Kayıtları"). İlk satıra başlık eklemene gerek yok;
 *      script ilk çalıştığında otomatik ekler.
 *   2. O Sheet içinde: Uzantılar (Extensions) → Apps Script.
 *   3. Açılan editördeki kodu sil, bu dosyanın TAMAMINI yapıştır.
 *   4. Kaydet (disk simgesi).
 *   5. Sağ üstte "Dağıt" (Deploy) → "Yeni dağıtım" (New deployment).
 *      - Tür (type): "Web uygulaması" (Web app)
 *      - Çalıştıran (Execute as): "Ben" (Me)
 *      - Erişim (Who has access): "Herkes" (Anyone)
 *      - "Dağıt" de, yetkileri onayla (kendi Google hesabınla).
 *   6. Sana ".../exec" ile biten bir URL verir. O URL'yi kopyala.
 *   7. index.html içindeki NOTIFY_ENDPOINT değerini o URL ile değiştir.
 *
 * Kodu güncellersen: Dağıt → Dağıtımları yönet → kalemle düzenle →
 * "Yeni sürüm" seçip tekrar dağıt (URL aynı kalır).
 */

function doPost(e) {
  try {
    var data = {};
    try { data = JSON.parse(e.postData.contents); } catch (err) {}

    var email = (data.email || '').toString().trim();
    var source = (data.source || '').toString();

    // Basit e-posta doğrulaması; geçersizse kaydetme.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json_({ ok: false, error: 'invalid_email' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Başlık satırı yoksa ekle.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Tarih', 'E-posta', 'Kaynak']);
    }

    sheet.appendRow([new Date(), email, source]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Tarayıcıdan doğrudan açıldığında çalıştığını gösterir (test için).
function doGet() {
  return json_({ ok: true, message: 'Kirpi Asistan notify endpoint is live.' });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
