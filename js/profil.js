// profil.js - logic halaman Profil (pages/profil.html)
// Nampilin data akun anggota yang lagi login (ala Instagram: foto, nama, bio,
// riwayat postingan), plus fitur edit profil (nama, bio, foto).

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getGithubToken, setGithubToken, uploadKeGithub } from "./admin/github-upload.js";

const loadingEl = document.getElementById("profil-loading");
const guestSection = document.getElementById("profil-guest");
const notfoundSection = document.getElementById("profil-notfound");
const isiSection = document.getElementById("profil-isi");
const cardActionsEl = document.querySelector(".profil-card-actions");

const avatarSlot = document.getElementById("profil-avatar-slot");
const namaEl = document.getElementById("profil-nama");
const verifiedBadge = document.getElementById("profil-verified-badge");
const usernameEl = document.getElementById("profil-username");
const roleBadge = document.getElementById("profil-role-badge");
const bioEl = document.getElementById("profil-bio");

const editBtn = document.getElementById("profil-edit-btn");
const logoutBtn = document.getElementById("profil-logout-btn");

const editForm = document.getElementById("profil-edit-form");
const editNamaInput = document.getElementById("profil-edit-nama");
const editBioInput = document.getElementById("profil-edit-bio");
const editFotoInput = document.getElementById("profil-edit-foto");
const editTokenInput = document.getElementById("profil-edit-token");
const editFotoFileInput = document.getElementById("profil-edit-foto-file");
const editFotoUploadBtn = document.getElementById("profil-edit-foto-upload-btn");
const editFotoUploadStatus = document.getElementById("profil-edit-foto-upload-status");
const editAlert = document.getElementById("profil-edit-alert");
const editCancelBtn = document.getElementById("profil-edit-cancel-btn");

// SVG avatar donat gigit (default kalau anggota belum upload foto sendiri)
const AVATAR_DONUT_SVG = `
  <svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="42" fill="#d2a679"/>
    <path d="M12 42 C20 20, 80 20, 88 42 C90 50, 85 55, 78 50 C70 44, 60 48, 52 44 C44 40, 34 46, 26 50 C18 54, 10 50, 12 42 Z" fill="#f472b6"/>
    <rect x="30" y="27" width="6" height="2.5" rx="1.2" fill="#fbbf24" transform="rotate(20 33 28)"/>
    <rect x="46" y="23" width="6" height="2.5" rx="1.2" fill="#34d399" transform="rotate(-15 49 24)"/>
    <rect x="60" y="28" width="6" height="2.5" rx="1.2" fill="#60a5fa" transform="rotate(30 63 29)"/>
    <rect x="38" y="34" width="6" height="2.5" rx="1.2" fill="#ffffff" transform="rotate(-25 41 35)"/>
    <circle cx="50" cy="52" r="14" class="avatar-donut-hole"/>
    <circle cx="88" cy="40" r="16" class="avatar-donut-hole"/>
  </svg>
`;

let dataAkunSekarang = null;

// ===== Render avatar: foto asli kalau ada, kalau enggak pakai avatar donat =====
function renderAvatar(foto) {
  if (foto) {
    avatarSlot.innerHTML = `<img src="${foto}" alt="Foto profil" />`;
  } else {
    avatarSlot.innerHTML = AVATAR_DONUT_SVG;
  }
}

// ===== Render tampilan profil dari data Firestore =====
function renderProfil(data, { readOnly = false } = {}) {
  dataAkunSekarang = data;

  renderAvatar(data.foto);
  namaEl.textContent = data.nama || "(Belum ada nama)";
  usernameEl.textContent = `@${data.username || ""}`;
  bioEl.textContent = data.bio || "Belum ada bio.";

  // Centang biru sekarang murni dari field "verified" yang admin atur manual
  // lewat dashboard (tab Akun Anggota) — gak lagi otomatis ngikutin status admin.
  verifiedBadge.hidden = !data.verified;

  if (data.role) {
    roleBadge.textContent = data.role;
    roleBadge.hidden = false;
  } else {
    roleBadge.hidden = true;
  }

  // Tombol Edit/Keluar cuma masuk akal di profil MILIK SENDIRI.
  // Kalau lagi liat profil orang lain, sembunyiin semua itu.
  cardActionsEl.hidden = readOnly;
}

// ===== Cek: ini mode "lihat profil sendiri" atau "lihat profil orang lain"? =====
// Kalau URL-nya /pages/profil.html?u=USERNAME, berarti lagi ngunjungin
// profil orang lain (misal dari klik nama penulis di halaman Berita).
// Mode ini gak butuh login sama sekali (public), tapi read-only.
const paramUrl = new URLSearchParams(window.location.search);
const usernameTarget = paramUrl.get("u");

if (usernameTarget) {
  tampilkanProfilOrangLain(usernameTarget);
} else {
  jalankanModeSendiri();
}

