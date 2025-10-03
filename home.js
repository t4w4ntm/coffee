// --- Firebase (เหมือนชุดใน script.js) ---
const firebaseConfig = {
  apiKey: "AIzaSyCad3vMEdmWQUcUDJA6BHYD6AZruzgqom4",
  authDomain: "testdirt-58ba4.firebaseapp.com",
  projectId: "testdirt-58ba4",
  storageBucket: "testdirt-58ba4.firebasestorage.app",
  messagingSenderId: "89792009820",
  appId: "1:89792009820:web:86ff41e9d3211f00997899"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// แปลง Timestamp/Date → Date ปลอดภัยกับทั้งสองแบบ
function toDateSafe(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v.seconds) return new Date(v.seconds * 1000);
  return new Date(v); // เผื่อกรณี string/number
}

// เก็บข้อมูลรายการล่าสุดไว้สำหรับค้นหาแบบ client-side
let allItems = [];

// Utility: debounce
function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), delay);
  };
}

// สร้าง element รายการจากข้อมูล 1 แถว
function createListItem(docId, d) {
  const createdAt = toDateSafe(d.createdAt);
  const dateText = createdAt
    ? createdAt.toLocaleString('th-TH', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })
    : '-';

  const title = d.plot_number || '(ไม่ระบุแปลง)';
  const subtitle = [d.mountain, d.coffee_tree ? `ต้นที่ ${d.coffee_tree}` : ''].filter(Boolean).join(' - ') || '(ไม่ระบุดอย)';

  const item = document.createElement('a');
  item.className = 'data-item';
  item.href = `detail.html?id=${docId}`;

  item.innerHTML = `
    <div class="item-title">${title}</div>
    <div class="item-subtitle">${subtitle}</div>
    <div class="item-date">${dateText}</div>
  `;

  return item;
}

// เรนเดอร์รายการทั้งหมด (หรือที่ถูกกรองแล้ว)
function renderList(items) {
  const container = document.getElementById('data-list');
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p class="empty-state no-results">ไม่พบผลลัพธ์ที่ตรงกับการค้นหา</p>';
    return;
  }

  items.forEach(({ id, data }) => {
    container.appendChild(createListItem(id, data));
  });
}

// ฟังก์ชันค้นหา
function applySearchFilter(query) {
  const q = (query || '').trim().toLowerCase();
  const clearBtn = document.getElementById('clearSearch');
  if (clearBtn) clearBtn.style.visibility = q ? 'visible' : 'hidden';

  if (!q) {
    renderList(allItems);
    return;
  }

  const filtered = allItems.filter(({ data }) => {
    const title = (data.plot_number || '').toLowerCase();
    const subtitle = [(data.mountain || ''), (data.coffee_tree ? `ต้นที่ ${data.coffee_tree}` : '')].filter(Boolean).join(' - ').toLowerCase();

    let dateStr = '';
    const dt = toDateSafe(data.createdAt);
    if (dt) {
      // แปลงเป็นข้อความไทยเช่นกันแล้วค่อย lower
      dateStr = dt.toLocaleString('th-TH', { year:'numeric', month:'long', day:'numeric' }).toLowerCase();
    }

    return title.includes(q) || subtitle.includes(q) || dateStr.includes(q);
  });

  renderList(filtered);
}

const applySearchFilterDebounced = debounce(applySearchFilter, 150);

// ดึงรายการจาก 'soil_tests_new' เรียงจากใหม่ → เก่า
async function displayDataList() {
  const container = document.getElementById('data-list');
  container.innerHTML = '<p class="loading">กำลังโหลดข้อมูล...</p>';

  try {
    const snap = await db.collection("soil_tests_new")
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      container.innerHTML = '<p class="empty-state">ยังไม่มีข้อมูลที่บันทึกไว้<br>กดปุ่ม + เพื่อเพิ่มข้อมูลใหม่</p>';
      return;
    }

    // เก็บไว้ในหน่วยความจำสำหรับค้นหา
    allItems = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));

    renderList(allItems);
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="loading">เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง</p>';
  }
}

function initSearchUI() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');

  if (!input) return; // เผื่อไฟล์นี้ถูกใช้กับหน้าอื่น

  input.addEventListener('input', (e) => applySearchFilterDebounced(e.target.value));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      applySearchFilter('');
      input.blur();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      applySearchFilter('');
      input.focus();
    });
  }
}

window.onload = () => {
  initNavbar('home');
  initSearchUI();
  displayDataList();
};
