// proker-admin.js - kelola Program Kerja di dashboard admin

import { db } from "../firebase-config.js";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mintaKonfirmasiHapus } from "./dashboard.js";

const grid = document.getElementById("proker-admin-grid");
const emptyState = document.getElementById("proker-admin-empty");
const addBtn = document.getElementById("proker-add-btn");

// Modal & form
const formModal = document.getElementById("proker-form-modal");
const formTitle = document.getElementById("proker-form-title");
const form = document.getElementById("proker-form");
const cancelBtn = document.getElementById("proker-form-cancel-btn");
const submitBtn = document.getElementById("proker-form-submit-btn");
const formAlert = document.getElementById("proker-form-alert");

const idInput = document.getElementById("proker-id");
const judulInput = document.getElementById("proker-judul");
const deskripsiInput = document.getElementById("proker-deskripsi");
const statusInput = document.getElementById("proker-status");
const divisiInput = document.getElementById("proker-divisi");
const tanggalInput = document.getElementById("proker-tanggal");

let semuaProker = [];

// ===== Render grid kartu proker =====
function buatKartuAdmin(data) {
  const statusClass = data.status ? data.status.toLowerCase() : "direncanakan";

  return `
    <div class="admin-card" data-id="${data.id}">
      <h4>${data.judul}</h4>
      <span class="badge status-${statusClass}">${data.status || "Direncanakan"}</span>
      <p class="jabatan">${data.deskripsi || ""}</p>
      <p class="divisi">${[data.divisi, data.tanggal].filter(Boolean).join(" • ")}</p>
      <div class="admin-card-actions">
        <button class="btn-text edit-proker-btn" data-id="${data.id}">Edit</button>
        <button class="btn-text btn-text-danger delete-proker-btn" data-id="${data.id}">Hapus</button>
      </div>
    </div>
  `;
}

function renderGrid() {
  if (semuaProker.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = semuaProker.map(buatKartuAdmin).join("");

  grid.querySelectorAll(".edit-proker-btn").forEach((btn) => {
    btn.addEventListener("click", () => bukaFormEdit(btn.dataset.id));
  });

  grid.querySelectorAll(".delete-proker-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      mintaKonfirmasiHapus(() => hapusProker(btn.dataset.id));
    });
  });
}

// Ambil data real-time, urut terbaru duluan
const prokerQuery = query(collection(db, "proker"), orderBy("dibuatPada", "desc"));

onSnapshot(
  prokerQuery,
  (snapshot) => {
    semuaProker = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderGrid();
  },
  (error) => {
    console.error("Gagal ambil data proker:", error);
    grid.innerHTML = "";
    emptyState.hidden = false;
    emptyState.querySelector("p").textContent = "Gagal memuat data proker. Coba refresh halaman.";
  }
);

// ===== Buka/tutup modal form =====
function resetForm() {
  form.reset();
  idInput.value = "";
  formAlert.hidden = true;
}

function bukaFormTambah() {
  resetForm();
  formTitle.textContent = "Tambah Proker";
  formModal.hidden = false;
  judulInput.focus();
}

function bukaFormEdit(id) {
  const data = semuaProker.find((p) => p.id === id);
  if (!data) return;

  resetForm();
  formTitle.textContent = "Edit Proker";
  idInput.value = id;
  judulInput.value = data.judul || "";
  deskripsiInput.value = data.deskripsi || "";
  statusInput.value = data.status || "Direncanakan";
  divisiInput.value = data.divisi || "";
  tanggalInput.value = data.tanggal || "";
  formModal.hidden = false;
  judulInput.focus();
}

function tutupForm() {
  formModal.hidden = true;
}

addBtn.addEventListener("click", bukaFormTambah);
cancelBtn.addEventListener("click", tutupForm);

formModal.addEventListener("click", (e) => {
  if (e.target === formModal) tutupForm();
});

// ===== Tampilkan error di form =====
function tampilkanErrorForm(pesan) {
  formAlert.textContent = pesan;
  formAlert.className = "pesan-alert pesan-alert-error";
  formAlert.hidden = false;
}

// ===== Submit form (tambah atau edit, tergantung ada id atau tidak) =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formAlert.hidden = true;

  const payload = {
    judul: judulInput.value.trim(),
    deskripsi: deskripsiInput.value.trim(),
    status: statusInput.value,
    divisi: divisiInput.value.trim(),
    tanggal: tanggalInput.value.trim(),
  };

  if (!payload.judul) {
    tampilkanErrorForm("Judul proker wajib diisi.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  try {
    const id = idInput.value;
    if (id) {
      await updateDoc(doc(db, "proker", id), payload);
    } else {
      await addDoc(collection(db, "proker"), {
        ...payload,
        dibuatPada: serverTimestamp(),
      });
    }
    tutupForm();
  } catch (error) {
    console.error("Gagal menyimpan proker:", error);
    tampilkanErrorForm("Gagal menyimpan data. Coba lagi beberapa saat.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Simpan";
  }
});

// ===== Hapus proker =====
async function hapusProker(id) {
  try {
    await deleteDoc(doc(db, "proker", id));
  } catch (error) {
    console.error("Gagal hapus proker:", error);
  }
}
