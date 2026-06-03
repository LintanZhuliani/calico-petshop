# Dokumentasi Sequence Diagram - Calico's Pet Care
File ini berisi seluruh kode Sequence Diagram lengkap (Total 11 Diagram). Salin kode di dalam blok `mermaid` satu per satu ke https://mermaid.live/ untuk diubah menjadi gambar.

## 1. Sequence Diagram: Login (Admin & Kasir)
```mermaid
sequenceDiagram
    autonumber
    actor Pengguna
    participant UI as Halaman Login (Frontend)
    participant API as Sistem Auth (Backend)
    participant DB as Database (PostgreSQL)

    Pengguna->>UI: Input Email & Password
    Pengguna->>UI: Klik Tombol Login
    UI->>API: POST /api/login (Kirim Data Kredensial)
    API->>DB: Query Cek Email & Password
    DB-->>API: Kembalikan Data User & Hak Akses
    
    alt Jika Kredensial Salah
        API-->>UI: Response Error (401 Unauthorized)
        UI-->>Pengguna: Tampilkan Pesan "Email/Password Salah"
    else Jika Kredensial Benar
        API->>API: Generate Token Autentikasi
        API-->>UI: Response Sukses + Kirim Token
        UI->>UI: Simpan Token di Local Storage Browser
        UI-->>Pengguna: Arahkan ke Halaman Dashboard
    end
```

## 2. Sequence Diagram: Transaksi Kasir (Sistem POS)
```mermaid
sequenceDiagram
    autonumber
    actor Kasir
    participant UI as Halaman Scan POS (Frontend)
    participant API as Transaction API (Backend)
    participant DB as Database (PostgreSQL)

    Kasir->>UI: Memindai (Scan) Barcode Produk
    UI->>API: Request Data Produk Berdasarkan Barcode
    API->>DB: Query Cek Ketersediaan Stok & Harga
    DB-->>API: Kembalikan Data Produk
    
    alt Jika Stok Kosong / Barcode Tidak Valid
        API-->>UI: Response Error (404 Not Found)
        UI-->>Kasir: Tampilkan Alert "Stok Habis / Tidak Ditemukan"
    else Jika Stok Tersedia
        API-->>UI: Response Sukses (200 OK)
        UI->>UI: Kalkulasi Total & Tambahkan ke Keranjang
        UI-->>Kasir: Tampilkan Item di Keranjang Belanja
    end
    
    Kasir->>UI: Klik Checkout & Input Uang Pembayaran
    UI->>API: POST /api/transactions (Kirim Data Keranjang)
    
    rect rgb(235, 245, 255)
        Note right of API: Memulai Proses Database Transaksi
        API->>DB: Insert Data Transaksi Penjualan Baru
        API->>DB: Update (Kurangi) Stok Produk di Cabang
        DB-->>API: Konfirmasi Data Sukses Tersimpan
    end
    
    API-->>UI: Response Transaksi Sukses & Kirim Data Struk
    UI-->>Kasir: Tampilkan Struk Digital di Layar
```

## 3. Sequence Diagram: Registrasi Akun Kasir (Oleh Admin)
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Halaman Tambah Kasir
    participant API as Auth API (Backend)
    participant DB as Database

    Admin->>UI: Input Data Kasir & Password Baru
    Admin->>UI: Klik Tombol Daftar
    UI->>API: POST /api/users/register
    API->>DB: Query Cek Apakah Email Sudah Terdaftar?
    
    alt Jika Email Sudah Ada
        DB-->>API: Data Ditemukan
        API-->>UI: Response Error (400 Bad Request)
        UI-->>Admin: Tampilkan Pesan "Email Sudah Digunakan"
    else Jika Email Unik (Belum Ada)
        API->>API: Enkripsi (Hash) Password Kasir
        API->>DB: Insert Data Kasir Baru ke Tabel Users
        DB-->>API: Konfirmasi Sukses Tersimpan
        API-->>UI: Response Sukses (201 Created)
        UI-->>Admin: Tampilkan Notifikasi "Pendaftaran Berhasil"
    end
```

## 4. Sequence Diagram: Kelola Produk (Khusus Admin)
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Halaman Kelola Produk
    participant API as Product API (Backend)
    participant DB as Database

    Note over Admin,DB: --- SKENARIO TAMBAH PRODUK ---
    Admin->>UI: Input Detail Produk (Nama, Harga, Kadaluarsa)
    Admin->>UI: Klik Tombol Simpan
    UI->>API: POST /api/products
    API->>DB: Insert Data Produk ke Tabel
    DB-->>API: Konfirmasi Tersimpan
    API-->>UI: Response Sukses (201 Created)
    UI-->>Admin: Tampilkan Notifikasi "Produk Ditambahkan"

    Note over Admin,DB: --- SKENARIO HAPUS PRODUK ---
    Admin->>UI: Klik Ikon Hapus pada Tabel Produk
    UI->>UI: Tampilkan Pop-up Konfirmasi
    Admin->>UI: Konfirmasi Hapus
    UI->>API: DELETE /api/products/:id
    API->>DB: Hapus Record di Database
    DB-->>API: Terhapus
    API-->>UI: Response Sukses (200 OK)
    UI-->>Admin: Tampilkan Notifikasi "Produk Berhasil Dihapus"
```

