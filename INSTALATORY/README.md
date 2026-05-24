# INSTALATORY BASTION

Gotowe pakiety instalacyjne aplikacji desktopowej **BASTION** (Electron).

## Szybki wybór

| System | Plik w tym folderze | Instalacja |
|--------|---------------------|------------|
| **macOS** (Apple Silicon / Intel) | `macos/BASTION-*-mac-*.dmg` | Otwórz DMG → przeciągnij BASTION do Applications |
| **Windows** 64-bit | `windows/BASTION-Setup-*-win-x64.exe` | Uruchom instalator → Dalej → Zainstaluj |
| **Fedora / RHEL** 64-bit | `linux/BASTION-*-linux-x86_64.rpm` | `sudo dnf install ./BASTION-*.rpm` |
| **Linux** (uniwersalny) | `linux/BASTION-*-linux-x86_64.AppImage` | `chmod +x …AppImage && ./BASTION-*.AppImage` |
| **Debian / Ubuntu** | `linux/BASTION-*-linux-amd64.deb` *(build na Linux)* | `sudo apt install ./BASTION-*.deb` |

Szczegóły per platforma: [macos/README.md](macos/README.md) · [windows/README.md](windows/README.md) · [linux/README.md](linux/README.md)

## Pierwsze uruchomienie

1. Zaloguj się demo: **mjr. Andrzej Kowalski (DOWÓDCA)**, PIN: `1234`
2. Aplikacja działa offline-first — klucze API opcjonalne (tryb LIVE/degraded).
3. Dane lokalne w profilu użytkownika (IndexedDB).

## Budowa instalatorów (deweloperzy)

```bash
cd bastion
npm install
npm run instalatory:build     # macOS + Windows + Linux → INSTALATORY/
npm run instalatory:copy      # tylko skopiuj z release/
```

Na macOS do RPM (Fedora): `brew install rpm`

## Wymagania systemowe

- **RAM:** min. 4 GB (zalecane 8 GB)
- **Dysk:** ~350 MB na instalację
- **Sieć:** opcjonalna

### Fedora — zależności RPM

`gtk3`, `libnotify`, `nss`, `alsa-lib`, `libXScrnSaver`, `libXtst`

AppImage: `sudo dnf install fuse-libs` jeśli potrzeba.

## Wersja

**1.0.0** (zgodnie z `package.json`).
