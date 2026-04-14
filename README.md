# 📁 File Uploader Portable

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)

Aplikasi web modern untuk upload file dengan kategorisasi otomatis, chunked upload untuk file besar, dan akses online via Cloudflare Tunnel. Portable dan mudah digunakan tanpa instalasi server kompleks.

## 🖼️ Preview

**Modern UI dengan gradient design:**
- Drag & drop interface yang intuitif
- Two-column layout (Upload & History)
- Real-time progress tracking
- Responsive untuk semua device (desktop, tablet, mobile)

> 💡 **Tip:** Ambil screenshot aplikasi Anda dan upload ke repository untuk mengganti bagian ini!

## 📋 Daftar Isi

- [Tentang Aplikasi](#-tentang-aplikasi)
- [Fitur Utama](#-fitur-utama)
- [Spesifikasi Teknis](#-spesifikasi-teknis)
- [Prasyarat](#-prasyarat)
- [Instalasi](#-instalasi)
- [Cara Penggunaan](#-cara-penggunaan)
- [Konfigurasi](#-konfigurasi)
- [Dokumentasi](#-dokumentasi)
- [Struktur Project](#-struktur-project)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Tentang Aplikasi

File Uploader Portable adalah aplikasi web full-stack yang memungkinkan Anda untuk:
- Upload file dari browser dengan drag & drop
- Mengakses aplikasi dari mana saja (PC, laptop, HP) via internet
- Menyimpan file secara lokal di komputer Anda
- Mengorganisir file otomatis berdasarkan kategori
- Upload file besar (hingga 500MB) dengan teknologi chunked upload

**Use Case:**
- Personal file storage yang bisa diakses dari mana saja
- Sharing file dengan teman/keluarga
- Backup file dari HP ke PC
- Transfer file antar device tanpa kabel

## ✨ Fitur Utama

### 🚀 Upload & Storage
- **Multiple File Upload** - Upload banyak file sekaligus
- **Drag & Drop Interface** - Seret file langsung ke browser
- **Chunked Upload** - File ≥50MB otomatis dipecah untuk upload lebih stabil
- **Progress Tracking** - Lihat progress upload real-time
- **Auto Categorization** - File otomatis diatur ke folder berdasarkan tipe

### 📱 User Interface
- **Modern Design** - UI gradient dengan Tailwind CSS
- **Responsive** - Bekerja sempurna di desktop, tablet, dan mobile
- **Real-time Feedback** - Toast notifications untuk setiap aksi
- **Upload History** - Lihat semua file yang pernah diupload
- **File Preview** - Preview file sebelum upload

### 🌐 Online Access
- **Cloudflare Tunnel** - Akses dari internet tanpa port forwarding
- **Quick Tunnel** - Setup 1 menit dengan URL random
- **Named Tunnel** - URL tetap yang tidak berubah
- **HTTPS** - Koneksi aman via Cloudflare

### 🔒 Security & Performance
- **CORS Protection** - Hanya origin yang diizinkan bisa akses
- **Rate Limiting** - Proteksi dari abuse (100 req/15 menit)
- **File Validation** - Validasi ukuran dan tipe file
- **Compression** - Response compression untuk performa lebih baik

## 🛠 Spesifikasi Teknis

### Frontend
- **Framework:** React 18.3.1
- **Language:** TypeScript 5.6.2
- **Build Tool:** Vite 6.0.1
- **Styling:** Tailwind CSS 3.4.17
- **UI Components:** shadcn/ui
- **Icons:** lucide-react 0.468.0
- **HTTP Client:** Axios 1.7.9
- **State Management:** TanStack Query 5.62.11

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express 4.21.2
- **Language:** TypeScript 5.7.3
- **Database:** PostgreSQL 14+
- **File Upload:** Multer 1.4.5-lts.1
- **Security:** CORS, Rate Limiting, Compression
- **Testing:** Jest 29.7.0

### Infrastructure
- **Tunnel:** Cloudflare Tunnel (cloudflared)
- **Storage:** Local file system
- **Database:** PostgreSQL (via Docker atau native)

### Bahasa Pemrograman
- **TypeScript** - 95% (Frontend & Backend)
- **JavaScript** - 3% (Config files)
- **SQL** - 2% (Database migrations)

## 📦 Prasyarat

Sebelum instalasi, pastikan Anda memiliki:

- **Node.js** versi 18 atau lebih baru ([Download](https://nodejs.org/))
- **npm** (included dengan Node.js)
- **PostgreSQL** versi 14+ ([Download](https://www.postgresql.org/download/))
- **Windows OS** (untuk script .bat, atau sesuaikan untuk OS lain)
- **Git** untuk clone repository ([Download](https://git-scm.com/))

**Optional:**
- **Docker** untuk database (alternatif PostgreSQL native)
- **Akun Cloudflare** (gratis) untuk Named Tunnel

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/Thesarss/File-Uploader-Portable.git
cd File-Uploader-Portable
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Setup Database

**Opsi A: Menggunakan Docker (Recommended)**
```bash
# Di root directory
docker-compose up -d
```

**Opsi B: PostgreSQL Native**
```bash
# Buat database
createdb file_uploader

# Setup schema
cd backend
node setup-database.js
```

### 4. Konfigurasi Environment

**Backend (.env):**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=3000
NODE_ENV=development
TARGET_FOLDER=D:/uploads
MAX_FILE_SIZE=524288000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=file_uploader
DB_USER=uploader
DB_PASSWORD=uploader123
ALLOWED_ORIGINS=http://localhost:4173
```

**Frontend (.env):**
```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=300000
```

### 5. Build Aplikasi

**Backend:**
```bash
cd backend
npm run build
```

**Frontend:**
```bash
cd ../frontend
npm run build
```

### 6. Buat Folder Upload

```bash
mkdir D:\uploads
```

## 🎯 Cara Penggunaan

### Mode 1: Lokal (Hanya di PC Ini)

**Jalankan:**
```bash
# Di root directory
start-all.bat
```

**Akses:**
- Buka browser: http://localhost:4173
- Upload file dengan drag & drop atau klik
- File tersimpan di `D:\uploads\`

### Mode 2: Online - URL Random (Quick Tunnel)

**Jalankan:**
```bash
start-online-quick.bat
```

**Akses:**
- Cek terminal "Cloudflare Tunnel" untuk URL
- Contoh: `https://random-words.trycloudflare.com`
- Akses dari device mana saja (PC, HP, tablet)

**Catatan:** URL berubah setiap restart

### Mode 3: Online - URL Tetap (Named Tunnel)

**Setup (Sekali Saja):**

1. Login Cloudflare:
```bash
.\cloudflared.exe tunnel login
```

2. Buat tunnel:
```bash
.\cloudflared.exe tunnel create file-uploader
```

3. Edit `cloudflared-named-tunnel.yml`:
```yaml
tunnel: <TUNNEL-ID>
credentials-file: C:\Users\<USERNAME>\.cloudflared\<TUNNEL-ID>.json

ingress:
  - hostname: myupload.trycloudflare.com
    service: http://localhost:4173
  - hostname: myupload-api.trycloudflare.com
    service: http://localhost:3000
  - service: http_status:404
```

4. Setup DNS:
```bash
.\cloudflared.exe tunnel route dns file-uploader myupload.trycloudflare.com
.\cloudflared.exe tunnel route dns file-uploader myupload-api.trycloudflare.com
```

5. Update config aplikasi:
- `frontend/.env`: `VITE_API_BASE_URL=https://myupload-api.trycloudflare.com`
- `backend/.env`: Tambahkan URL ke `ALLOWED_ORIGINS`

6. Rebuild & jalankan:
```bash
cd frontend && npm run build
start-online-named.bat
```

**Akses:** https://myupload.trycloudflare.com (URL TETAP!)

**Detail lengkap:** Lihat [CARA_BUAT_URL_TETAP.md](CARA_BUAT_URL_TETAP.md)

## ⚙️ Konfigurasi

### Backend Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | 3000 | Port backend server |
| `NODE_ENV` | development | Environment mode |
| `TARGET_FOLDER` | D:/uploads | Lokasi penyimpanan file |
| `MAX_FILE_SIZE` | 524288000 | Max ukuran file (500MB) |
| `ALLOWED_ORIGINS` | localhost | CORS allowed origins (comma-separated) |
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | file_uploader | Database name |
| `DB_USER` | uploader | Database user |
| `DB_PASSWORD` | uploader123 | Database password |

### Frontend Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `VITE_API_BASE_URL` | http://localhost:3000 | URL backend API |
| `VITE_API_TIMEOUT` | 300000 | Request timeout (5 menit) |

### Kategorisasi File

File otomatis diatur ke subfolder berdasarkan ekstensi:

| Kategori | Ekstensi | Folder |
|----------|----------|--------|
| Photo | jpg, png, gif, svg, webp, ico | D:\uploads\Photo\ |
| Video | mp4, avi, mkv, mov, wmv, flv | D:\uploads\Video\ |
| Document | pdf, doc, docx, txt, xls, ppt | D:\uploads\Document\ |
| Audio | mp3, wav, flac, aac, ogg | D:\uploads\Audio\ |
| Archive | zip, rar, 7z, tar, gz | D:\uploads\Archive\ |
| Other | Lainnya | D:\uploads\Other\ |

## 📚 Dokumentasi

### Panduan Lengkap
- **[MULAI_DISINI.md](MULAI_DISINI.md)** - Quick start guide
- **[PANDUAN_LENGKAP.md](PANDUAN_LENGKAP.md)** - Panduan lengkap instalasi & troubleshooting
- **[CARA_BUAT_URL_TETAP.md](CARA_BUAT_URL_TETAP.md)** - Tutorial URL tetap dengan Named Tunnel
- **[STRUKTUR_PROJECT.md](STRUKTUR_PROJECT.md)** - Struktur file & folder
- **[SUMMARY.md](SUMMARY.md)** - Ringkasan cleanup & optimasi

### API Documentation

**Upload Files**
```
POST /api/upload
Content-Type: multipart/form-data

Body:
- files: File[] (required)
- sessionId: string (optional)
- deviceInfo: string (optional)

Response:
{
  "success": true,
  "totalFiles": 2,
  "successCount": 2,
  "failureCount": 0,
  "results": [...]
}
```

**Get History**
```
GET /api/history?sessionId=xxx&limit=50

Response:
{
  "success": true,
  "count": 10,
  "uploads": [...]
}
```

**Get Config**
```
GET /api/config

Response:
{
  "success": true,
  "config": {
    "maxFileSize": 524288000,
    "supportedCategories": [...],
    "acceptedExtensions": {...}
  }
}
```

## 📁 Struktur Project

```
file-uploader/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # API client & utilities
│   │   ├── App.tsx        # Main component
│   │   └── main.tsx       # Entry point
│   ├── dist/              # Build output
│   └── package.json
│
├── backend/               # Express API
│   ├── src/
│   │   ├── server.ts      # Main server
│   │   ├── chunk-service.ts    # Chunked upload
│   │   ├── file-service.ts     # File handling
│   │   ├── storage-service.ts  # Storage logic
│   │   └── *.test.ts      # Tests
│   ├── migrations/        # Database migrations
│   ├── dist/              # Build output
│   └── package.json
│
├── cloudflared.exe        # Cloudflare Tunnel binary
├── start-all.bat          # Run local
├── start-online-quick.bat # Run online (random URL)
├── start-online-named.bat # Run online (fixed URL)
└── README.md              # This file
```

## 🧪 Testing

### Run All Tests

**Backend:**
```bash
cd backend
npm test
```

**Frontend:**
```bash
cd frontend
npm test
```

### Run Specific Tests

```bash
# Unit tests
npm test -- file-service.test.ts

# Integration tests
npm test -- storage-service.integration.test.ts

# Property-based tests
npm test -- file-service.property.test.ts
```

### Test Coverage

```bash
cd backend
npm test -- --coverage
```

## 🔧 Troubleshooting

### Upload Gagal

**Masalah:** File tidak terupload

**Solusi:**
1. Cek semua terminal masih running
2. Cek folder `D:\uploads` ada dan bisa ditulis
3. Cek ukuran file < 500MB
4. Refresh halaman browser

### CORS Error

**Masalah:** "Access blocked by CORS policy"

**Solusi:**
1. Tambahkan URL frontend ke `ALLOWED_ORIGINS` di `backend/.env`
2. Restart backend
3. Contoh: `ALLOWED_ORIGINS=http://localhost:4173,https://your-url.com`

### Timeout Error

**Masalah:** "Connection timeout" saat upload file besar

**Solusi:**
- File ≥50MB otomatis pakai chunked upload
- Cek koneksi internet stabil
- Pastikan backend running

### History Kosong

**Masalah:** Upload history tidak muncul

**Solusi:**
1. Klik tombol "Refresh"
2. Cek backend logs di terminal
3. Pastikan database running

### Database Connection Error

**Masalah:** "Failed to connect to database"

**Solusi:**
1. Pastikan PostgreSQL running
2. Cek credentials di `backend/.env`
3. Test connection: `psql -U uploader -d file_uploader`

**Troubleshooting lengkap:** Lihat [PANDUAN_LENGKAP.md](PANDUAN_LENGKAP.md)

## 🤝 Contributing

Kontribusi sangat diterima! Silakan:

1. Fork repository ini
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

### Development Guidelines

- Gunakan TypeScript untuk semua code baru
- Tulis tests untuk fitur baru
- Follow existing code style
- Update dokumentasi jika perlu

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👤 Author

**Thesarss**
- GitHub: [@Thesarss](https://github.com/Thesarss)
- Repository: [File-Uploader-Portable](https://github.com/Thesarss/File-Uploader-Portable)

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI Framework
- [Express](https://expressjs.com/) - Backend Framework
- [Cloudflare](https://www.cloudflare.com/) - Tunnel Service
- [shadcn/ui](https://ui.shadcn.com/) - UI Components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Baca dokumentasi di folder `docs/`
2. Cek [Issues](https://github.com/Thesarss/File-Uploader-Portable/issues)
3. Buat issue baru jika belum ada

---

**⭐ Jika project ini membantu, berikan star di GitHub!**

**Made with ❤️ by Thesarss**
