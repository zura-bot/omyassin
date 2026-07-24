// pesan-admin.js - kelola Pesan Anonim di dashboard admin

import { db } from "../firebase-config.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mintaKonfirmasiHapus } from "./dashboard.js";

const pesanList = document.getElementById("pesan-list");
const pesanEmpty = document.getElementById("pesan-list-empty");
const filterChips = document.querySelectorAll("[data-pesan-filter]");
const badgeBelumDibaca = document.getElementById("badge-pesan-belum-dibaca");

let semuaPesan = [];
let filterAktif = "semua";

// Format timestamp Firestore ke format tanggal Indonesia yang gampang dibaca
function formatTanggal(timestamp) {
  if (!timestamp) return "Baru saja";
  const tanggal = timestamp.toDate();
  return tanggal.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Bikin 1 item pesan
function buatItemPesan(pesan) {
  const statusClass = pesan.dibaca ? "" : "pesan-item-unread";
  return `
    <div class="pesan-item ${statusClass}" data-id="${pesan.id}">
      <div class="pesan-item-header">
        <span class="pesan-item-date">${formatTanggal(pesan.createdAt)}</span>
        ${!pesan.dibaca ? '<span class="dot-unread" title="Belum dibaca"></span>' : ""}
      </div>
      <p class="pesan-item-body">${pesan.isi}</p>
      <div class="pesan-item-actions">
        ${!pesan.dibaca ? `<button class="btn-text mark-read-btn" data-id="${pesan.id}">Tandai dibaca</button>` : ""}
        <button class="btn-text btn-text-danger delete-pesan-btn" data-id="${pesan.id}">Hapus</button>
      </div>
    </div>
  `;
}

// Render list sesuai filter
function renderPesanList() {
  const dataTampil =
    filterAktif === "belum" ? semuaPesan.filter((p) => !p.dibaca) : semuaPesan;

  if (dataTampil.length === 0) {
    pesanList.innerHTML = "";
    pesanEmpty.hidden = false;
    return;
  }

  pesanEmpty.hidden = true;
  pesanList.innerHTML = dataTampil.map(buatItemPesan).join("");

  // Pasang event listener ke tombol-tombol yang baru dirender
  pesanList.querySelectorAll(".mark-read-btn").forEach((btn) => {
    btn.addEventListener("click", () => tandaiDibaca(btn.dataset.id));
  });

  pesanList.querySelectorAll(".delete-pesan-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      mintaKonfirmasiHapus(() => hapusPesan(btn.dataset.id));
    });
  });
}

// Update badge jumlah pesan belum dibaca di sidebar
function updateBadge() {
  const jumlahBelumDibaca = semuaPesan.filter((p) => !p.dibaca).length;
  if (jumlahBelumDibaca > 0) {
    badgeBelumDibaca.textContent = jumlahBelumDibaca;
    badgeBelumDibaca.hidden = false;
  } else {
    badgeBelumDibaca.hidden = true;
  }
}

// Tandai 1 pesan sebagai sudah dibaca
async function tandaiDibaca(id) {
  try {
    await updateDoc(doc(db, "pesan", id), { dibaca: true });
  } catch (error) {
    console.error("Gagal update status pesan:", error);
  }
}

// Hapus 1 pesan
async function hapusPesan(id) {
  try {
    await deleteDoc(doc(db, "pesan", id));
  } catch (error) {
    console.error("Gagal hapus pesan:", error);
  }
}

// Ambil data real-time, urut dari yang terbaru
const pesanQuery = query(collection(db, "pesan"), orderBy("createdAt", "desc"));

onSnapshot(pesanQuery, (snapshot) => {
  semuaPesan = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  renderPesanList();
  updateBadge();
});

// Filter chip: Semua / Belum Dibaca
filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    filterChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    filterAktif = chip.dataset.pesanFilter;
    renderPesanList();
  });
});