## 5. Sequence Diagram: Transfer Barang Keluar (Admin)
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Halaman Transfer Keluar
    participant API as Transfer API (Backend)
    participant DB as Database

    Admin->>UI: Pilih Cabang Tujuan, Pilih Produk & Input Jumlah (QTY)
    Admin->>UI: Klik Tombol Kirim Barang
    UI->>API: POST /api/transfers (Kirim Data Pengiriman)
    API->>DB: Query Cek Ketersediaan Stok di Pusat
    
    alt Jika Stok Gudang Pusat Kurang
        DB-->>API: Stok Aktual < QTY yang Diminta
        API-->>UI: Response Error
        UI-->>Admin: Tampilkan Alert "Stok Gudang Tidak Mencukupi"
    else Jika Stok Gudang Pusat Mencukupi
        rect rgb(235, 245, 255)
            API->>DB: Insert Data Transfer Baru (Status: Pending)
            API->>DB: Update (Kurangi) Stok Barang di Pusat
            DB-->>API: Transaksi Database Selesai
        end
        API-->>UI: Response Sukses
        UI-->>Admin: Tampilkan Alert "Barang Berhasil Dikirim ke Cabang"
    end
```

## 6. Sequence Diagram: Katalog Produk (Khusus Kasir)
```mermaid
sequenceDiagram
    autonumber
    actor Kasir
    participant UI as Halaman Produk
    participant API as Product API
    participant DB as Database

    Kasir->>UI: Buka Halaman Produk
    UI->>API: GET /api/products (Request Data Cabang)
    API->>DB: Query Produk Berdasarkan Cabang ID
    DB-->>API: Kembalikan List Produk
    API-->>UI: Response Sukses
    UI-->>Kasir: Tampilkan Daftar Produk & Harga

    Kasir->>UI: Ketik "Whiskas" di Kolom Pencarian
    UI->>UI: Filter List Produk (Sisi Frontend)
    UI-->>Kasir: Tampilkan Hasil Pencarian
```

## 7. Sequence Diagram: Konfirmasi Transfer Masuk (Kasir)
```mermaid
sequenceDiagram
    autonumber
    actor Kasir
    participant UI as Halaman Transfer Masuk
    participant API as Transfer API
    participant DB as Database

    Kasir->>UI: Buka Menu Transfer
    UI->>API: GET /api/transfers?status=pending
    API->>DB: Query Transfer Masuk ke Cabang Ini
    DB-->>API: Data Transfer Ditemukan
    API-->>UI: Response Sukses
    UI-->>Kasir: Tampilkan Daftar Barang Datang

    Kasir->>UI: Cek Fisik Barang
    Kasir->>UI: Klik Tombol Konfirmasi Terima
    UI->>API: PUT /api/transfers/:id/confirm
    
    rect rgb(235, 245, 255)
        API->>DB: Update Status Transfer (Selesai)
        API->>DB: Update (Tambah) Stok Etalase Cabang
        DB-->>API: Transaksi Sukses
    end
    
    API-->>UI: Response 200 OK
    UI-->>Kasir: Notifikasi "Barang Berhasil Diterima & Masuk Stok"
```

## 8. Sequence Diagram: Dashboard Utama (Admin - Laporan & FEFO)
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Halaman Dashboard
    participant API as Dashboard API
    participant DB as Database

    Admin->>UI: Buka Halaman Dashboard
    UI->>API: GET /api/dashboard/stats
    
    par Ambil Data Penjualan
        API->>DB: Query Total Penjualan & Pendapatan Global
        DB-->>API: Data Penjualan
    and Cek Kadaluarsa (FEFO)
        API->>DB: Query Produk Expired < 30 Hari
        DB-->>API: List Produk Kritis
    end
    
    API-->>UI: Kirim Data Statistik & Peringatan FEFO
    UI-->>Admin: Tampilkan Grafik Penjualan & Alert Kadaluarsa
```

## 9. Sequence Diagram: Dashboard Kasir
```mermaid
sequenceDiagram
    autonumber
    actor Kasir
    participant UI as Halaman Dashboard
    participant API as Dashboard API
    participant DB as Database

    Kasir->>UI: Buka Halaman Dashboard
    UI->>API: GET /api/dashboard/cashier-stats
    API->>DB: Query Total Transaksi Hari Ini (Berdasarkan ID Kasir)
    DB-->>API: Total Penjualan & Shift
    API-->>UI: Response Sukses
    UI-->>Kasir: Tampilkan Ringkasan Performa Penjualan Harian
```

## 10. Sequence Diagram: Laporan Penjualan (Admin Unduh File)
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Halaman Laporan
    participant API as Report API
    participant DB as Database

    Admin->>UI: Filter Bulan & Cabang
    UI->>API: GET /api/reports?month=x&branch=y
    API->>DB: Query Data Transaksi Lengkap
    DB-->>API: Raw Data Transaksi
    API-->>UI: Response Sukses
    UI-->>Admin: Tampilkan Tabel Rekap Kasir

    Admin->>UI: Klik Tombol "Unduh Excel / PDF"
    UI->>API: GET /api/reports/download
    API->>API: Generate File (Excel/PDF) di Server
    API-->>UI: Kembalikan Stream File / Blob URL
    UI->>UI: Trigger Download Browser
    UI-->>Admin: File Tersimpan di Komputer
```

## 11. Sequence Diagram: Manajemen Profil & Logout
```mermaid
sequenceDiagram
    autonumber
    actor Pengguna
    participant UI as Halaman Profil
    participant API as Auth API
    participant DB as Database

    Pengguna->>UI: Edit Biodata & Klik Simpan
    UI->>API: PUT /api/users/profile (Kirim Data Baru)
    API->>DB: Update Tabel User
    DB-->>API: Sukses
    API-->>UI: Response 200 OK
    UI-->>Pengguna: Notifikasi "Profil Diperbarui"

    Pengguna->>UI: Klik Tombol Logout
    UI->>API: POST /api/logout
    API->>DB: (Opsional) Hapus Session/Token di DB
    DB-->>API: Terhapus
    API-->>UI: Response Sukses
    UI->>UI: Hapus Token dari Local Storage Browser
    UI-->>Pengguna: Arahkan ke Halaman Login Utama
```
