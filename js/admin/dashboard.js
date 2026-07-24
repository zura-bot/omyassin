// dashboard.js - shell logic: auth guard, tab switching, sidebar mobile, logout

import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getGithubToken, setGithubToken } from "./github-upload.js";

const authChecking = document.getElementById("auth-checking");
const dashboardApp = document.getElementById("dashboard-app");
const adminEmailTag = document.getElementById("admin-email");
const logoutBtn = document.getElementById("logout-btn");
const githubTokenInput = document.getElementById("github-token-input");

// ===== Token GitHub (buat upload foto/gambar langsung) =====
// Diisi sekali di topbar, kepake bareng sama semua form yang butuh upload.
// Cuma kesimpen sementara di sessionStorage, ilang kalau tab ditutup.
githubTokenInput.value = getGithubToken();
githubTokenInput.addEventListener("change", () => {
  setGithubToken(githubTokenInput.value.trim());
});

// ===== Auth guard =====
// Cek status login. Kalau belum login, tendang balik ke halaman login.
// PENTING: cek juga apakah uid ini beneran ada di collection "admins" —
// soalnya setelah sistem member ada, "udah login" doang gak cukup buat
// mastiin ini beneran admin (bisa aja member biasa yang login).
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/pages/admin/login.html";
    return;
  }

  const adminDoc = await getDoc(doc(db, "admins", user.uid));

  if (!adminDoc.exists()) {
    console.error("Akun ini login tapi bukan admin, akses ditolak.");
    await signOut(auth);
    window.location.href = "/pages/admin/login.html";
    return;
  }

  // User valid & beneran admin, tampilkan dashboard
  adminEmailTag.textContent = user.email;
  authChecking.hidden = true;
  dashboardApp.hidden = false;
});

// ===== Logout =====
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "/pages/admin/login.html";
  } catch (error) {
    console.error("Gagal logout:", error);
  }
});

// ===== Tab switching =====
const sidebarLinks = document.querySelectorAll(".sidebar-link");
const dashboardTabs = document.querySelectorAll(".dashboard-tab");
const dashboardTitle = document.getElementById("dashboard-title");

const TAB_TITLES = {
  pesan: "Pesan Anonim",
  anggota: "Anggota",
  proker: "Proker",
  dokumentasi: "Dokumentasi",
};

sidebarLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.dataset.tab;

    sidebarLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    dashboardTabs.forEach((tab) => tab.classList.remove("active"));
    document.getElementById(`tab-${target}`).classList.add("active");

    dashboardTitle.textContent = TAB_TITLES[target];

    // Tutup sidebar otomatis di mobile abis pilih menu
    closeSidebar();
  });
});

// ===== Sidebar toggle (mobile) =====
const sidebar = document.getElementById("dashboard-sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");

function openSidebar() {
  sidebar.classList.add("open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
}

sidebarToggleBtn.addEventListener("click", () => {
  sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
});

// ===== Modal konfirmasi hapus (dipakai bareng oleh pesan-admin.js, anggota-admin.js, dll) =====
// Export function global biar bisa dipanggil dari file admin lain
const confirmModal = document.getElementById("confirm-modal");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

let onConfirmCallback = null;

export function mintaKonfirmasiHapus(onConfirm) {
  onConfirmCallback = onConfirm;
  confirmModal.hidden = false;
}

confirmCancelBtn.addEventListener("click", () => {
  confirmModal.hidden = true;
  onConfirmCallback = null;
});

confirmDeleteBtn.addEventListener("click", () => {
  if (onConfirmCallback) onConfirmCallback();
  confirmModal.hidden = true;
  onConfirmCallback = null;
});
