# 📤 Cara Upload ke GitHub

## Langkah-langkah Upload

### 1. Inisialisasi Git (Jika Belum)

```bash
# Di root directory project
git init
```

### 2. Tambahkan Remote Repository

```bash
git remote add origin https://github.com/Thesarss/File-Uploader-Portable.git
```

### 3. Cek Status File

```bash
git status
```

### 4. Tambahkan Semua File

```bash
git add .
```

### 5. Commit Changes

```bash
git commit -m "Initial commit: File Uploader Portable v1.0"
```

### 6. Push ke GitHub

```bash
# Push ke branch main
git push -u origin main
```

Jika error "branch main doesn't exist", gunakan:
```bash
git branch -M main
git push -u origin main
```

## 🔐 Jika Diminta Login

### Opsi 1: Personal Access Token (Recommended)

1. Buka GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Pilih scope: `repo` (full control)
4. Copy token
5. Saat diminta password, paste token tersebut

### Opsi 2: GitHub CLI

```bash
# Install GitHub CLI
winget install GitHub.cli

# Login
gh auth login

# Push
git push -u origin main
```

## 📝 Commit Message Guidelines

Gunakan format yang jelas:

```bash
# Initial commit
git commit -m "Initial commit: File Uploader Portable v1.0"

# Feature
git commit -m "feat: Add chunked upload for large files"

# Bug fix
git commit -m "fix: Resolve CORS error on production"

# Documentation
git commit -m "docs: Update README with installation guide"

# Refactor
git commit -m "refactor: Clean up unused components"
```

## 🌿 Branching Strategy

### Main Branch
```bash
# Untuk production-ready code
git checkout main
```

### Development Branch
```bash
# Untuk development
git checkout -b develop
```

### Feature Branch
```bash
# Untuk fitur baru
git checkout -b feature/nama-fitur
```

## 📦 File yang Tidak Perlu Diupload

Sudah diatur di `.gitignore`:
- `node_modules/`
- `dist/`
- `.env`
- `uploads/`
- `temp-chunks/`
- `*.log`

## 🔄 Update Repository

Setelah ada perubahan:

```bash
# Cek perubahan
git status

# Tambahkan file yang berubah
git add .

# Commit
git commit -m "Update: Deskripsi perubahan"

# Push
git push origin main
```

## 🏷️ Membuat Release

### Via GitHub Web

1. Buka repository di GitHub
2. Klik "Releases" → "Create a new release"
3. Tag version: `v1.0.0`
4. Release title: `File Uploader Portable v1.0.0`
5. Description: Tulis changelog
6. Publish release

### Via Git Command

```bash
# Buat tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag
git push origin v1.0.0
```

## 📊 Menambahkan GitHub Actions (Optional)

Buat file `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: |
        cd backend && npm install
        cd ../frontend && npm install
    - name: Run tests
      run: |
        cd backend && npm test
```

## 🎨 Menambahkan Badges

Tambahkan di README.md:

```markdown
[![Build Status](https://github.com/Thesarss/File-Uploader-Portable/workflows/CI/badge.svg)](https://github.com/Thesarss/File-Uploader-Portable/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
```

## 🐛 Troubleshooting

### Error: "remote origin already exists"

```bash
git remote remove origin
git remote add origin https://github.com/Thesarss/File-Uploader-Portable.git
```

### Error: "failed to push some refs"

```bash
# Pull dulu
git pull origin main --rebase

# Lalu push
git push origin main
```

### Error: "Permission denied"

Pastikan:
1. Anda sudah login ke GitHub
2. Punya akses ke repository
3. Gunakan Personal Access Token

## 📚 Resources

- [GitHub Docs](https://docs.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Selamat! Repository Anda sudah di GitHub! 🎉**
