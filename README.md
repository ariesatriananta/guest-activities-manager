# Guest Daily Activities Manager

Managed with dino-apps

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](#)
[![Built with dino-apps](https://img.shields.io/badge/Built%20with-dino--apps-black?style=for-the-badge)](#)

## Overview

Repo ini adalah sumber kode untuk aplikasi Guest Daily Activities Manager dan kini dikelola sebagai bagian dari dino-apps.

## Deployment

Setel URL produksi kamu di bagian ini jika sudah tersedia.

## Pengembangan

- Install dependensi: `pnpm install`
- Jalankan dev server: `pnpm dev`
- Build untuk produksi: `pnpm build`

## Database (MySQL)

- Aplikasi menggunakan MySQL via `DATABASE_URL`.
- Template env lokal tersedia di `.env.mysql.local.example`.
- Schema target tersedia di `sql/mysql-schema.sql`.
- Runbook migrasi dari dump Neon tersedia di `docs/mysql-migration-runbook.md`.
