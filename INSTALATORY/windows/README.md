# BASTION — Windows

## Pliki

| Plik | Dla kogo |
|------|----------|
| `BASTION-Setup-*-win-x64.exe` | Windows 10/11 **64-bit** (Intel / AMD) |
| `BASTION-Setup-*-win-arm64.exe` | Windows 11 **ARM64** (Surface Pro X, Snapdragon) |
| `BASTION-Portable-*-win-x64.exe` | Awaryjnie — jeden plik, bez instalacji |
| `BASTION-*-win-x64-portable.zip` | Awaryjnie — rozpakuj i uruchom `BASTION.exe` |

## Instalacja (NSIS)

1. Pobierz właściwy plik `.exe` (patrz tabela).
2. **Sprawdź rozmiar:** instalator x64 ma ok. **125 MB**. Jeśli plik ma ~130 B — to wskaźnik Git LFS, nie instalator (patrz niżej).
3. Kliknij prawym → **Uruchom jako administrator** (jeśli SmartScreen blokuje).
4. Dalej → wybierz folder → Zainstaluj.

## Portable (gdy instalator nie działa)

1. Pobierz `BASTION-*-win-x64-portable.zip` (~177 MB) **albo** `BASTION-Portable-*-win-x64.exe`.
2. ZIP: rozpakuj do np. `C:\BASTION\` i uruchom `BASTION.exe`.
3. Portable EXE: uruchom bezpośrednio.

## „Aplikacja nie będzie działać na twoim komputerze”

Najczęstsze przyczyny:

1. **Uszkodzony download (Git LFS)** — plik ma kilkaset bajtów zamiast ~125 MB.  
   Pobierz ponownie:
   ```bash
   git lfs install
   git clone https://gitlab.com/michas7/bastion.git
   cd bastion
   git lfs pull
   ```
   Albo w GitLab: **Download** przy pliku (nie surowy wskaźnik LFS).

2. **Zły procesor** — instalator x64 nie działa na Windows 32-bit. Na ARM użyj `win-arm64.exe` lub portable x64 (Windows 11 z emulacją x64).

3. **Stary Windows** — Electron 42 wymaga **Windows 10 lub 11**. Windows 7/8 nie są wspierane.

4. **Antywirus / SmartScreen** — aplikacja nie jest podpisana certyfikatem EV. Dodaj wyjątek lub użyj wersji portable.

## Weryfikacja pobrania

W `../manifest.json` są pola `sizeBytes` i `sha256` dla każdego pliku.
