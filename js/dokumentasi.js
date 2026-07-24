// dokumentasi.js - logic untuk halaman publik Dokumentasi (pages/dokumentasi.html)

import { db } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const grid = document.getElementById("dokumentasi-grid");
const emptyState = document.getElementById("dokumentasi-empty");
const dokumentasiCounter = document.getElementById("dokumentasi-counter");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxCloseBtn = document.getElementById("lightbox-close-btn");

let semuaDokumentasi = [];

// Kelompokin array dokumentasi (udah urut terbaru) berdasarkan nama acara.
// Fallback ke judul kalau data lama belum punya field "acara", biar gak error.
// Dinormalisasi (trim + lowercase) buat KUNCI pengelompokan biar gak sensitif
// beda spasi/huruf besar-kecil, tapi LABEL yang ditampilin tetep pakai teks aslinya.
function kelompokkanPerAcara(daftar) {
  const grup = new Map();

  daftar.forEach((data, index) => {
    const label = (data.acara || data.judul || "Dokumentasi Lainnya").trim();
    const key = label.toLowerCase();

    if (!grup.has(key)) {
      grup.set(key, { label, items: [] });
    }
    grup.get(key).items.push({ ...data, index });
  });

  return grup;
}

// Bikin 1 kartu dokumentasi (HTML string)
function buatKartuDokumentasi(data) {
  return `
    <button class="dokumentasi-card" data-index="${data.index}" aria-label="Lihat foto ${data.judul || ""}">
      <img src="${data.gambar}" alt="${data.judul || "Dokumentasi kegiatan"}" loading="lazy" />
      ${data.judul ? `<span class="dokumentasi-caption">${data.judul}</span>` : ""}
    </button>
  `;
}

// Bikin 1 grup acara (judul acara + sub-grid foto)
function buatGrupAcara(namaAcara, daftarFoto) {
  return `
    <div class="dokumentasi-grup">
      <h4 class="dokumentasi-grup-judul">${namaAcara}</h4>
      <div class="dokumentasi-grid">
        ${daftarFoto.map(buatKartuDokumentasi).join("")}
      </div>
    </div>
  `;
}

function renderGrid() {
  dokumentasiCounter.textContent = `${semuaDokumentasi.length} Foto Terunggah`;

  if (semuaDokumentasi.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  const grup = kelompokkanPerAcara(semuaDokumentasi);
  grid.innerHTML = Array.from(grup.values())
    .map(({ label, items }) => buatGrupAcara(label, items))
    .join("");

  grid.querySelectorAll(".dokumentasi-card").forEach((card) => {
    card.addEventListener("click", () => bukaLightbox(Number(card.dataset.index)));
  });
}

// ===== Lightbox =====
function bukaLightbox(index) {
  const data = semuaDokumentasi[index];
  if (!data) return;

  lightboxImg.src = data.gambar;
  lightboxImg.alt = data.judul || "Dokumentasi kegiatan";
  lightboxCaption.textContent = [data.judul, data.tanggal].filter(Boolean).join(" • ");
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function tutupLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = "";
  document.body.style.overflow = "";
}

lightboxCloseBtn.addEventListener("click", tutupLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) tutupLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) tutupLightbox();
});

// Ambil data real-time dari Firestore collection "dokumentasi", urut terbaru duluan
const dokumentasiQuery = query(collection(db, "dokumentasi"), orderBy("dibuatPada", "desc"));

onSnapshot(
  dokumentasiQuery,
  (snapshot) => {
    semuaDokumentasi = snapshot.docs.map((docSnap) => docSnap.data());
    renderGrid();
  },
  (error) => {
    console.error("Gagal ambil data dokumentasi:", error);
    grid.innerHTML = "";
    emptyState.hidden = false;
    emptyState.querySelector("p").textContent = "Gagal memuat dokumentasi. Coba refresh halaman.";
    dokumentasiCounter.textContent = "";
  }
);
