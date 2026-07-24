// berita.js - logic halaman Berita (pages/berita.html)
// - Member yang login bisa posting teks (judul, kategori, isi)
// - Semua orang bisa baca feed-nya (real-time)
// - Pemilik post bisa hapus post-nya sendiri
// - Tombol Bagikan pakai Web Share API

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const composerSection = document.getElementById("berita-composer-section");
const loginPromptSection = document.getElementById("berita-login-prompt");
const composerForm = document.getElementById("berita-composer-form");
const judulInput = document.getElementById("berita-composer-judul");
const kategoriInput = document.getElementById("berita-composer-kategori");
const isiInput = document.getElementById("berita-composer-isi");
const composerAlert = document.getElementById("berita-composer-alert");
const submitBtn = document.getElementById("berita-composer-submit-btn");

const feedEl = document.getElementById("berita-feed");
const feedEmptyEl = document.getElementById("berita-feed-empty");

// SVG avatar donat gigit (dipakai kalau penulis belum punya foto profil)
const AVATAR_DONUT_SVG = `
  <svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="42" fill="#d2a679"/>
    <path d="M12 42 C20 20, 80 20, 88 42 C90 50, 85 55, 78 50 C70 44, 60 48, 52 44 C44 40, 34 46, 26 50 C18 54, 10 50, 12 42 Z" fill="#f472b6"/>
    <circle cx="50" cy="52" r="14" class="avatar-donut-hole"/>
    <circle cx="88" cy="40" r="16" class="avatar-donut-hole"/>
  </svg>
`;

const ICON_SHARE = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"></line></svg>`;

