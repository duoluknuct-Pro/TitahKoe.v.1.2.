/**
 * config.js - Konfigurasi Aplikasi TitahKOE Frontend
 */

const CONFIG = {
  // Ganti nilai ini dengan Web App URL hasil deployment Google Apps Script Anda:
  // Contoh: "https://script.google.com/macros/s/AKfycbxBy5k3ma5si3L_vxuE0GD-KXoXHwnMaZle9IDUS_hzPKIRIUN73Mk6k6MEUz_PbsGZ/exec"
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbxBy5k3ma5si3L_vxuE0GD-KXoXHwnMaZle9IDUS_hzPKIRIUN73Mk6k6MEUz_PbsGZ/exec",

  APP_NAME: "TitahKOE",
  TAGLINE: "Arsip & Silsilah Keluarga Besar",
  DEFAULT_BRANCH_ID: "BR-001",
  
  // Timeout request dalam milidetik (15 detik)
  REQUEST_TIMEOUT: 15000,

  // Mode Fallback: Jika GAS_API_URL masih kosong, gunakan data demonstrasi lokal
  DEMO_MODE_IF_NO_URL: true
};
