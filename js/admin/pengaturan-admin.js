// pengaturan-admin.js - kelola Kode Undangan buat pendaftaran member OSIS & MPK

import { auth, db } from "../firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const kodeInput = document.getElementById("kode-undangan-input");
const saveBtn = document.getElementById("kode-undangan-save-btn");
const statusEl = document.getElementById("kode-undangan-status");

const kodeDocRef = doc(db, "settings", "kodeUndangan");

// ===== Ambil kode yang lagi aktif, tampilin di kolom input =====
async function muatKode() {
  try {
    const snap = await getDoc(kodeDocRef);
    if (snap.exists()) {
      kodeInput.value = snap.data().kode || "";
    }
  } catch (error) {
    console.error("Gagal ambil kode undangan:", error);
    statusEl.textContent = "Gagal memuat kode. Coba refresh halaman.";
    statusEl.className = "upload-status upload-status-error";
  }
}

muatKode();

// ===== Kelola Admin =====
const jadikanAdminInput = document.getElementById("jadikan-admin-input");
const jadikanAdminBtn = document.getElementById("jadikan-admin-btn");
const jadikanAdminStatus = document.getElementById("jadikan-admin-status");
const daftarAdminList = document.getElementById("daftar-admin-list");

// Tampilin daftar admin yang aktif sekarang
async function muatDaftarAdmin() {
  try {
    const snap = await getDocs(collection(db, "admins"));

    if (snap.empty) {
      daftarAdminList.innerHTML = `<p class="admin-list-empty">Belum ada data admin.</p>`;
      return;
    }

    daftarAdminList.innerHTML = snap.docs
      .map((d) => {
        const data = d.data();
        const diriSendiri = d.id === auth.currentUser?.uid;
        return `
          <div class="admin-list-item">
            <span>${data.email || d.id}${diriSendiri ? " (kamu)" : ""}</span>
            ${diriSendiri ? "" : `<button type="button" class="btn-text btn-text-danger cabut-admin-btn" data-uid="${d.id}">Cabut</button>`}
          </div>
        `;
      })
      .join("");

    daftarAdminList.querySelectorAll(".cabut-admin-btn").forEach((btn) => {
      btn.addEventListener("click", () => cabutAdmin(btn.dataset.uid));
    });
  } catch (error) {
    console.error("Gagal ambil daftar admin:", error);
    daftarAdminList.innerHTML = `<p class="admin-list-empty">Gagal memuat daftar admin.</p>`;
  }
}

muatDaftarAdmin();

// Jadikan seorang anggota (dicari pakai username) jadi admin
jadikanAdminBtn.addEventListener("click", async () => {
  const username = jadikanAdminInput.value.trim().toLowerCase();

  if (!username) {
    jadikanAdminStatus.textContent = "Isi username dulu.";
    jadikanAdminStatus.className = "upload-status upload-status-error";
    return;
  }

  jadikanAdminBtn.disabled = true;
  jadikanAdminStatus.textContent = "Memproses...";
  jadikanAdminStatus.className = "upload-status";

  try {
    const usernameSnap = await getDoc(doc(db, "usernames", username));

    if (!usernameSnap.exists()) {
      throw new Error("Username gak ketemu. Pastiin anggota itu udah daftar duluan.");
    }

    const { uid, email } = usernameSnap.data();

    await setDoc(doc(db, "admins", uid), {
      email,
      updatedAt: serverTimestamp(),
    });

    jadikanAdminStatus.textContent = `@${username} berhasil dijadikan admin.`;
    jadikanAdminStatus.className = "upload-status upload-status-success";
    jadikanAdminInput.value = "";
    muatDaftarAdmin();
  } catch (error) {
    console.error("Gagal jadikan admin:", error);
    jadikanAdminStatus.textContent = error.message || "Gagal memproses.";
    jadikanAdminStatus.className = "upload-status upload-status-error";
  } finally {
    jadikanAdminBtn.disabled = false;
  }
});

// Cabut status admin (gak bisa cabut diri sendiri, tombolnya udah disembunyiin di render)
async function cabutAdmin(uid) {
  if (!confirm("Yakin mau cabut status admin akun ini?")) return;

  try {
    await deleteDoc(doc(db, "admins", uid));
    muatDaftarAdmin();
  } catch (error) {
    console.error("Gagal cabut admin:", error);
    alert("Gagal cabut status admin. Coba lagi.");
  }
}

// ===== Simpan kode baru =====
saveBtn.addEventListener("click", async () => {
  const kodeBaru = kodeInput.value.trim();

  if (!kodeBaru) {
    statusEl.textContent = "Kode gak boleh kosong.";
    statusEl.className = "upload-status upload-status-error";
    return;
  }

  saveBtn.disabled = true;
  statusEl.textContent = "Menyimpan...";
  statusEl.className = "upload-status";

  try {
    await setDoc(kodeDocRef, { kode: kodeBaru });
    statusEl.textContent = "Kode berhasil disimpan. Kode lama otomatis gak berlaku lagi buat pendaftar baru.";
    statusEl.className = "upload-status upload-status-success";
  } catch (error) {
    console.error("Gagal simpan kode undangan:", error);
    statusEl.textContent = "Gagal menyimpan. Cek Firestore Rules kamu.";
    statusEl.className = "upload-status upload-status-error";
  } finally {
    saveBtn.disabled = false;
  }
});
