// firebase-config.js
// Inisialisasi Firebase pakai CDN (versi modular, gak perlu npm/build tool)
// Wajib dipanggil di HTML dengan: <script type="module" src="js/firebase-config.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Config project (aman ditaruh di frontend, keamanan sebenarnya ada di Firestore Security Rules)
const firebaseConfig = {
  apiKey: "AIzaSyCRadho-t51fnIs6j5H0j_DhX3Mc1VkNHA",
  authDomain: "omyassin-3ff39.firebaseapp.com",
  projectId: "omyassin-3ff39",
  storageBucket: "omyassin-3ff39.firebasestorage.app",
  messagingSenderId: "341614182507",
  appId: "1:341614182507:web:09b0a85d64dd61287f712e"
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// Export biar bisa dipakai di file js lain (home.js, proker.js, dll)
// Pakai initializeFirestore + persistentLocalCache biar data yang udah pernah
// dibaca kesimpen di IndexedDB HP/browser -> buka halaman berikutnya jauh
// lebih cepet (gak perlu nunggu round-trip ke server buat data yang sama).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const auth = getAuth(app);
