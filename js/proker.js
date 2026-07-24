// proker.js - logic untuk halaman publik Program Kerja (pages/proker.html)

import { db } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const prokerGrid = document.getElementById("proker-grid");
const prokerEmpty = document.getElementById("proker-empty");
const filterButtons = document.querySelectorAll(".proker-filter .filter-btn");

let semuaProker = [];
let filterAktif = "semua";

// Bikin 1 kartu proker (HTML string)
function buatKartuProker(data) {
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

// Render grid sesuai filter aktif
function renderProker() {
  const dataTampil =
    filterAktif === "semua"
      ? semuaProker
      : semuaProker.filter((p) => p.status === filterAktif);

  if (dataTampil.length === 0) {
    prokerGrid.innerHTML = "";
    prokerEmpty.hidden = false;
    return;
  }

  prokerEmpty.hidden = true;
  prokerGrid.innerHTML = dataTampil.map(buatKartuProker).join("");
}

// Ambil data real-time dari Firestore collection "proker", urut terbaru duluan
const prokerQuery = query(collection(db, "proker"), orderBy("dibuatPada", "desc"));

onSnapshot(
  prokerQuery,
  (snapshot) => {
    semuaProker = snapshot.docs.map((docSnap) => docSnap.data());
    renderProker();
  },
  (error) => {
    console.error("Gagal ambil data proker:", error);
    prokerGrid.innerHTML = "";
    prokerEmpty.hidden = false;
    prokerEmpty.querySelector("p").textContent = "Gagal memuat data program kerja. Coba refresh halaman.";
  }
);

// Klik tombol filter
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filterAktif = btn.dataset.filter;
    renderProker();
  });
});
