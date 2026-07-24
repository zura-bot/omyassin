// anggota-admin.js - kelola Anggota (OSIS/MPK) di dashboard admin

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
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mintaKonfirmasiHapus } from "./dashboard.js";
import { uploadKeGithub } from "./github-upload.js";

const grid = document.getElementById("anggota-admin-grid");
const emptyState = document.getElementById("anggota-admin-empty");
const addBtn = document.getElementById("anggota-add-btn");

// Modal & form
const formModal = document.getElementById("anggota-form-modal");
const formTitle = document.getElementById("anggota-form-title");
const form = document.getElementById("anggota-form");
const cancelBtn = document.getElementById("anggota-form-cancel-btn");
const submitBtn = document.getElementById("anggota-form-submit-btn");
const formAlert = document.getElementById("anggota-form-alert");

const idInput = document.getElementById("anggota-id");
const namaInput = document.getElementById("anggota-nama");
const jabatanInput = document.getElementById("anggota-jabatan");
const jenisInput = document.getElementById("anggota-jenis");
const divisiInput = document.getElementById("anggota-divisi");
const fotoInput = document.getElementById("anggota-foto");
const fotoFileInput = document.getElementById("anggota-foto-file");
const fotoUploadBtn = document.getElementById("anggota-foto-upload-btn");
const fotoUploadStatus = document.getElementById("anggota-foto-upload-status");

let semuaAnggota = [];

// ===== Render grid kartu anggota =====
function buatKartuAdmin(data) {
  const badgeClass = data.jenis === "OSIS" ? "osis" : "mpk";
  const fotoUrl = data.foto || "https://raw.githubusercontent.com/USERNAME/REPO/main/assets/img/default-avatar.png";

  return `
    <div class="admin-card" data-id="${data.id}">
      <img src="${fotoUrl}" alt="Foto ${data.nama}" loading="lazy" />
      <h4>${data.nama}</h4>
      <p class="jabatan">${data.jabatan}</p>
      <span class="badge ${badgeClass}">${data.jenis}</span>
      <p class="divisi">${data.divisi || ""}</p>
      <div class="admin-card-actions">
        <button class="btn-text edit-anggota-btn" data-id="${data.id}">Edit</button>
        <button class="btn-text btn-text-danger delete-anggota-btn" data-id="${data.id}">Hapus</button>
      </div>
    </div>
  `;
}

function renderGrid() {
  if (semuaAnggota.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = semuaAnggota.map(buatKartuAdmin).join("");

  grid.querySelectorAll(".edit-anggota-btn").forEach((btn) => {
    btn.addEventListener("click", () => bukaFormEdit(btn.dataset.id));
  });

  grid.querySelectorAll(".delete-anggota-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      mintaKonfirmasiHapus(() => hapusAnggota(btn.dataset.id));
    });
  });
}

// Ambil data real-time, urut berdasarkan nama
const anggotaQuery = query(collection(db, "anggota"), orderBy("nama"));

onSnapshot(
  anggotaQuery,
  (snapshot) => {
    semuaAnggota = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderGrid();
  },
  (error) => {
    console.error("Gagal ambil data anggota:", error);
    grid.innerHTML = "";
    emptyState.hidden = false;
    emptyState.querySelector("p").textContent = "Gagal memuat data anggota. Coba refresh halaman.";
  }
);

// ===== Buka/tutup modal form =====
function resetForm() {
  form.reset();
  idInput.value = "";
  formAlert.hidden = true;
  fotoFileInput.value = "";
  fotoUploadStatus.textContent = "";
  fotoUploadStatus.className = "upload-status";
}

function bukaFormTambah() {
  resetForm();
  formTitle.textContent = "Tambah Anggota";
  formModal.hidden = false;
  namaInput.focus();
}

function bukaFormEdit(id) {
  const data = semuaAnggota.find((a) => a.id === id);
  if (!data) return;

  resetForm();
  formTitle.textContent = "Edit Anggota";
  idInput.value = id;
  namaInput.value = data.nama || "";
  jabatanInput.value = data.jabatan || "";
  jenisInput.value = data.jenis || "OSIS";
  divisiInput.value = data.divisi || "";
  fotoInput.value = data.foto || "";
  formModal.hidden = false;
  namaInput.focus();
}

function tutupForm() {
  formModal.hidden = true;
}

addBtn.addEventListener("click", bukaFormTambah);
cancelBtn.addEventListener("click", tutupForm);

// ===== Upload foto langsung ke GitHub =====
fotoUploadBtn.addEventListener("click", async () => {
  const file = fotoFileInput.files[0];

  if (!file) {
    fotoUploadStatus.textContent = "Pilih file dulu sebelum upload.";
    fotoUploadStatus.className = "upload-status upload-status-error";
    return;
  }

  fotoUploadBtn.disabled = true;
  fotoUploadStatus.textContent = "Sedang mengupload...";
  fotoUploadStatus.className = "upload-status";

  try {
    const url = await uploadKeGithub(file, "anggota");
    fotoInput.value = url;
    fotoUploadStatus.textContent = "Berhasil, link foto otomatis terisi.";
    fotoUploadStatus.className = "upload-status upload-status-success";
  } catch (error) {
    console.error("Gagal upload foto anggota:", error);
    fotoUploadStatus.textContent = error.message || "Upload gagal.";
    fotoUploadStatus.className = "upload-status upload-status-error";
  } finally {
    fotoUploadBtn.disabled = false;
  }
});

// Tutup modal kalau klik area gelap di luar kartu form
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
    nama: namaInput.value.trim(),
    jabatan: jabatanInput.value.trim(),
    jenis: jenisInput.value,
    divisi: divisiInput.value.trim(),
    foto: fotoInput.value.trim(),
  };

  if (!payload.nama || !payload.jabatan) {
    tampilkanErrorForm("Nama dan jabatan wajib diisi.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  try {
    const id = idInput.value;
    if (id) {
      await updateDoc(doc(db, "anggota", id), payload);
    } else {
      await addDoc(collection(db, "anggota"), payload);
    }
    tutupForm();
  } catch (error) {
    console.error("Gagal menyimpan anggota:", error);
    tampilkanErrorForm("Gagal menyimpan data. Coba lagi beberapa saat.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Simpan";
  }
});

// ===== Hapus anggota =====
async function hapusAnggota(id) {
  try {
    await deleteDoc(doc(db, "anggota", id));
  } catch (error) {
    console.error("Gagal hapus anggota:", error);
  }
}
