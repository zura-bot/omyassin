// auth.js - logic untuk halaman login admin (pages/admin/login.html)

import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const submitBtn = document.getElementById("login-submit-btn");
const alertBox = document.getElementById("login-alert");
const togglePasswordBtn = document.getElementById("toggle-password");

const ICON_MATA_TERBUKA = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const ICON_MATA_TERTUTUP = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

// ===== Toggle show/hide password =====
togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePasswordBtn.innerHTML = isPassword ? ICON_MATA_TERTUTUP : ICON_MATA_TERBUKA;
  togglePasswordBtn.setAttribute("aria-label", isPassword ? "Sembunyikan password" : "Tampilkan password");
});

// ===== Tampilkan pesan error =====
function tampilkanError(pesan) {
  alertBox.textContent = pesan;
  alertBox.className = "pesan-alert pesan-alert-error";
  alertBox.hidden = false;
}

// ===== Terjemahkan kode error Firebase ke bahasa manusia =====
function terjemahkanError(errorCode) {
  const pesanError = {
    "auth/invalid-email": "Format email tidak valid.",
    "auth/user-not-found": "Akun dengan email ini tidak ditemukan.",
    "auth/wrong-password": "Password salah.",
    "auth/invalid-credential": "Email atau password salah.",
    "auth/too-many-requests": "Terlalu banyak percobaan gagal. Coba lagi nanti.",
  };
  return pesanError[errorCode] || "Terjadi kesalahan. Coba lagi.";
}

// ===== Submit form login =====
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.hidden = true;

  submitBtn.disabled = true;
  submitBtn.textContent = "Memproses...";

  try {
    const credential = await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);

    // Catat/perbarui akun ini sebagai admin. Aman dilakukan di sini karena
    // halaman login ini KHUSUS admin (bukan halaman login member).
    await setDoc(doc(db, "admins", credential.user.uid), {
      email: credential.user.email,
      updatedAt: serverTimestamp(),
    });

    // Redirect ke dashboard kalau berhasil
    window.location.href = "/pages/admin/dashboard.html";
  } catch (error) {
    console.error("Login gagal:", error);
    tampilkanError(terjemahkanError(error.code));
    submitBtn.disabled = false;
    submitBtn.textContent = "Masuk";
  }
});
