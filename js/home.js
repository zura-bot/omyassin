// home.js - logic untuk halaman utama (index.html)

import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const THEME_KEY = "omyassin-theme"; // key buat localStorage
const themeLinkEl = document.getElementById("theme-stylesheet");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

// Path CSS tiap tema (absolut dari root, biar konsisten dipanggil dari halaman manapun)
const THEMES = {
  dark: "/css/theme-dark-blue.css",
  light: "/css/theme-blue-white.css",
};

// Ambil tema tersimpan, default "dark" kalau belum pernah pilih
function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

// Terapkan tema ke halaman
function applyTheme(themeName) {
  themeLinkEl.setAttribute("href", THEMES[themeName]);
  localStorage.setItem(THEME_KEY, themeName);
}

// Toggle antara dark <-> light
function toggleTheme() {
  const current = getSavedTheme();
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
}

// Jalankan saat halaman dibuka
applyTheme(getSavedTheme());
themeToggleBtn.addEventListener("click", toggleTheme);

// ===== Hamburger menu (mobile) =====
const hamburgerBtn = document.getElementById("hamburger-btn");
const mainNav = document.getElementById("main-nav");
const navOverlay = document.getElementById("nav-overlay");

function openMenu() {
  hamburgerBtn.classList.add("open");
  mainNav.classList.add("open");
  navOverlay.classList.add("visible");
  hamburgerBtn.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden"; // cegah scroll background pas menu kebuka
}

function closeMenu() {
  hamburgerBtn.classList.remove("open");
  mainNav.classList.remove("open");
  navOverlay.classList.remove("visible");
  hamburgerBtn.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

function toggleMenu() {
  const isOpen = mainNav.classList.contains("open");
  isOpen ? closeMenu() : openMenu();
}

hamburgerBtn.addEventListener("click", toggleMenu);
navOverlay.addEventListener("click", closeMenu); // klik area gelap = nutup menu

// Tutup menu otomatis kalau salah satu link nav diklik (mobile)
mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

// ===== Struktur Organisasi =====
// Guard: kode ini cuma jalan kalau elemennya ada di halaman (index.html),
// biar gak error pas home.js dipanggil di halaman lain (pesan.html, dll)
const strukturGrid = document.getElementById("struktur-grid");
const strukturEmpty = document.getElementById("struktur-empty");
const anggotaCounter = document.getElementById("anggota-counter");
const filterButtons = document.querySelectorAll(".filter-btn");

if (strukturGrid && strukturEmpty) {
  let semuaAnggota = []; // cache data dari Firestore, dipakai ulang tiap ganti filter
  let filterAktif = "semua";

  // Bikin 1 kartu anggota (HTML string)
  const buatKartuAnggota = (data) => {
    const badgeClass = data.jenis === "OSIS" ? "osis" : "mpk";
    const fotoUrl = data.foto || "https://raw.githubusercontent.com/USERNAME/REPO/main/assets/img/default-avatar.png";

    return `
      <div class="anggota-card">
        <img src="${fotoUrl}" alt="Foto ${data.nama}" loading="lazy" />
        <h4>${data.nama}</h4>
        <p class="jabatan">${data.jabatan}</p>
        <span class="badge ${badgeClass}">${data.jenis}</span>
        <p class="divisi">${data.divisi || ""}</p>
      </div>
    `;
  };

  // Render grid sesuai filter aktif
  const renderStruktur = () => {
    // Counter selalu nunjukin TOTAL anggota, gak ikut filter yang lagi aktif
    anggotaCounter.textContent = `${semuaAnggota.length} Anggota Aktif`;

    const dataTampil =
      filterAktif === "semua"
        ? semuaAnggota
        : semuaAnggota.filter((a) => a.jenis === filterAktif);

    if (dataTampil.length === 0) {
      strukturGrid.innerHTML = "";
      strukturEmpty.hidden = false;
      return;
    }

    strukturEmpty.hidden = true;
    strukturGrid.innerHTML = dataTampil.map(buatKartuAnggota).join("");
  };

  // Ambil data real-time dari Firestore collection "anggota"
  onSnapshot(
    collection(db, "anggota"),
    (snapshot) => {
      semuaAnggota = snapshot.docs.map((doc) => doc.data());
      renderStruktur();
    },
    (error) => {
      console.error("Gagal ambil data anggota:", error);
      strukturGrid.innerHTML = "";
      strukturEmpty.hidden = false;
      strukturEmpty.querySelector("p").textContent =
        "Gagal memuat data anggota. Coba refresh halaman.";
      anggotaCounter.textContent = "";
    }
  );

  // Klik tombol filter
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filterAktif = btn.dataset.filter;
      renderStruktur();
    });
  });
}
