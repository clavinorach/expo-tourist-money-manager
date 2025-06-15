# Tourist Money Manager

Aplikasi **Tourist Money Manager** membantu wisatawan dalam mengelola keuangan selama perjalanan, termasuk fitur chat AI berbasis Google Gemini untuk membantu perencanaan dan konsultasi keuangan.

## Fitur Utama
- Pencatatan pemasukan dan pengeluaran
- Kategori transaksi
- Konsultasi keuangan dengan AI (Google Gemini)
- Dukungan multi-bahasa
- UI/UX ramah pengguna

## Instalasi

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd tourist-money-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   # atau
   yarn install
   ```

3. **Konfigurasi Environment**
   - Buat file `.env` di root proyek.
   - Tambahkan API key Gemini Anda:
     ```env
     EXPO_PUBLIC_EXCHANGE_RATE_API_KEY=
     EXPO_PUBLIC_GEMINI_API_KEY=
     ```

4. **Jalankan aplikasi**
   ```bash
   npx expo start
   ```
   atau
   ```bash
   yarn expo start
   ```

## Struktur Folder
- `app/` : Entry point aplikasi dan navigasi
- `components/` : Komponen UI
- `services/` : Integrasi API (termasuk Gemini)
- `database/` : Manajemen data lokal
- `hooks/` : Custom hooks React
- `constants/` : Konstanta global
- `assets/` : Gambar dan aset statis

## Kontribusi
Kontribusi sangat terbuka! Silakan fork, buat branch, dan ajukan pull request.

## Lisensi
Proyek ini menggunakan lisensi MIT.

---

**Catatan:**
- Pastikan API key Gemini valid dan memiliki kuota yang cukup.
- Untuk pertanyaan lebih lanjut, silakan hubungi maintainer proyek. 
