# Cherry Studio — Türkçe yerelleştirme ve Windows paketleme

Bu kısa rehber tr-TR dil dosyasını projeye ekleme, yerel test ve Windows için .exe (NSIS installer) ve portable build oluşturmayı açıklar.

1) Dil dosyasını projeye kopyalama

- Yerel tr-tr.json dosyanız varsa PowerShell ile:

```powershell
.\scripts\integrate-tr.ps1 'C:\path\to\your\local\i18n' origin
```

2) Geliştirme sunucusunu çalıştırma (Node.js yüklü olmalı)

```powershell
npm ci
npm run dev
```

Uygulama açıldıktan sonra Settings → Language bölümünden Türkçe'yi seçin. Eğer çeviriler görünmüyorsa `src/renderer/src/i18n/index.ts` dosyasının uygulama tarafından import edildiğinden emin olun.

3) Windows installer/portable oluşturma

```powershell
npm ci
npx electron-rebuild
npm run build:win
# veya portable için:
npm run build:win:portable
```

Çıktılar `dist/` içinde bulunacaktır.

Notlar

- Eğer uygulama kendi i18n altyapısını kullanıyorsa `src/renderer/src/i18n/index.ts` dosyasını projedeki mevcut i18n bootstrapa entegre edin.
- CI için `.github/workflows/windows-build.yml` dosyası eklendi.
