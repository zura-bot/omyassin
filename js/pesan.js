// pesan.js - logic untuk halaman Pesan Anonim

import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("pesan-form");
const textarea = document.getElementById("pesan-isi");
const charCounter = document.getElementById("char-counter");
const submitBtn = document.getElementById("pesan-submit-btn");
const alertBox = document.getElementById("pesan-alert");

const MAX_CHAR = 500;
const RATE_LIMIT_KEY = "omyassin-last-pesan";
const RATE_LIMIT_MINUTES = 3; // jarak minimal antar kirim pesan

// ===== Counter karakter =====
textarea.addEventListener("input", () => {
  const jumlah = textarea.value.length;
  charCounter.textContent = `${jumlah} / ${MAX_CHAR}`;
  charCounter.classList.toggle("char-counter-warning", jumlah >= MAX_CHAR - 30);
});

// ===== Tampilkan alert (sukses/error/rate-limit) =====
function tampilkanAlert(pesan, tipe) {
  alertBox.textContent = pesan;
  alertBox.className = `pesan-alert pesan-alert-${tipe}`;
  alertBox.hidden = false;

  // Auto-hide setelah beberapa detik, kecuali tipe rate-limit (biar keliatan lama)
  if (tipe !== "rate-limit") {
    setTimeout(() => {
      alertBox.hidden = true;
    }, 4000);
  }
}

// ===== Cek apakah user masih kena rate limit =====
function cekRateLimit() {
  const lastSubmit = localStorage.getItem(RATE_LIMIT_KEY);
  if (!lastSubmit) return { boleh: true };

  const selisihMenit = (Date.now() - Number(lastSubmit)) / 1000 / 60;
  if (selisihMenit < RATE_LIMIT_MINUTES) {
    const sisaMenit = Math.ceil(RATE_LIMIT_MINUTES - selisihMenit);
    return { boleh: false, sisaMenit };
  }
  return { boleh: true };
}

// ===== Submit form =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const isiPesan = textarea.value.trim();

  if (isiPesan.length === 0) {
    tampilkanAlert("Pesan tidak boleh kosong.", "error");
    return;
  }

  const rateCheck = cekRateLimit();
  if (!rateCheck.boleh) {
    tampilkanAlert(
      `Kamu baru saja mengirim pesan. Coba lagi dalam ${rateCheck.sisaMenit} menit ya.`,
      "rate-limit"
    );
    return;
  }

  // Nonaktifkan tombol sementara biar gak double-submit
  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim...";

  try {
    await addDoc(collection(db, "pesan"), {
      isi: isiPesan,
      dibaca: false,
      createdAt: serverTimestamp(),
    });

    localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());

    form.reset();
    charCounter.textContent = `0 / ${MAX_CHAR}`;
    tampilkanAlert("Pesan berhasil dikirim. Terima kasih atas masukanmu!", "success");
  } catch (error) {
    console.error("Gagal kirim pesan:", error);
    tampilkanAlert("Gagal mengirim pesan. Coba lagi beberapa saat.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
      Kirim Pesan
    `;
  }
});
