# ⚡ Quick Guide: Setup Supabase di Index.html

## 🎯 Tujuan

Mengganti storage offline (localStorage) dengan Supabase cloud database di aplikasi XnRoot.

---

## 📝 Langkah Setup (5 Menit!)

### 1️⃣ Buat Project Supabase

1. Buka https://supabase.com dan login
2. Klik **"New Project"**
3. Isi nama project dan password
4. Tunggu ~2 menit sampai selesai

### 2️⃣ Buat Tabel Database

1. Di Supabase Dashboard, klik **"SQL Editor"**
2. Klik **"New Query"**
3. Copy-paste SQL ini:

```sql
CREATE TABLE player_stats (
  id BIGSERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  total_score INTEGER DEFAULT 0,
  level_1_score INTEGER DEFAULT 0,
  level_2_score INTEGER DEFAULT 0,
  level_3_score INTEGER DEFAULT 0,
  game_played INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  badges TEXT DEFAULT '',
  video_watched INTEGER DEFAULT 0,
  materials_read TEXT DEFAULT '',
  experiments_done INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_streak INTEGER DEFAULT 0,
  inquiry_phases_read TEXT DEFAULT '',
  level_attempts TEXT DEFAULT '',
  cptp_read BOOLEAN DEFAULT false,
  hypotheses_written INTEGER DEFAULT 0,
  last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_player_name ON player_stats(player_name);
CREATE INDEX idx_total_score ON player_stats(total_score DESC);
CREATE INDEX idx_level_1_score ON player_stats(level_1_score DESC);

ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for everyone"
  ON player_stats FOR ALL
  USING (true) WITH CHECK (true);
```

4. Klik **"Run"** (atau Ctrl+Enter)

### 3️⃣ Ambil Credentials

1. Klik icon ⚙️ **Settings** di sidebar
2. Pilih **"API"**
3. Copy 2 hal ini:
   - **Project URL** (contoh: `https://abc123.supabase.co`)
   - **anon public key** (key yang panjang, mulai dari `eyJ...`)

### 4️⃣ Update Index.html

1. Buka file **Index.html**
2. Cari baris **~1503** (atau search `SUPABASE_CONFIG`)
3. Ganti `YOUR_SUPABASE_URL` dan `YOUR_SUPABASE_ANON_KEY`:

```javascript
const SUPABASE_CONFIG = {
  url: "https://abc123.supabase.co", // ← Paste URL Anda di sini
  anonKey: "eyJhbGciOiJIUzI1NiI...", // ← Paste Key Anda di sini
  tableName: "player_stats",
};
```

4. **Save file**

### 5️⃣ Test!

1. Buka **Index.html** di browser
2. Klik menu **⚙️ Developer** (scroll ke bawah)
3. Di section **☁️ Supabase Configuration**, klik tombol **"🔌 Test Connection"**
4. Jika muncul ✅ "Connected to Supabase!" berarti **berhasil!**

---

## ✅ Verifikasi

### Di Browser Console:

```javascript
// Cek info storage
window.hybridStorageManager.getInfo();

// Output yang diharapkan:
// { mode: 'supabase', activeService: 'supabase', configured: true }
```

### Di Supabase Dashboard:

1. Klik **"Table Editor"** di sidebar
2. Pilih tabel **player_stats**
3. Mainkan game dan buat player baru
4. Refresh Table Editor → Data muncul! 🎉

---

## 🔧 Troubleshooting

| Error                  | Solusi                                                  |
| ---------------------- | ------------------------------------------------------- |
| ❌ "Connection failed" | Cek URL dan Key sudah benar, tidak ada spasi            |
| ❌ "Table not found"   | Pastikan sudah run SQL untuk buat tabel                 |
| ⚙️ "Not configured"    | Update `SUPABASE_CONFIG` di Index.html                  |
| ⚠️ "Using fallback"    | Koneksi internet atau Supabase down, pakai offline mode |

---

## 🎓 Mode Storage

Aplikasi sekarang punya 2 mode:

### **Supabase Mode** (Default jika sudah dikonfigurasi)

- ✅ Data tersimpan di cloud
- ✅ Bisa diakses dari perangkat mana saja
- ✅ Tidak hilang walau browser di-clear

### **Auto Mode** (Fallback otomatis)

- ✅ Coba Supabase dulu
- ✅ Jika gagal, pakai localStorage
- ✅ Seamless switching

---

## 📚 Dokumentasi Lengkap

- **Tutorial Detail**: [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
- **API Reference**: [README_SUPABASE.md](README_SUPABASE.md)
- **Test Console**: Buka [test-supabase.html](test-supabase.html)

---

## 💡 Tips

1. **Jangan commit credentials** ke Git/GitHub
2. **Backup data** dengan tombol "📥 Export Data"
3. **Test dulu** di `test-supabase.html` sebelum production
4. **Monitor usage** di Supabase Dashboard → Settings → Usage

---

## 🎉 Selesai!

Aplikasi XnRoot sekarang sudah menggunakan **cloud database Supabase**!

Data player, score, badges, dan achievements sekarang tersimpan di cloud dan bisa diakses dari mana saja! 🚀

---

**Need Help?** Baca [SUPABASE_SETUP.md](SUPABASE_SETUP.md) untuk tutorial yang lebih detail!
