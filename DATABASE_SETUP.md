# Setup database SIPRAMA

Database menggunakan MySQL dan Prisma ORM. Model mencakup akun/RBAC, dosen,
ruangan, penawaran mata kuliah dan rombel, periode serta item jadwal,
persetujuan, konflik, audit log, dan parameter algoritma GA.

## Persiapan pertama

1. Pastikan MySQL aktif dan database `siprama_db` sudah dibuat, misalnya:

   ```sql
   CREATE DATABASE siprama_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Salin `.env.example` menjadi `.env` di root proyek. Sesuaikan `DATABASE_URL`
   dengan kredensial MySQL lokal. Jika ingin menentukan password sendiri, isi
   `SUPERADMIN_PASSWORD` dengan minimal 12 karakter; jangan commit `.env`.
3. Pasang dependency dari root proyek:

   ```powershell
   npm install
   ```

4. Buat dan terapkan migrasi pertama, lalu seed akun superadmin:

   ```powershell
   npm run db:setup
   ```

   Seed memakai email dari `.env`, atau `superadmin@siprama.local` jika kosong.
   Jika password kosong atau kurang dari 12 karakter, seed membuat password
   acak dan menampilkannya satu kali di output terminal. Simpan password itu
   dengan aman. Password di database disimpan sebagai bcrypt hash. Seed aman
   dijalankan kembali: akun yang sudah ada tidak diubah.

## Perubahan skema berikutnya

Jalankan `npm run db:migrate` untuk membuat/menerapkan migrasi pengembangan;
seed idempoten ikut dijalankan setelah migrasi. Untuk menerapkan migrasi yang
sudah dibuat di server, gunakan `npm run db:deploy`.

`npm run db:seed` menjalankan seed secara terpisah dan
`npm run db:studio` membuka Prisma Studio.

Frontend saat ini masih memakai data mock; skema dan akun ini menyiapkan lapisan
database, tetapi belum menghubungkan komponen frontend ke API backend.
