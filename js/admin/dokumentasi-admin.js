// dokumentasi-admin.js - kelola Dokumentasi (galeri foto) di dashboard admin

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
import { uploadKeGithub } from "./github-upload.js";

const grid = document.getElementById("dokumentasi-admin-grid");
const emptyState = document.getElementById("dokumentasi-admin-empty");
const addBtn = document.getElementById("dokumentasi-add-btn");

// Modal & form
const formModal = document.getElementById("dokumentasi-form-modal");
const formTitle = document.getElementById("dokumentasi-form-title");
const form = document.getElementById("dokumentasi-form");
const cancelBtn = document.getElementById("dokumentasi-form-cancel-btn");
const submitBtn = document.getElementById("dokumentasi-form-submit-btn");
const formAlert = document.getElementById("dokumentasi-form-alert");

const idInput = document.getElementById("dokumentasi-id");
const judulInput = document.getElementById("dokumentasi-judul");
const acaraInput = document.getElementById("dokumentasi-acara");
const gambarInput = document.getElementById("dokumentasi-gambar");
const gambarFileInput = document.getElementById("dokumentasi-gambar-file");
const gambarUploadBtn = document.getElementById("dokumentasi-gambar-upload-btn");
const gambarUploadStatus = document.getElementById("dokumentasi-gambar-upload-status");
const tanggalInput = document.getElementById("dokumentasi-tanggal");
const acaraDatalist = document.getElementById("dokumentasi-acara-list");

let semuaDokumentasi = [];

// ===== Render grid kartu dokumentasi =====
function buatKartuAdmin(data) {
  return `
    <div class="admin-card admin-card-media" data-id="${data.id}">
      <img src="${data.gambar}" alt="${data.judul || "Dokumentasi"}" loading="lazy" />
      <span class="badge">${data.acara || "(tanpa acara)"}</span>
      <h4>${data.judul || "(Tanpa judul)"}</h4>
      <p class="divisi">${data.tanggal || ""}</p>
      <div class="admin-card-actions">
        <button class="btn-text edit-dokumentasi-btn" data-id="${data.id}">Edit</button>
        <button class="btn-text btn-text-danger delete-dokumentasi-btn" data-id="${data.id}">Hapus</button>
      </div>
    </div>
  `;
}

function renderGrid() {
  // Isi datalist dengan nama acara unik yang udah pernah dipakai,
  // biar admin bisa autocomplete daripada ngetik ulang (ngurangin typo/grouping kacau)
  const acaraUnik = [...new Set(semuaDokumentasi.map((d) => d.acara).filter(Boolean))];
  acaraDatalist.innerHTML = acaraUnik.map((a) => `<option value="${a}"></option>`).join("");

  if (semuaDokumentasi.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = semuaDokumentasi.map(buatKartuAdmin).join("");

  grid.querySelectorAll(".edit-dokumentasi-btn").forEach((btn) => {
    btn.addEventListener("click", () => bukaFormEdit(btn.dataset.id));
  });

  grid.querySelectorAll(".delete-dokumentasi-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      mintaKonfirmasiHapus(() => hapusDokumentasi(btn.dataset.id));
    });
  });
}

// Ambil data real-time, urut terbaru duluan
const dokumentasiQuery = query(collection(db, "dokumentasi"), orderBy("dibuatPada", "desc"));

onSnapshot(
  dokumentasiQuery,
  (snapshot) => {
    semuaDokumentasi = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderGrid();
  },
  (error) => {
    console.error("Gagal ambil data dokumentasi:", error);
    grid.innerHTML = "";
    emptyState.hidden = false;
    emptyState.querySelector("p").textContent = "Gagal memuat dokumentasi. Coba refresh halaman.";
  }
);

// ===== Buka/tutup modal form =====
function resetForm() {
  form.reset();
  idInput.value = "";
  formAlert.hidden = true;
  gambarFileInput.value = "";
  gambarUploadStatus.textContent = "";
  gambarUploadStatus.className = "upload-status";
}

function bukaFormTambah() {
  resetForm();
  formTitle.textContent = "Tambah Dokumentasi";
  formModal.hidden = false;
  judulInput.focus();
}

function bukaFormEdit(id) {
  const data = semuaDokumentasi.find((d) => d.id === id);
  if (!data) return;

  resetForm();
  formTitle.textContent = "Edit Dokumentasi";
  idInput.value = id;
  judulInput.value = data.judul || "";
  acaraInput.value = data.acara || "";
  gambarInput.value = data.gambar || "";
  tanggalInput.value = data.tanggal || "";
  formModal.hidden = false;
  judulInput.focus();
}

function tutupForm() {
  formModal.hidden = true;
}

addBtn.addEventListener("click", bukaFormTambah);
cancelBtn.addEventListener("click", tutupForm);

// ===== Upload gambar/video langsung ke GitHub =====
gambarUploadBtn.addEventListener("click", async () => {
  const file = gambarFileInput.files[0];
  const acara = acaraInput.value.trim();

  if (!acara) {
    gambarUploadStatus.textContent = "Isi Nama Acara dulu sebelum upload (dipakai buat nama file).";
    gambarUploadStatus.className = "upload-status upload-status-error";
    return;
  }

  if (!file) {
    gambarUploadStatus.textContent = "Pilih file dulu sebelum upload.";
    gambarUploadStatus.className = "upload-status upload-status-error";
    return;
  }

  gambarUploadBtn.disabled = true;
  gambarUploadStatus.textContent = "Sedang mengupload...";
  gambarUploadStatus.className = "upload-status";

  try {
    // Nama file diambil dari acara + tanggal biar rapi & gampang dikenali di GitHub
    const tanggal = tanggalInput.value.trim();
    const namaFileDasar = [acara, tanggal].filter(Boolean).join(" - ");

    const url = await uploadKeGithub(file, "dokumentasi", namaFileDasar);
    gambarInput.value = url;
    gambarUploadStatus.textContent = "Berhasil, link gambar otomatis terisi.";
    gambarUploadStatus.className = "upload-status upload-status-success";
  } catch (error) {
    console.error("Gagal upload gambar dokumentasi:", error);
    gambarUploadStatus.textContent = error.message || "Upload gagal.";
    gambarUploadStatus.className = "upload-status upload-status-error";
  } finally {
    gambarUploadBtn.disabled = false;
  }
});

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
    acara: acaraInput.value.trim(),
    gambar: gambarInput.value.trim(),
    tanggal: tanggalInput.value.trim(),
  };

  if (!payload.acara) {
    tampilkanErrorForm("Nama acara wajib diisi.");
    return;
  }

  if (!payload.gambar) {
    tampilkanErrorForm("URL gambar wajib diisi.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  try {
    const id = idInput.value;
    if (id) {
      await updateDoc(doc(db, "dokumentasi", id), payload);
    } else {
      await addDoc(collection(db, "dokumentasi"), {
        ...payload,
        dibuatPada: serverTimestamp(),
      });
    }
    tutupForm();
  } catch (error) {
    console.error("Gagal menyimpan dokumentasi:", error);
    tampilkanErrorForm("Gagal menyimpan data. Coba lagi beberapa saat.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Simpan";
  }
});

// ===== Hapus dokumentasi =====
async function hapusDokumentasi(id) {
  try {
    await deleteDoc(doc(db, "dokumentasi", id));
  } catch (error) {
    console.error("Gagal hapus dokumentasi:", error);
  }
}
