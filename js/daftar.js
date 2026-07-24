// daftar.js - logic pendaftaran akun member (pages/daftar.html)
//
// Alur pendaftaran (biar aman tanpa perlu Cloud Functions):
// 1. Bikin akun Firebase Auth (email + password)
// 2. Coba tulis dokumen "membersPrivate/{uid}" berisi kode yang diketik user.
//    Firestore Security Rules bakal nge-cross-check kode ini ke settings/kodeUndangan
//    di server, TANPA client pernah bisa baca kode aslinya. Kalau kode salah,
//    langkah ini bakal ditolak (permission-denied).
// 3. Kalau langkah 2 berhasil (kode benar), baru bikin profil publik "members/{uid}"
//    dan daftar username di "usernames/{username}" (dipakai buat login pakai username).
// 4. Kalau ada langkah yang gagal, akun Auth yang kebuat di langkah 1 dihapus lagi
//    biar gak ninggalin akun "hantu" tanpa profil.

import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Kasih batas waktu buat request ke Firebase, biar tombol gak macet
// "Memproses..." selamanya kalau ada koneksi/rules yang nyangkut.
function denganTimeout(promise, detik = 25) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject({ code: "timeout", message: "Waktu habis" }), detik * 1000)
    ),
  ]);
}

const form = document.getElementById("daftar-form");
const namaInput = document.getElementById("daftar-nama");
const usernameInput = document.getElementById("daftar-username");
const emailInput = document.getElementById("daftar-email");
const passwordInput = document.getElementById("daftar-password");
const kodeInput = document.getElementById("daftar-kode");
const submitBtn = document.getElementById("daftar-submit-btn");
const alertBox = document.getElementById("daftar-alert");
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
    "auth/email-already-in-use": "Email ini udah kedaftar. Coba masuk atau pakai email lain.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/weak-password": "Password terlalu lemah, minimal 6 karakter.",
    "timeout": "Koneksi ke server lambat/gak nyambung. Cek internet kamu atau coba lagi.",
  };
  return pesanError[errorCode] || null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.hidden = true;

  const nama = namaInput.value.trim();
  const username = usernameInput.value.trim().toLowerCase();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const kode = kodeInput.value.trim();

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    tampilkanError("Username cuma boleh huruf kecil, angka, underscore, 3-20 karakter.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Mengecek username...";

  let userBaru = null;

  try {
    // Cek username udah dipakai apa belum SEBELUM bikin akun Auth
    const usernameSnap = await denganTimeout(getDoc(doc(db, "usernames", username)));
    if (usernameSnap.exists()) {
      throw { customMessage: "Username udah dipakai orang lain, coba yang lain." };
    }

    // 1. Bikin akun Auth
    submitBtn.textContent = "Membuat akun...";
    const credential = await denganTimeout(createUserWithEmailAndPassword(auth, email, password));
    userBaru = credential.user;

    // 2. Verifikasi kode undangan (divalidasi di Firestore Rules, client gak pernah
    // baca kode aslinya). Kalau kode salah, baris ini bakal throw permission-denied.
    submitBtn.textContent = "Memverifikasi kode...";
    await denganTimeout(
      setDoc(doc(db, "membersPrivate", userBaru.uid), {
        email,
        kodeDipakai: kode,
      })
    );

    // 3. Kode benar -> bikin profil publik + daftar username SEKALIGUS (paralel),
    // soalnya dua-duanya gak saling nunggu satu sama lain, cuma butuh uid yang
    // udah ada dari langkah 1. Ini motong waktu tunggu dibanding jalan satu-satu.
    submitBtn.textContent = "Menyiapkan profil...";
    await denganTimeout(
      Promise.all([
        setDoc(doc(db, "members", userBaru.uid), {
          nama,
          username,
          role: "", // diisi admin belakangan lewat dashboard
          bio: "",
          foto: "",
          createdAt: serverTimestamp(),
        }),
        setDoc(doc(db, "usernames", username), {
          uid: userBaru.uid,
          email,
        }),
      ])
    );

    // Berhasil semua, arahkan ke halaman profil
    window.location.href = "/pages/profil.html";
  } catch (error) {
    console.error("Gagal daftar:", error);

    const isTimeout = error.code === "timeout";

    // Timeout itu AMBIGU — belum tentu beneran gagal, bisa aja proses di
    // background tetep lanjut & berhasil. Makanya JANGAN buru-buru hapus akun
    // kalau alasannya cuma "kelamaan", biar gak nge-delete akun yang sebenarnya
    // udah berhasil dibuat. Cuma hapus akun kalau errornya jelas & pasti gagal
    // (misal kode undangan salah / permission-denied).
    if (userBaru && !isTimeout) {
      try {
        await userBaru.delete();
      } catch (cleanupError) {
        console.error("Gagal bersihin akun yang gagal daftar:", cleanupError);
      }
    }

    if (error.customMessage) {
      tampilkanError(error.customMessage);
    } else if (error.code === "permission-denied") {
      tampilkanError("Kode undangan salah. Coba tanya ulang ke pengurus OSIS/MPK.");
    } else if (isTimeout) {
      tampilkanError(
        "Prosesnya kelamaan. Coba cek halaman Profil dulu — mungkin akun kamu sebenarnya udah berhasil dibuat. Kalau belum ada, coba daftar ulang."
      );
    } else {
      tampilkanError(terjemahkanError(error.code) || "Pendaftaran gagal. Coba lagi.");
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "Daftar";
  }
});
