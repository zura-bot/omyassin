// akun-admin.js - kelola akun anggota yang udah daftar sendiri (collection "members")
// Admin bisa kasih title/jabatan, centang biru (verified), dan hapus akun.

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

const grid = document.getElementById("akun-admin-grid");
const emptyState = document.getElementById("akun-admin-empty");

// Modal edit
const editModal = document.getElementById("akun-edit-modal");
const editInfo = document.getElementById("akun-edit-info");
const editForm = document.getElementById("akun-edit-form");
const editUidInput = document.getElementById("akun-edit-uid");
const editRoleInput = document.getElementById("akun-edit-role");
const editVerifiedInput = document.getElementById("akun-edit-verified");
const editAlert = document.getElementById("akun-edit-alert");
const editCancelBtn = document.getElementById("akun-edit-cancel-btn");
const editSaveBtn = document.getElementById("akun-edit-save-btn");

let semuaAkun = [];

// ===== Render kartu akun =====
function buatKartuAkun(data) {
  return `
    <div class="admin-card" data-uid="${data.id}">
      ${data.verified ? `<span class="badge-unggulan">✓ Verified</span>` : ""}
      <h4>${data.nama || "(tanpa nama)"}</h4>
      <p class="jabatan">@${data.username || ""}</p>
      <p class="divisi">${data.role || "(belum ada title)"}</p>
      <div class="admin-card-actions">
        <button class="btn-text edit-akun-btn" data-uid="${data.id}">Edit</button>
        <button class="btn-text btn-text-danger delete-akun-btn" data-uid="${data.id}">Hapus</button>
      </div>
    </div>
  `;
}

function renderGrid() {
  if (semuaAkun.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = semuaAkun.map(buatKartuAkun).join("");

  grid.querySelectorAll(".edit-akun-btn").forEach((btn) => {
    btn.addEventListener("click", () => bukaFormEdit(btn.dataset.uid));
  });

  grid.querySelectorAll(".delete-akun-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      mintaKonfirmasiHapus(() => hapusAkun(btn.dataset.uid));
    });
  });
}

// Ambil data real-time, urut berdasarkan nama
const akunQuery = query(collection(db, "members"), orderBy("nama"));

onSnapshot(
  akunQuery,
  (snapshot) => {
    semuaAkun = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderGrid();
  },
  (error) => {
    console.error("Gagal ambil data akun anggota:", error);
    grid.innerHTML = "";
    emptyState.hidden = false;
    emptyState.querySelector("p").textContent = "Gagal memuat data akun. Coba refresh halaman.";
  }
);

// ===== Buka/tutup modal edit =====
function bukaFormEdit(uid) {
  const data = semuaAkun.find((a) => a.id === uid);
  if (!data) return;

  editUidInput.value = uid;
  editInfo.textContent = `${data.nama || "(tanpa nama)"} — @${data.username || ""}`;
  editRoleInput.value = data.role || "";
  editVerifiedInput.checked = Boolean(data.verified);
  editAlert.hidden = true;
  editModal.hidden = false;
}

function tutupForm() {
  editModal.hidden = true;
}

editCancelBtn.addEventListener("click", tutupForm);
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) tutupForm();
});

// ===== Simpan title + verified =====
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  editAlert.hidden = true;

  const uid = editUidInput.value;
  const role = editRoleInput.value.trim();
  const verified = editVerifiedInput.checked;

  editSaveBtn.disabled = true;
  editSaveBtn.textContent = "Menyimpan...";

  try {
    await updateDoc(doc(db, "members", uid), { role, verified });
    tutupForm();
  } catch (error) {
    console.error("Gagal simpan akun:", error);
    editAlert.textContent = "Gagal menyimpan. Cek Firestore Rules kamu.";
    editAlert.className = "pesan-alert pesan-alert-error";
    editAlert.hidden = false;
  } finally {
    editSaveBtn.disabled = false;
    editSaveBtn.textContent = "Simpan";
  }
});

// ===== Hapus akun =====
// CATATAN: ini cuma hapus data profil (Firestore), BUKAN akun Firebase Auth-nya.
// Tanpa Cloud Functions, client-side gak bisa hapus akun Auth orang lain.
// Tapi karena profil.js otomatis logout kalau data member gak ketemu, praktiknya
// orang itu tetep gak bisa akses fitur member lagi.
async function hapusAkun(uid) {
  const data = semuaAkun.find((a) => a.id === uid);

  try {
    if (data?.username) {
      await deleteDoc(doc(db, "usernames", data.username));
    }
    await deleteDoc(doc(db, "membersPrivate", uid));
    await deleteDoc(doc(db, "members", uid));
  } catch (error) {
    console.error("Gagal hapus akun:", error);
    alert("Gagal hapus akun. Coba lagi.");
  }
}
