# 📁 Struktur Project

## Root Directory

```
file-uploader/
├── 📄 README.md                    # Dokumentasi utama
├── 📄 MULAI_DISINI.md             # Quick start guide
├── 📄 PANDUAN_LENGKAP.md          # Panduan lengkap
├── 📄 CARA_BUAT_URL_TETAP.md      # Tutorial URL tetap
├── 📄 SUMMARY.md                   # Ringkasan cleanup
│
├── 🚀 start-all.bat                # Script: Jalankan lokal
├── 🚀 start-online-quick.bat       # Script: Online (URL random)
├── 🚀 start-online-named.bat       # Script: Online (URL tetap)
│
├── ⚙️ cloudflared.exe              # Cloudflare Tunnel binary
├── ⚙️ cloudflared-named-tunnel.yml # Template config tunnel
│
├── 📦 package.json                 # Root dependencies
└── 🔒 .gitignore                   # Git ignore rules
```

## Frontend Directory

```
frontend/
├── src/
│   ├── components/
│   │   └── ui/                    # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── toast.tsx
│   │       └── toaster.tsx
│   │
│   ├── hooks/
│   │   └── use-toast.ts           # Toast hook
│   │
│   ├── lib/
│   │   ├── api-client.ts          # API calls
│   │   ├── chunked-upload.ts      # Chunked upload logic
│   │   ├── file-validator.ts      # File validation
│   │   ├── query-client.ts        # React Query
│   │   └── utils.ts               # Utilities
│   │
│   ├── App.tsx                    # Main app component
│   ├── App.css                    # App styles
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
│
├── public/                        # Static assets
├── dist/                          # Build output
│
├── .env                           # Environment config
├── .env.example                   # Example config
├── package.json                   # Dependencies
├── vite.config.ts                 # Vite config
├── tailwind.config.js             # Tailwind config
├── tsconfig.json                  # TypeScript config
└── serve.cjs                      # Simple HTTP server
```

## Backend Directory

```
backend/
├── src/
│   ├── server.ts                  # Main server
│   ├── chunk-service.ts           # Chunked upload handler
│   ├── file-service.ts            # File upload logic
│   ├── storage-service.ts         # File storage
│   ├── classifier-service.ts      # File categorization
│   ├── history-service.ts         # Upload history
│   ├── file-repository.ts         # Database operations
│   ├── config-manager.ts          # Configuration
│   ├── db.ts                      # Database connection
│   ├── migrate.ts                 # Database migrations
│   │
│   └── *.test.ts                  # Unit tests
│   └── *.property.test.ts         # Property-based tests
│   └── *.integration.test.ts      # Integration tests
│
├── migrations/
│   ├── 001_create_uploads_table.sql
│   └── 002_create_configuration_table.sql
│
├── dist/                          # Build output
├── temp-chunks/                   # Temporary chunk storage
│
├── .env                           # Environment config
├── .env.example                   # Example config
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── jest.config.js                 # Jest config
└── setup-database.js              # Database setup script
```

## File Storage

```
D:\uploads\                        # Upload destination
├── Photo/                         # Images
├── Video/                         # Videos
├── Document/                      # Documents
├── Audio/                         # Audio files
├── Archive/                       # Compressed files
└── Other/                         # Other files
```

## File Counts

- **Root:** 13 files (4 docs, 3 scripts, 6 config/binary)
- **Frontend src:** 15 files (components, hooks, lib, main)
- **Backend src:** 30+ files (services, tests)
- **Total dokumentasi:** 4 files (clean!)

## File Penting

### Harus Ada
- ✅ `frontend/.env` - Frontend config
- ✅ `backend/.env` - Backend config
- ✅ `cloudflared.exe` - Tunnel binary
- ✅ `D:\uploads\` - Upload folder

### Opsional
- `cloudflared-tunnel.yml` - Hanya untuk Named Tunnel
- `frontend/dist/` - Auto-generated saat build
- `backend/dist/` - Auto-generated saat build

## Cara Kerja

1. **Frontend** (React) → UI untuk upload file
2. **Backend** (Express) → API untuk handle upload
3. **Cloudflare Tunnel** → Expose ke internet
4. **Storage** (D:\uploads) → Simpan file

---

**Struktur ini sudah optimal dan clean!**