const ICON_VERIFIED = `<svg class="verified-badge" viewBox="0 0 24 24"><path fill="#3b82f6" d="M12 2l2.4 2.2 3.2-.5.9 3.1 3.1.9-.5 3.2L23 12l-2.2 2.4.5 3.2-3.1.9-.9 3.1-3.2-.5L12 23l-2.4-2.2-3.2.5-.9-3.1-3.1-.9.5-3.2L1 12l2.2-2.4-.5-3.2 3.1-.9.9-3.1 3.2.5z"/><path d="M8.5 12.5l2.2 2.2 4.3-4.3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let profilSaya = null; // profil member yang lagi login (kalau ada)
let semuaBerita = [];

// ===== Cek login: tampilin composer atau ajakan masuk =====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    composerSection.hidden = true;
    loginPromptSection.hidden = false;
    profilSaya = null;
    return;
  }

  try {
    const memberSnap = await getDoc(doc(db, "members", user.uid));

    if (!memberSnap.exists()) {
      // Login tapi bukan member (harusnya jarang kejadian) -> anggap kayak belum login
      composerSection.hidden = true;
      loginPromptSection.hidden = false;
      return;
    }

    profilSaya = { uid: user.uid, ...memberSnap.data() };
    composerSection.hidden = false;
    loginPromptSection.hidden = true;
  } catch (error) {
    console.error("Gagal ambil profil buat composer:", error);
    composerSection.hidden = true;
    loginPromptSection.hidden = false;
  }
});

// ===== Submit posting berita baru =====
composerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  composerAlert.hidden = true;

  if (!profilSaya) return;

  const judul = judulInput.value.trim();
  const kategori = kategoriInput.value;
  const isi = isiInput.value.trim();

  if (!judul || !isi) {
    composerAlert.textContent = "Judul dan isi wajib diisi.";
    composerAlert.className = "pesan-alert pesan-alert-error";
    composerAlert.hidden = false;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Memposting...";

  try {
    await addDoc(collection(db, "berita"), {
      judul,
      kategori,
      isi,
      gambar: "", // kosong dulu, cuma admin yang bisa isi lewat dashboard
      authorUid: profilSaya.uid,
      authorNama: profilSaya.nama || "",
      authorUsername: profilSaya.username || "",
      authorFoto: profilSaya.foto || "",
      authorRole: profilSaya.role || "",
      authorVerified: Boolean(profilSaya.verified),
      createdAt: serverTimestamp(),
    });

    composerForm.reset();
  } catch (error) {
    console.error("Gagal posting berita:", error);
    composerAlert.textContent = "Gagal posting. Coba lagi beberapa saat.";
    composerAlert.className = "pesan-alert pesan-alert-error";
    composerAlert.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Posting";
  }
});

// ===== Format waktu ringkas =====
function formatWaktu(timestamp) {
  if (!timestamp) return "Baru saja";
  const tanggal = timestamp.toDate();
  return tanggal.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ===== Render 1 kartu post =====
function buatKartuBerita(data) {
  const avatarHtml = data.authorFoto
    ? `<img src="${data.authorFoto}" alt="Foto ${data.authorNama}" />`
    : AVATAR_DONUT_SVG;

  const punyaSendiri = auth.currentUser && auth.currentUser.uid === data.authorUid;

  return `
    <article class="ig-post" data-id="${data.id}">
      <a href="/pages/profil.html?u=${encodeURIComponent(data.authorUsername)}" class="ig-post-header">
        <span class="avatar-donut avatar-donut-sm">${avatarHtml}</span>
        <div class="ig-post-author">
          <strong>${data.authorNama || "(tanpa nama)"} ${data.authorVerified ? ICON_VERIFIED : ""}</strong>
          <span>${data.authorRole || `@${data.authorUsername}`}</span>
        </div>
      </a>

      ${data.gambar ? `<div class="ig-post-media"><img src="${data.gambar}" alt="${data.judul}" loading="lazy" /></div>` : ""}

      <div class="ig-post-actions">
        <button type="button" class="berita-share-btn" data-judul="${data.judul}" data-teks="${data.isi}">
          ${ICON_SHARE}
          <span class="berita-share-label">Bagikan</span>
        </button>
        ${punyaSendiri ? `<button type="button" class="berita-hapus-btn" data-id="${data.id}">Hapus</button>` : ""}
      </div>

      <div class="ig-post-body">
        <span class="badge status-berjalan">${data.kategori || "Pengumuman"}</span>
        <h4>${data.judul}</h4>
        <p>${data.isi}</p>
        <time>${formatWaktu(data.createdAt)}</time>
      </div>
    </article>
  `;
}

function renderFeed() {
  if (semuaBerita.length === 0) {
    feedEl.innerHTML = "";
    feedEmptyEl.hidden = false;
    return;
  }

  feedEmptyEl.hidden = true;
  feedEl.innerHTML = semuaBerita.map(buatKartuBerita).join("");
  pasangEventListenerFeed();
}

function pasangEventListenerFeed() {
  // Tombol Bagikan
  feedEl.querySelectorAll(".berita-share-btn").forEach((btn) => {
    const label = btn.querySelector(".berita-share-label");
    const labelAsli = label ? label.textContent : "";

    btn.addEventListener("click", async () => {
      const judul = btn.dataset.judul || document.title;
      const teks = btn.dataset.teks || "";
      const url = window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({ title: judul, text: teks, url });
        } catch (error) {
          // User batal share, gak perlu dianggap error
        }
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        if (label) {
          label.textContent = "Link disalin!";
          setTimeout(() => {
            label.textContent = labelAsli;
          }, 2000);
        }
      } catch (error) {
        alert("Gagal menyalin link. Salin manual: " + url);
      }
    });
  });

  // Tombol Hapus (cuma ada di post milik sendiri)
  feedEl.querySelectorAll(".berita-hapus-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Yakin mau hapus postingan ini?")) return;

      try {
        await deleteDoc(doc(db, "berita", btn.dataset.id));
      } catch (error) {
        console.error("Gagal hapus berita:", error);
        alert("Gagal hapus postingan. Coba lagi.");
      }
    });
  });
}

// ===== Ambil feed real-time =====
const beritaQuery = query(collection(db, "berita"), orderBy("createdAt", "desc"));

onSnapshot(
  beritaQuery,
  (snapshot) => {
    semuaBerita = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderFeed();
  },
  (error) => {
    console.error("Gagal ambil feed berita:", error);
    feedEl.innerHTML = "";
    feedEmptyEl.hidden = false;
    feedEmptyEl.querySelector("p").textContent = "Gagal memuat berita. Coba refresh halaman.";
  }
);
