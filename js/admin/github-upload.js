// github-upload.js - modul upload file ke GitHub (dipakai anggota-admin.js, dokumentasi-admin.js, dst)
// Logic upload diadaptasi dari tool "MiniDatabase Uploader" yang dibikin admin,
// dibungkus jadi fungsi reusable + token disimpan sementara di sessionStorage
// (ilang otomatis kalau tab ditutup, gak kesimpen permanen demi keamanan).

const GITHUB_OWNER = "zura-bot";
const GITHUB_REPO = "minidatabase";
const GITHUB_BRANCH = "main";
const TOKEN_STORAGE_KEY = "omyassin_github_token";

// ===== Simpan/ambil token GitHub (sessionStorage = per-tab, gak permanen) =====
export function getGithubToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

export function setGithubToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Ubah teks bebas jadi slug aman buat nama file (huruf kecil, spasi jadi strip,
// buang karakter aneh). Contoh: "MPLS 2026!" -> "mpls-2026"
function slugify(teks) {
  return teks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Upload 1 file ke folder tertentu di repo GitHub, balikin raw URL kalau berhasil.
// folder contoh: "anggota", "dokumentasi", "post", "profil"
// customNameBase (opsional): dasar nama file yang lebih deskriptif, misal "MPLS 2026 - 14 Agustus 2026"
// -> nama file jadi "mpls-2026-14-agustus-2026_<timestamp>.jpg" (timestamp tetep ditempel
// biar gak collision kalau ada beberapa file dari acara & tanggal yang sama).
export async function uploadKeGithub(file, folder, customNameBase) {
  const token = getGithubToken();

  if (!token) {
    throw new Error("Token GitHub belum diisi. Isi dulu di kolom atas dashboard.");
  }

  const base64 = await fileToBase64(file);
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const timestamp = Date.now();

  const fileName = customNameBase
    ? `${slugify(customNameBase)}_${timestamp}${ext ? "." + ext : ""}`
    : `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const path = `${folder}/${fileName}`;

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Upload ${fileName}`,
        content: base64,
        branch: GITHUB_BRANCH,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Upload ke GitHub gagal. Cek token & koneksi.");
  }

  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}