// ===== Mode: lihat profil ORANG LAIN (public, read-only) =====
async function tampilkanProfilOrangLain(username) {
  try {
    const usernameSnap = await getDoc(doc(db, "usernames", username.toLowerCase()));

    if (!usernameSnap.exists()) {
      tampilkanTidakDitemukan();
      return;
    }

    const { uid } = usernameSnap.data();

    // Real-time juga, biar kalau pemilik profil update data-nya, ini ikut update
    onSnapshot(
      doc(db, "members", uid),
      (snap) => {
        loadingEl.hidden = true;

        if (!snap.exists()) {
          tampilkanTidakDitemukan();
          return;
        }

        guestSection.hidden = true;
        notfoundSection.hidden = true;
        isiSection.hidden = false;
        renderProfil(snap.data(), { readOnly: true });
      },
      (error) => {
        console.error("Gagal ambil profil orang lain:", error);
        tampilkanTidakDitemukan();
      }
    );
  } catch (error) {
    console.error("Gagal cari username:", error);
    tampilkanTidakDitemukan();
  }
}

function tampilkanTidakDitemukan() {
  loadingEl.hidden = true;
  guestSection.hidden = true;
  isiSection.hidden = true;
  notfoundSection.hidden = false;
}

// ===== Mode: lihat profil SENDIRI (butuh login) =====
function jalankanModeSendiri() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      loadingEl.hidden = true;
      guestSection.hidden = false;
      isiSection.hidden = true;
      return;
    }

    // Pantau profil real-time, biar kalau admin ubah role/verified kita dari dashboard,
    // langsung update tanpa perlu refresh
    onSnapshot(
      doc(db, "members", user.uid),
      (snap) => {
        loadingEl.hidden = true;

        if (!snap.exists()) {
          // Kasus aneh: akun login tapi profil Firestore-nya gak ada.
          // Daripada nampilin halaman kosong, keluarin aja biar user daftar ulang.
          console.error("Profil anggota tidak ditemukan buat uid ini.");
          signOut(auth);
          guestSection.hidden = false;
          isiSection.hidden = true;
          return;
        }

        guestSection.hidden = true;
        isiSection.hidden = false;
        renderProfil(snap.data(), { readOnly: false });
      },
      (error) => {
        console.error("Gagal ambil data profil:", error);
        loadingEl.hidden = true;
        guestSection.hidden = false;
        isiSection.hidden = true;
      }
    );
  });
}

// ===== Logout =====
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/pages/admin/login-member.html";
});

// ===== Buka/tutup form edit (toggle) =====
editBtn.addEventListener("click", () => {
  // Lagi kebuka -> tutup aja
  if (!editForm.hidden) {
    editForm.hidden = true;
    editBtn.textContent = "Edit Profil";
    return;
  }

  // Lagi tertutup -> buka & isi field dari data sekarang
  if (!dataAkunSekarang) return;

  editNamaInput.value = dataAkunSekarang.nama || "";
  editBioInput.value = dataAkunSekarang.bio || "";
  editFotoInput.value = dataAkunSekarang.foto || "";
  editTokenInput.value = getGithubToken();
  editAlert.hidden = true;
  editFotoUploadStatus.textContent = "";
  editForm.hidden = false;
  editBtn.textContent = "Tutup";
  editForm.scrollIntoView({ behavior: "smooth", block: "center" });
});

editCancelBtn.addEventListener("click", () => {
  editForm.hidden = true;
  editBtn.textContent = "Edit Profil";
});

// Token disimpen bareng sama yang dipakai admin (sessionStorage), biar konsisten
editTokenInput.addEventListener("change", () => {
  setGithubToken(editTokenInput.value.trim());
});

// ===== Upload foto profil sendiri ke GitHub =====
editFotoUploadBtn.addEventListener("click", async () => {
  const file = editFotoFileInput.files[0];

  if (!file) {
    editFotoUploadStatus.textContent = "Pilih file dulu sebelum upload.";
    editFotoUploadStatus.className = "upload-status upload-status-error";
    return;
  }

  editFotoUploadBtn.disabled = true;
  editFotoUploadStatus.textContent = "Sedang mengupload...";
  editFotoUploadStatus.className = "upload-status";

  try {
    const namaFileDasar = dataAkunSekarang?.username || "profil";
    const url = await uploadKeGithub(file, "profil", namaFileDasar);
    editFotoInput.value = url;
    editFotoUploadStatus.textContent = "Berhasil, link foto otomatis terisi.";
    editFotoUploadStatus.className = "upload-status upload-status-success";
  } catch (error) {
    console.error("Gagal upload foto profil:", error);
    editFotoUploadStatus.textContent = error.message || "Upload gagal.";
    editFotoUploadStatus.className = "upload-status upload-status-error";
  } finally {
    editFotoUploadBtn.disabled = false;
  }
});

// ===== Simpan perubahan profil =====
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  editAlert.hidden = true;

  const nama = editNamaInput.value.trim();
  const bio = editBioInput.value.trim();
  const foto = editFotoInput.value.trim();

  if (!nama) {
    editAlert.textContent = "Nama gak boleh kosong.";
    editAlert.className = "pesan-alert pesan-alert-error";
    editAlert.hidden = false;
    return;
  }

  const submitBtn = document.getElementById("profil-edit-save-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  try {
    await updateDoc(doc(db, "members", auth.currentUser.uid), { nama, bio, foto });
    editForm.hidden = true;
    editBtn.textContent = "Edit Profil";
  } catch (error) {
    console.error("Gagal simpan profil:", error);
    editAlert.textContent = "Gagal menyimpan. Coba lagi beberapa saat.";
    editAlert.className = "pesan-alert pesan-alert-error";
    editAlert.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Simpan";
  }
});
