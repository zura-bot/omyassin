// login-member.js - logic login member (pages/login-member.html)
// Bisa pakai USERNAME atau EMAIL. Firebase Auth aslinya cuma nerima email,
// jadi kalau yang diketik bukan email (gak ada "@"), kita cari dulu email-nya
// lewat collection "usernames/{username}" sebelum login.

import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Kasih batas waktu buat request ke Firebase, biar tombol gak macet
// "Memproses..." selamanya kalau ada koneksi/rules yang nyangkut.
function denganTimeout(promise, detik = 15) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject({ code: "timeout", message: "Waktu habis" }), detik * 1000)
    ),
  ]);
}

const form = document.getElementById("login-member-form");
const identifierInput = document.getElementById("login-member-id");
const passwordInput = document.getElementById("login-member-password");
const submitBtn = document.getElementById("login-member-submit-btn");
const alertBox = document.getElementById("login-member-alert");
const togglePasswordBtn = document.getElementById("toggle-password");

const ICON_MATA_TERBUKA = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const ICON_MATA_TERTUTUP = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePasswordBtn.innerHTML = isPassword ? ICON_MATA_TERTUTUP : ICON_MATA_TERBUKA;
  togglePasswordBtn.setAttribute("aria-label", isPassword ? "Sembunyikan password" : "Tampilkan password");
});

function tampilkanError(pesan) {
  alertBox.textContent = pesan;
  alertBox.className = "pesan-alert pesan-alert-error";
  alertBox.hidden = false;
}

function terjemahkanError(errorCode) {
  const pesanError = {
    "auth/invalid-email": "Format email tidak valid.",
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Password salah.",
    "auth/invalid-credential": "Username/email atau password salah.",
    "auth/too-many-requests": "Terlalu banyak percobaan gagal. Coba lagi nanti.",
    "timeout": "Koneksi ke server lambat/gak nyambung. Cek internet kamu atau coba lagi.",
  };
  return pesanError[errorCode] || "Terjadi kesalahan. Coba lagi.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.hidden = true;

  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Memproses...";

  try {
    let email = identifier;

    // Kalau yang diketik bukan email, anggap itu username -> cari email-nya dulu
    if (!identifier.includes("@")) {
      const usernameSnap = await denganTimeout(getDoc(doc(db, "usernames", identifier.toLowerCase())));

      if (!usernameSnap.exists()) {
        tampilkanError("Username tidak ditemukan.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Masuk";
        return;
      }

      email = usernameSnap.data().email;
    }

    await denganTimeout(signInWithEmailAndPassword(auth, email, password));
    window.location.href = "/pages/profil.html";
  } catch (error) {
    console.error("Login member gagal:", error);
    tampilkanError(terjemahkanError(error.code));
    submitBtn.disabled = false;
    submitBtn.textContent = "Masuk";
  }
});
