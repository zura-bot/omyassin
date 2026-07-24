// beranda-preview.js - logic khusus beranda (index.html):
// 1. Kartu proker unggulan (ditandai admin lewat toggle "Jadikan Unggulan")
// 2. Carousel foto dokumentasi terbaru (per acara)

import { db } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ============================================================
// 1. PROKER UNGGULAN
// ============================================================
const prokerCardWrapper = document.getElementById("proker-preview-card");
const prokerEmptyState = document.getElementById("proker-preview-empty");

function buatKartuProkerPreview(data) {
  const statusClass = data.status ? data.status.toLowerCase() : "direncanakan";

  return `
    <div class="proker-card">
      <div class="proker-card-head">
        <h4>${data.judul}</h4>
        <span class="badge status-${statusClass}">${data.status || "Direncanakan"}</span>
      </div>
      <p class="proker-deskripsi">${data.deskripsi || ""}</p>
      <div class="proker-meta">
        ${data.divisi ? `<span>${data.divisi}</span>` : ""}
        ${data.tanggal ? `<span>${data.tanggal}</span>` : ""}
      </div>
    </div>
  `;
}

const prokerQuery = query(collection(db, "proker"), orderBy("dibuatPada", "desc"));

onSnapshot(
  prokerQuery,
  (snapshot) => {
    const semuaProker = snapshot.docs.map((docSnap) => docSnap.data());

    // Cari yang ditandai unggulan; kalau gak ada, fallback ke proker terbaru
    const prokerTampil = semuaProker.find((p) => p.unggulan) || semuaProker[0];

    if (!prokerTampil) {
      prokerCardWrapper.innerHTML = "";
      prokerEmptyState.hidden = false;
      return;
    }

    prokerEmptyState.hidden = true;
    prokerCardWrapper.innerHTML = buatKartuProkerPreview(prokerTampil);
  },
  (error) => {
    console.error("Gagal ambil proker unggulan:", error);
    prokerCardWrapper.innerHTML = "";
    prokerEmptyState.hidden = false;
    prokerEmptyState.querySelector("p").textContent = "Gagal memuat proker. Coba refresh halaman.";
  }
);

// ============================================================
// 2. CAROUSEL DOKUMENTASI TERBARU (per acara)
// ============================================================
const carousel = document.getElementById("dokumentasi-carousel");
const carouselImg = document.getElementById("carousel-img");
const carouselAcaraNama = document.getElementById("carousel-acara-nama");
const carouselCounter = document.getElementById("carousel-counter");
const prevBtn = document.getElementById("carousel-prev-btn");
const nextBtn = document.getElementById("carousel-next-btn");
const dokumentasiEmptyState = document.getElementById("dokumentasi-preview-empty");
const dokumentasiPreviewCounter = document.getElementById("dokumentasi-preview-counter");
const carouselThumbs = document.getElementById("carousel-thumbs");

let fotoAcaraTerbaru = [];
let indexAktif = 0;

function renderThumbs() {
  carouselThumbs.innerHTML = fotoAcaraTerbaru
    .map(
      (foto, i) => `
        <button class="carousel-thumb${i === indexAktif ? " active" : ""}" data-index="${i}" aria-label="Lihat foto ke-${i + 1}">
          <img src="${foto.gambar}" alt="" loading="lazy" />
        </button>
      `
    )
    .join("");

  carouselThumbs.querySelectorAll(".carousel-thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      indexAktif = Number(btn.dataset.index);
      tampilkanFotoAktif();
    });
  });
}

function tampilkanFotoAktif() {
  const foto = fotoAcaraTerbaru[indexAktif];
  if (!foto) return;

  carouselImg.src = foto.gambar;
  carouselImg.alt = foto.judul || foto.acara || "Dokumentasi kegiatan";
  carouselAcaraNama.textContent = foto.acara || foto.judul || "Dokumentasi";
  carouselCounter.textContent = `${indexAktif + 1} / ${fotoAcaraTerbaru.length}`;

  // Highlight thumbnail yang lagi aktif
  carouselThumbs.querySelectorAll(".carousel-thumb").forEach((btn, i) => {
    btn.classList.toggle("active", i === indexAktif);
  });
}

prevBtn.addEventListener("click", () => {
  indexAktif = (indexAktif - 1 + fotoAcaraTerbaru.length) % fotoAcaraTerbaru.length;
  tampilkanFotoAktif();
});

nextBtn.addEventListener("click", () => {
  indexAktif = (indexAktif + 1) % fotoAcaraTerbaru.length;
  tampilkanFotoAktif();
});

const dokumentasiQuery = query(collection(db, "dokumentasi"), orderBy("dibuatPada", "desc"));

onSnapshot(
  dokumentasiQuery,
  (snapshot) => {
    const semuaDokumentasi = snapshot.docs.map((docSnap) => docSnap.data());

    // Counter selalu nunjukin TOTAL semua foto, bukan cuma yang lagi ditampilin di carousel
    dokumentasiPreviewCounter.textContent = `${semuaDokumentasi.length} Foto Terunggah`;

    if (semuaDokumentasi.length === 0) {
      carousel.hidden = true;
      dokumentasiEmptyState.hidden = false;
      return;
    }

    // Ambil nama acara dari foto paling baru, lalu kumpulin semua foto seacara itu.
    // Dinormalisasi (trim + lowercase) biar gak sensitif beda spasi/huruf besar-kecil
    // pas admin ngetik ulang nama acara yang sama.
    const acaraTerbaruLabel = (semuaDokumentasi[0].acara || semuaDokumentasi[0].judul || "Dokumentasi Lainnya").trim();
    const acaraTerbaruKey = acaraTerbaruLabel.toLowerCase();
    fotoAcaraTerbaru = semuaDokumentasi.filter((d) => {
      const key = (d.acara || d.judul || "Dokumentasi Lainnya").trim().toLowerCase();
      return key === acaraTerbaruKey;
    });

    indexAktif = 0;
    dokumentasiEmptyState.hidden = true;
    carousel.hidden = false;

    // Tombol navigasi & strip thumbnail gak perlu ditampilkan kalau cuma ada 1 foto
    const adaBanyakFoto = fotoAcaraTerbaru.length > 1;
    prevBtn.hidden = !adaBanyakFoto;
    nextBtn.hidden = !adaBanyakFoto;
    carouselThumbs.hidden = !adaBanyakFoto;

    renderThumbs();
    tampilkanFotoAktif();
  },
  (error) => {
    console.error("Gagal ambil dokumentasi terbaru:", error);
    carousel.hidden = true;
    dokumentasiEmptyState.hidden = false;
    dokumentasiEmptyState.querySelector("p").textContent = "Gagal memuat dokumentasi. Coba refresh halaman.";
    dokumentasiPreviewCounter.textContent = "";
  }
);
