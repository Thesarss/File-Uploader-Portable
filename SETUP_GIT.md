# 🔧 Setup Git untuk Upload ke GitHub

## Langkah 1: Konfigurasi Git Identity

Sebelum bisa commit, Anda perlu setup identity Git:

```bash
# Setup nama Anda
git config --global user.name "Thesarss"

# Setup email Anda (gunakan email GitHub)
git config --global user.email "your-email@example.com"
```

**Ganti:**
- `"Thesarss"` dengan nama GitHub Anda
- `"your-email@example.com"` dengan email GitHub Anda

## Langkah 2: Verifikasi Konfigurasi

```bash
# Cek konfigurasi
git config --global user.name
git config --global user.email
```

## Langkah 3: Commit & Push

Setelah setup identity, jalankan:

```bash
# Commit
git commit -m "Initial commit: File Uploader Portable v1.0"

# Push ke GitHub
git branch -M main
git push -u origin main
```

## Langkah 4: Autentikasi GitHub

Saat diminta login, gunakan salah satu:

### Opsi A: Personal Access Token (Recommended)

1. Buka: https://github.com/settings/tokens
2. Klik "Generate new token (classic)"
3. Pilih scope: `repo` (full control of private repositories)
4. Generate token
5. Copy token
6. Saat git push minta password, paste token tersebut

### Opsi B: GitHub CLI

```bash
# Install GitHub CLI
winget install GitHub.cli

# Login
gh auth login

# Pilih:
# - GitHub.com
# - HTTPS
# - Login with a web browser
```

## Langkah 5: Verifikasi Upload

Setelah push berhasil:
1. Buka: https://github.com/Thesarss/File-Uploader-Portable
2. Refresh halaman
3. File Anda sudah muncul!

## 🎯 Command Lengkap (Copy-Paste)

```bash
# 1. Setup identity (ganti dengan info Anda)
git config --global user.name "Thesarss"
git config --global user.email "your-email@example.com"

# 2. Commit
git commit -m "Initial commit: File Uploader Portable v1.0"

# 3. Push
git branch -M main
git push -u origin main
```

## 🔐 Menyimpan Credentials

Agar tidak perlu login terus:

```bash
# Windows
git config --global credential.helper wincred

# Atau gunakan GitHub CLI
gh auth login
```

## 📝 Update Setelah Perubahan

Setelah ada perubahan code:

```bash
# 1. Cek status
git status

# 2. Add perubahan
git add .

# 3. Commit
git commit -m "Update: deskripsi perubahan"

# 4. Push
git push origin main
```

## 🐛 Troubleshooting

### Error: "Permission denied"
- Pastikan sudah login dengan Personal Access Token
- Atau gunakan GitHub CLI: `gh auth login`

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/Thesarss/File-Uploader-Portable.git
```

### Error: "failed to push"
```bash
git pull origin main --rebase
git push origin main
```

---

**Setelah setup ini, Anda bisa upload ke GitHub! 🚀**
