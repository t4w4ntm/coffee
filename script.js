// =========================
// 🔧 ตั้งค่า Firebase & Cloudinary
// =========================

// --- ‼️ กรอกค่าของโปรเจกต์คุณให้ถูกต้องก่อนใช้งาน ‼️ ---
const firebaseConfig = {
  apiKey: "AIzaSyCad3vMEdmWQUcUDJA6BHYD6AZruzgqom4",
  authDomain: "testdirt-58ba4.firebaseapp.com",
  projectId: "testdirt-58ba4",
  storageBucket: "testdirt-58ba4.firebasestorage.app",
  messagingSenderId: "89792009820",
  appId: "1:89792009820:web:86ff41e9d3211f00997899"
};

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfix1lo9q/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "soil_test_uploads";

// =========================
// � ระบบเก็บข้อมูลทะเบียนเกษตรกร
// =========================

// เก็บข้อมูลทะเบียนเกษตรกรสำหรับใช้ร่วมกันระหว่างต้นทั้งหมด
let farmerData = {};

// =========================
// �🕐 ระบบจัดการวันที่ (รองรับการทดสอบ)
// =========================

function getCurrentDate() {
  // 1) Query parameter สำหรับทดสอบ: ?testDate=2025-09-10
  const params = new URLSearchParams(location.search);
  if (params.has('testDate')) {
    const testDate = new Date(params.get('testDate') + 'T00:00:00');
    if (!isNaN(testDate)) {
      console.log('🧪 ใช้วันที่ทดสอบ:', testDate.toLocaleDateString('th-TH'));
      return testDate;
    }
  }

  // 2) Override ผ่าน window variable: window.__debugDate = '2025-09-10'
  if (window.__debugDate) {
    const debugDate = new Date(window.__debugDate + 'T00:00:00');
    if (!isNaN(debugDate)) {
      console.log('🔧 ใช้วันที่ debug:', debugDate.toLocaleDateString('th-TH'));
      return debugDate;
    }
  }

  // 3) วันที่จริงจากเครื่อง (force refresh)
  const now = new Date();
  return new Date(now.getTime());
}

function shouldHideFarmerSection(testDate = null) {
  const now = testDate || getCurrentDate();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // ตั้งแต่ 1 พฤศจิกายน 2025 เป็นต้นไป
  const shouldHide = (year > 2025) || (year === 2025 && month >= 11);
  
  console.log(`📅 วันที่ปัจจุบัน: ${now.toLocaleDateString('th-TH')} (${year}-${month})`);
  console.log(`👨‍🌾 ซ่อนทะเบียนเกษตรกร: ${shouldHide}`);
  
  return shouldHide;
}

// ฟังก์ชันตรวจสอบวันที่สำหรับการแสดงผลผลิตเมล็ดกาแฟ
function shouldShowBeanYieldSection(testDate = null) {
  const now = testDate || getCurrentDate();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // ตั้งแต่ 1 ธันวาคม 2025 เป็นต้นไป
  const shouldShow = (year > 2025) || (year === 2025 && month >= 12);
  
  console.log(`☕ แสดงผลผลิตเมล็ดกาแฟ: ${shouldShow}`);
  
  return shouldShow;
}

// =========================
// 👨‍🌾 ระบบจัดการข้อมูลทะเบียนเกษตรกร
// =========================

// บันทึกข้อมูลทะเบียนเกษตรกรจากฟอร์ม
function saveFarmerData() {
  const farmerFields = [
    'farmer_name', 'age', 'coffee_experience', 'planting_area', 'address', 
    'gps_coordinates', 'water_system', 'fertilizer_type', 'fertilizer_formula',
    'fertilizer_frequency', 'fertilizer_amount', 'soil_problems', 'yield_problems',
    'internet_access', 'yield_per_tree', 'cupping_experience', 'fertilizer_cost',
    'labor_cost', 'other_costs'
  ];

  farmerFields.forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (el && el.value !== '') {
      farmerData[fieldId] = el.value;
    }
  });
  
  console.log('💾 บันทึกข้อมูลทะเบียนเกษตรกร:', farmerData);
}

// Global cache สำหรับข้อมูลทะเบียนเกษตรกร
let farmerDataCache = null;
let farmerDataLoaded = false;

// ดึงข้อมูลทะเบียนเกษตรกรที่บันทึกไว้ (Optimized)
function getFarmerData(fieldId) {
  // ใช้ข้อมูลจาก memory cache ก่อน
  if (farmerData[fieldId] && farmerData[fieldId] !== '') {
    return farmerData[fieldId];
  }
  
  // ใช้ข้อมูลจาก database cache
  if (farmerDataCache && farmerDataCache[fieldId]) {
    return farmerDataCache[fieldId];
  }
  
  return '';
}

// ดึงข้อมูลทะเบียนเกษตรกรแบบตัวเลข (Optimized)
function getFarmerNumber(fieldId) {
  const value = getFarmerData(fieldId);
  if (!value || value === '') return null;
  const parsed = Number(value);
  if (isNaN(parsed)) return null;
  
  const positiveOnlyFields = ['age', 'coffee_experience', 'planting_area', 'fertilizer_frequency', 
                             'fertilizer_amount', 'yield_per_tree', 'fertilizer_cost', 'labor_cost', 'other_costs'];
  if (positiveOnlyFields.includes(fieldId) && parsed < 0) {
    return null;
  }
  return parsed;
}

// ดึงข้อมูลทะเบียนเกษตรกรจากฐานข้อมูล (ต้นที่ 1 ของแปลงเดียวกัน)
async function loadFarmerDataFromDatabase() {
  // ถ้าโหลดแล้วและมี cache ให้ใช้เลย
  if (farmerDataLoaded && farmerDataCache) {
    console.log('📋 ใช้ข้อมูลจาก cache');
    return true;
  }

  const mountain = document.getElementById('mountain')?.value;
  const plotNumber = document.getElementById('plot_number')?.value;
  
  if (!mountain || !plotNumber) {
    console.log('❌ ไม่มีข้อมูลดอยหรือแปลงเพื่อค้นหา');
    farmerDataLoaded = true;
    farmerDataCache = {};
    return false;
  }
  
  console.log('🔍 ค้นหาข้อมูลทะเบียนเกษตรกรจากต้นที่ 1 ของแปลง:', { mountain, plotNumber });
  
  try {
    // ค้นหาต้นที่ 1 ของแปลงเดียวกันที่มีข้อมูลทะเบียนเกษตรกร (จำกัดผลลัพธ์)
    const querySnapshot = await db.collection("soil_tests_new")
      .where('mountain', '==', mountain)
      .where('plot_number', '==', plotNumber)
      .where('coffee_tree', '==', '1')
      .orderBy('createdAt', 'desc')
      .limit(5) // จำกัดผลลัพธ์เพื่อความเร็ว
      .get();
    
    console.log('📋 ผลการค้นหา:', querySnapshot.empty ? 'ไม่พบ' : `พบ ${querySnapshot.docs.length} รายการ`);
    
    // หาต้นที่ 1 ที่มีข้อมูลทะเบียนเกษตรกร
    let foundData = null;
    if (!querySnapshot.empty) {
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        // ตรวจสอบว่ามีข้อมูลทะเบียนเกษตรกรหรือไม่
        if (data.farmer_name && data.age && data.address) {
          foundData = data;
          console.log('✅ พบข้อมูลทะเบียนเกษตรกรจากต้นที่ 1');
          break;
        }
      }
    }
    
    if (foundData) {
      // อัปเดต farmerData และ cache
      const farmerFields = [
        'farmer_name', 'age', 'coffee_experience', 'planting_area', 'address', 
        'gps_coordinates', 'water_system', 'fertilizer_type', 'fertilizer_formula',
        'fertilizer_frequency', 'fertilizer_amount', 'soil_problems', 'yield_problems',
        'internet_access', 'yield_per_tree', 'cupping_experience', 'fertilizer_cost',
        'labor_cost', 'other_costs'
      ];
      
      // สร้าง cache ใหม่
      farmerDataCache = {};
      farmerFields.forEach(fieldId => {
        if (foundData[fieldId] !== undefined && foundData[fieldId] !== null && foundData[fieldId] !== '') {
          farmerData[fieldId] = foundData[fieldId];
          farmerDataCache[fieldId] = foundData[fieldId];
        }
      });
      
      farmerDataLoaded = true;
      console.log('💾 อัปเดต farmerData และ cache จากฐานข้อมูล');
      return true;
    } else {
      console.log('❌ ไม่พบข้อมูลทะเบียนเกษตรกรครบถ้วนในต้นที่ 1');
      farmerDataLoaded = true;
      farmerDataCache = {};
      return false;
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการค้นหาข้อมูล:', error);
    farmerDataLoaded = true;
    farmerDataCache = {};
    return false;
  }
}

// ฟังก์ชันสำหรับรีเฟรชสถานะ (เรียกได้จาก console)
// =========================
// 🌱 จัดการส่วนผลผลิตเมล็ดกาแฟ
// =========================

window.refreshBeanYieldSectionStatus = function() {
  const beanYieldSection = document.getElementById('bean_yield_section');
  const showBeanYield = shouldShowBeanYieldSection();
  
  if (beanYieldSection) {
    const beanYieldRequiredEls = beanYieldSection.querySelectorAll('input, select');
    
    if (showBeanYield) {
      beanYieldSection.style.display = '';
      // คืน required attributes กลับมา
      beanYieldRequiredEls.forEach(el => {
        if (el.dataset.wasRequired === 'true') {
          el.setAttribute('required', '');
        }
        el.disabled = false;
      });
    } else {
      beanYieldSection.style.display = 'none';
      // เก็บและเอา required attributes ออก
      beanYieldRequiredEls.forEach(el => {
        if (el.hasAttribute('required')) {
          el.dataset.wasRequired = 'true';
        }
        el.removeAttribute('required');
        el.disabled = true;
      });
      // ล้างค่าฟิลด์ที่ซ่อน
      beanYieldRequiredEls.forEach(el => {
        if (el.type === 'number') {
          el.value = '';
        } else if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        }
      });
    }
  }
};

window.refreshFarmerSectionStatus = function() {
  const hideByDate = shouldHideFarmerSection();
  window.NO_FARMER_SECTION = hideByDate;
  
  // อัปเดต UI ทันที
  const section = document.getElementById('farmer_section');
  const coffeeSelect = document.getElementById('coffee_tree');
  
  if (section) {
    if (hideByDate) {
      // ซ่อนทะเบียนเกษตรกรทันทีตามวันที่ (ไม่ว่าจะเลือกต้นไหน)
      section.style.display = 'none';
      section.querySelectorAll('[required]').forEach(el => {
        el.removeAttribute('required');
        el.disabled = true;
      });
    } else {
      // ถ้าไม่ซ่อนตามวันที่ ให้เช็คตามต้นกาแฟ
      if (coffeeSelect && coffeeSelect.value === '1') {
        section.style.display = '';
        section.querySelectorAll('input, select, textarea').forEach(el => {
          if (!el.hasAttribute('data-locked')) {
            el.disabled = false;
          }
          // คืนค่า required ตาม original attribute
          if (el.dataset.originalRequired === 'true') {
            el.setAttribute('required', '');
          }
        });
      } else if (coffeeSelect && ['2','3','4','5','6'].includes(coffeeSelect.value)) {
        section.style.display = 'none';
      } else {
        // ถ้ายังไม่ได้เลือกต้นกาแฟ แต่ไม่ซ่อนตามวันที่ ให้แสดงปกติ
        section.style.display = '';
        section.querySelectorAll('input, select, textarea').forEach(el => {
          if (!el.hasAttribute('data-locked')) {
            el.disabled = false;
          }
          if (el.dataset.originalRequired === 'true') {
            el.setAttribute('required', '');
          }
        });
      }
    }
  }
  
  // จัดการโซนผลผลิตเมล็ดกาแฟ
  window.refreshBeanYieldSectionStatus();
  
  console.log('🔄 รีเฟรชสถานะเสร็จแล้ว - ซ่อนตามวันที่:', hideByDate);
};

// ฟังก์ชันช่วยในการทดสอบ (เรียกได้จาก console)
window.testDate = function(dateString) {
  console.log(`🧪 ทดสอบด้วยวันที่: ${dateString}`);
  window.__debugDate = dateString;
  window.refreshFarmerSectionStatus();
};

// ฟังก์ชันยกเลิกการทดสอบ กลับไปใช้วันที่จริง
window.resetDate = function() {
  console.log('🔄 รีเซ็ตกลับไปใช้วันที่จริง');
  delete window.__debugDate;
  const url = new URL(window.location);
  url.searchParams.delete('testDate');
  window.history.replaceState({}, '', url);
  window.refreshFarmerSectionStatus();
};

// --- เริ่มต้นการเชื่อมต่อ Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// =========================
// 📎 ส่วนจัดการไฟล์แนบ (ภาพ/วิดีโอ)
// =========================

// เก็บไฟล์ที่ผู้ใช้เลือกสะสมข้ามการเลือกหลายครั้ง
const selectedFiles = [];
const selectedFileKeys = new Set();
function addToSelectedFiles(fileList){
  Array.from(fileList || []).forEach(f => {
    const key = `${f.name}|${f.size}|${f.lastModified}`;
    if (!selectedFileKeys.has(key)) {
      selectedFileKeys.add(key);
      selectedFiles.push(f);
    }
  });
}

function createFileInput() {
  const row = document.createElement("div");
  row.classList.add("file-row");

  const input = document.createElement("input");
  input.type = "file";
  input.name = "mediaFiles[]";
  input.accept = ".jpg,.jpeg,.png";
  input.multiple = true;
  
  // ซ่อน input element
  input.style.display = "none";
  
  // สร้าง container สำหรับ file label และ preview
  const fileContainer = document.createElement("div");
  fileContainer.classList.add("file-container");
  
  // สร้าง label ที่ทำหน้าที่เป็นปุ่มเลือกไฟล์และแสดงชื่อไฟล์
  const fileLabel = document.createElement("div");
  fileLabel.classList.add("file-label", "select-button");
  fileLabel.textContent = "เลือกไฟล์";
  
  // เมื่อคลิก label จะเป็นการเปิด file dialog
  fileLabel.addEventListener("click", () => {
    input.click();
  });
  
  // สร้าง container สำหรับแสดงรูปภาพ (ด้านล่าง)
  const previewContainer = document.createElement("div");
  previewContainer.classList.add("file-preview-container");
  
  // เมื่อเลือกไฟล์ ให้สะสมไฟล์ไว้ เพื่อให้เลือกหลายรอบได้จริง
  input.addEventListener("change", () => {
    addToSelectedFiles(input.files);
    
    // อัปเดตชื่อไฟล์ใน label
    updateFileLabel(input.files, fileLabel);
    
    // แสดงรูปภาพด้านล่าง
    displaySelectedImages(input.files, previewContainer);
    
    // ล้างค่าใน input เพื่อให้สามารถเลือกไฟล์เดิมอีกรอบได้ถ้าต้องการ และป้องกันการแทนที่ไฟล์ก่อนหน้า
    input.value = "";
  });

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "ลบ";
  removeBtn.classList.add("remove-btn");
  removeBtn.addEventListener("click", () => row.remove());

  // เพิ่ม element ตามลำดับ: input ซ่อน, file container (ซ้าย), ปุ่มลบ (ขวา)
  fileContainer.appendChild(fileLabel);
  fileContainer.appendChild(previewContainer);
  
  row.appendChild(input);
  row.appendChild(fileContainer);
  row.appendChild(removeBtn);
  
  return row;
}

// ฟังก์ชันสำหรับอัปเดตชื่อไฟล์ใน label
function updateFileLabel(fileList, label) {
  const files = Array.from(fileList || []);
  
  if (files.length === 0) {
    label.textContent = "เลือกไฟล์";
    label.className = "file-label select-button";
  } else if (files.length === 1) {
    label.textContent = files[0].name;
    label.className = "file-label selected";
  } else {
    label.textContent = `เลือกไฟล์แล้ว ${files.length} ไฟล์`;
    label.className = "file-label selected";
  }
}

// ฟังก์ชันสำหรับแสดงรูปภาพด้านล่าง
function displaySelectedImages(fileList, container) {
  // ล้างการแสดงผลเดิม
  container.innerHTML = '';
  
  Array.from(fileList || []).forEach(file => {
    // แสดงเฉพาะไฟล์รูปภาพ
    if (file.type.startsWith('image/')) {
      const imgContainer = document.createElement("div");
      imgContainer.classList.add("image-preview");
      
      const img = document.createElement("img");
      
      const reader = new FileReader();
      reader.onload = function(e) {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      
      imgContainer.appendChild(img);
      container.appendChild(imgContainer);
    }
  });
}

document.getElementById("addFileBtn").addEventListener("click", () => {
  document.getElementById("fileInputs").appendChild(createFileInput());
});

// เพิ่ม input แรกให้อัตโนมัติ เพื่อให้ผู้ใช้เลือกไฟล์หลายรอบโดยไม่ถูกแทนที่ไฟล์เดิม
(function ensureInitialFileInput(){
  const wrap = document.getElementById("fileInputs");
  if (wrap && !wrap.querySelector("input[type='file']")) {
    wrap.appendChild(createFileInput());
  }
})();

// =========================
/*  🧾 Submit Form:
    1) อัปโหลดไฟล์ไป Cloudinary
    2) รวมข้อมูลจากฟอร์ม
    3) บันทึกลง Firestore
*/
// =========================

// ป้องกันการบันทึกซ้ำ
let isSaving = false;

document.getElementById("soilForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  
  // ป้องกันการกดปุ่มซ้ำ
  if (isSaving) {
    console.log('🚫 กำลังบันทึกอยู่...');
    return;
  }
  
  isSaving = true;
  const saveBtn = e.target.querySelector(".btn-save");
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;

  try {
    // แสดงสถานะการอัปโหลดไฟล์
    saveBtn.textContent = "กำลังอัปโหลดไฟล์...";

    // --- 1) อัปโหลดไฟล์ทั้งหมดขึ้น Cloudinary (ถ้ามี) ---
    let filesToUpload = selectedFiles.slice();
    if (filesToUpload.length === 0) {
      const fileInputs = document.querySelectorAll("input[name='mediaFiles[]']");
      fileInputs.forEach(input => Array.from(input.files || []).forEach(file => filesToUpload.push(file)));
    }

    let fileURLs = [];
    if (filesToUpload.length > 0) {
      const uploadPromises = filesToUpload.map(file => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        return fetch(CLOUDINARY_URL, { method: "POST", body: formData }).then(res => res.json());
      });

      const uploadedResponses = await Promise.all(uploadPromises);
      fileURLs = uploadedResponses
        .filter(res => res && res.secure_url)
        .map(res => res.secure_url);
    }

    // แสดงสถานะการบันทึกข้อมูล
    saveBtn.textContent = "กำลังบันทึกข้อมูล...";

    // --- 2) รวมข้อมูลจากฟอร์ม (ดึงจากทุก ID ที่มี) ---
    const value = id => {
      const el = document.getElementById(id);
      // ถ้า element ถูก disabled หรือไม่มี ให้คืนค่าว่าง
      if (!el || el.disabled) return '';
      return el.value ?? '';
    };

    const num = id => {
      const el = document.getElementById(id);
      // ถ้า element ถูก disabled หรือไม่มี ให้คืนค่า null
      if (!el || el.disabled) return null;
      
      const v = el.value;
      if (v === '' || v === null || v === undefined) return null;
      const parsed = Number(v);
      if (isNaN(parsed)) return null;
      const positiveOnlyFields = ['age', 'coffee_experience', 'planting_area', 'fertilizer_frequency', 
                                 'fertilizer_amount', 'yield_per_tree', 'fertilizer_cost', 'labor_cost', 
                                 'other_costs', 'coffee_height', 'coffee_circumference', 'fresh_weight', 'dry_weight'];
      if (positiveOnlyFields.includes(id) && parsed < 0) {
        return null;
      }
      return parsed;
    };

    // *** OPTIMIZED: โหลดข้อมูลทะเบียนเกษตรกรครั้งเดียวก่อนสร้าง formData ***
    saveBtn.textContent = "กำลังโหลดข้อมูลทะเบียนเกษตรกร...";
    await loadFarmerDataFromDatabase();
    
    saveBtn.textContent = "กำลังเตรียมข้อมูลบันทึก...";

    const formDataForFirebase = {
      // ข้อมูลแปลง
      mountain: value("mountain"),
      plot_number: value("plot_number"),
      coffee_tree: value("coffee_tree"),

      // ทะเบียนเกษตรกร - ใช้ฟังก์ชันที่ optimize แล้ว (ไม่ async)
      farmer_name: getFarmerData("farmer_name"),
      age: getFarmerNumber("age"),
      coffee_experience: getFarmerNumber("coffee_experience"),
      planting_area: getFarmerNumber("planting_area"),
      address: getFarmerData("address"),
      gps_coordinates: getFarmerData("gps_coordinates"),
      water_system: getFarmerData("water_system"),
      fertilizer_type: getFarmerData("fertilizer_type"),
      fertilizer_formula: getFarmerData("fertilizer_formula"),
      fertilizer_frequency: getFarmerNumber("fertilizer_frequency"),
      fertilizer_amount: getFarmerNumber("fertilizer_amount"),
      soil_problems: getFarmerData("soil_problems"),
      yield_problems: getFarmerData("yield_problems"),
      internet_access: getFarmerData("internet_access"),
      yield_per_tree: getFarmerNumber("yield_per_tree"),
      cupping_experience: getFarmerData("cupping_experience"),
      fertilizer_cost: getFarmerNumber("fertilizer_cost"),
      labor_cost: getFarmerNumber("labor_cost"),
      other_costs: getFarmerNumber("other_costs"),

      // วัดค่าดินแบบพกพา
      n_portable: num("n_portable"),
      ph_portable: num("ph_portable"),
      p_portable: num("p_portable"),
      om_portable: num("om_portable"),
      k_portable: num("k_portable"),
      moisture_portable: num("moisture_portable"),
      ec_portable: num("ec_portable"),
      temp_portable: num("temp_portable"),

      // ติดตามการเจริญเติบโต
      coffee_height: num("coffee_height"),
      coffee_circumference: num("coffee_circumference"),
      flowering: value("flowering"),
      fruiting: value("fruiting"),
      disease_problem: value("disease_problem"),
      insect_problem: value("insect_problem"),
      worm_problem: value("worm_problem"),

      // ผลผลิตเมล็ดกาแฟ (ตั้งแต่ธันวาคม 2025)
      fresh_weight: num("fresh_weight"),
      dry_weight: num("dry_weight"),
      bean_quality: value("bean_quality"),

      // ไฟล์แนบ
      files: fileURLs,

      // เมตา
      createdAt: new Date()
    };

    // ตรวจสอบข้อมูลก่อนบันทึก
    const validationErrors = validateFormData(formDataForFirebase);
    if (validationErrors.length > 0) {
      alert('พบข้อผิดพลาด:\n' + validationErrors.join('\n'));
      saveBtn.disabled = false;
      saveBtn.textContent = "บันทึกข้อมูล";
      return;
    }

    // --- 3) บันทึกลง Firestore ---
    // หน้าฟอร์มสร้างข้อมูลใหม่เท่านั้น ไม่อัปเดตข้อมูลเก่า
    await db.collection("soil_tests_new").add(formDataForFirebase);
    
  alert("บันทึกข้อมูลใหม่เรียบร้อยแล้ว!");
  // หลังบันทึกเสร็จ กลับไปหน้า home
  window.location.href = "home.html";
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    
    // แสดง error ที่ละเอียดมากขึ้น
    let errorMessage = "เกิดข้อผิดพลาดในการบันทึกข้อมูล: ";
    if (error.code) {
      errorMessage += `\nรหัสข้อผิดพลาด: ${error.code}`;
    }
    if (error.message) {
      errorMessage += `\nรายละเอียด: ${error.message}`;
    }
    
    alert(errorMessage);
  } finally {
    // รีเซ็ตสถานะการบันทึก
    isSaving = false;
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
    
    // รีเซ็ต cache ข้อมูลทะเบียนเกษตรกร
    farmerDataLoaded = false;
    farmerDataCache = null;
  }
});

// เพิ่มฟังก์ชันตรวจสอบข้อมูลก่อนบันทึก
function validateFormData(data) {
  const errors = [];
  
  // ตรวจสอบค่าที่ไม่ควรเป็นลบ
  const positiveFields = {
    'age': 'อายุ',
    'coffee_experience': 'ประสบการณ์ปลูกกาแฟ',
    'planting_area': 'พื้นที่เพาะปลูก',
    'fertilizer_cost': 'ต้นทุนปุ๋ย',
    'labor_cost': 'ค่าแรงงาน',
    'other_costs': 'ค่าใช้จ่ายอื่นๆ',
    'coffee_height': 'ความสูงต้น',
    'coffee_circumference': 'เส้นรอบวง'
  };
  
  Object.keys(positiveFields).forEach(field => {
    if (data[field] !== null && data[field] < 0) {
      errors.push(`${positiveFields[field]} ไม่ควรเป็นค่าลบ`);
    }
  });
  
  return errors;
}


// =========================
// 🧭 Google Map + Geolocation
// =========================

let map;
let marker;
const defaultPosition = { lat: 19.0333, lng: 99.8333 }; // ภาคเหนือไทย (สำรอง)

function initMap(startPosOverride) {
  const gpsInput = document.getElementById('gps_coordinates');
  const existingCoords = gpsInput.value.split(',').map(Number);

  const startPosition =
    startPosOverride
      ? startPosOverride
      : (existingCoords.length === 2 && !isNaN(existingCoords[0]) && !isNaN(existingCoords[1]))
        ? { lat: existingCoords[0], lng: existingCoords[1] }
        : defaultPosition;

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 13,
    center: startPosition,
  });

  marker = new google.maps.Marker({
    position: startPosition,
    map: map,
    draggable: true
  });

  map.addListener("click", (e) => {
    marker.setPosition(e.latLng);
  });
}

// ให้ callback=initMap ในสคริปต์ Google Maps เรียกเจอ
window.initMap = initMap;

// ตรวจ permission ของ geolocation (ถ้าใช้ได้ จะได้ 'granted' | 'prompt' | 'denied')
const ensureGeoPermission = async () => {
  try {
    if (!('permissions' in navigator) || !('geolocation' in navigator)) return 'unsupported';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
};

const showGeoHint = (state) => {
  const hintId = 'geo-hint';
  let hint = document.getElementById(hintId);
  if (!hint) {
    hint = document.createElement('div');
    hint.id = hintId;
    hint.style.margin = '0 0 10px';
    hint.style.color = '#5a4a37';
    hint.style.fontSize = '0.95rem';
    const modalContent = document.querySelector('#mapModal .modal-content');
    if (modalContent) modalContent.prepend(hint);
  }
  if (state === 'denied') {
    hint.innerHTML = 'เบราว์เซอร์ปิดสิทธิ์ตำแหน่งไว้ — ไปที่ไอคอนกุญแจบนแถบที่อยู่ → Site settings → Location: <b>Allow</b> แล้วรีโหลดหน้า';
  } else if (state === 'unsupported') {
    hint.textContent = 'เบราว์เซอร์ไม่รองรับ geolocation หรือไม่ได้รันบน HTTPS/localhost';
  } else if (state === 'unknown') {
    hint.textContent = 'ไม่สามารถตรวจสอบสิทธิ์ตำแหน่งได้ (อาจมาจากนโยบายเบราว์เซอร์)';
  } else {
    hint.textContent = '';
  }
};


// =========================
// 🧩 UI: Modal แผนที่ + ตัวเลือกแปลง + ปักหมุดปัจจุบัน + auto-format ปุ๋ย
// =========================

document.addEventListener('DOMContentLoaded', function() {
  // --- จัดการ Modal แผนที่ ---
  const modal = document.getElementById('mapModal');
  const mapBtn = document.getElementById('mapBtn');
  const closeBtn = document.querySelector('.close-btn');
  const confirmBtn = document.getElementById('confirmLocationBtn');
  const gpsInput = document.getElementById('gps_coordinates');
  const locateMeBtn = document.getElementById('locateMeBtn'); // ปุ่ม 📍 ปักหมุดที่ตำแหน่งปัจจุบัน

  // --- ปุ่มเลือกจากแผนที่ ---
  mapBtn.onclick = async function() {
    modal.style.display = "block";

    // ตรวจสถานะ permission แล้วขึ้นคำแนะนำ
    const state = await ensureGeoPermission();
    showGeoHint(state);

    // ฟังก์ชันขอพิกัดผู้ใช้ แล้ว init/อัปเดตแผนที่
    const startWithGeo = () => {
      if (!navigator.geolocation) {
        if (!map) initMap();
        return;
      }
      const options = { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 };
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (map) {
            map.setCenter(current);
            marker.setPosition(current);
          } else {
            initMap(current);
          }
        },
        (_err) => {
          // ผู้ใช้ปฏิเสธ/หาไม่เจอ → fallback และแสดงคำแนะนำ
          showGeoHint('denied');
          if (!map) initMap();
        },
        options
      );
    };

    // ถ้า Google Maps โหลดแล้วค่อยเริ่มด้วย geolocation
    if (typeof google === 'object' && typeof google.maps === 'object') {
      if (!map) startWithGeo();
      else google.maps.event.trigger(map, "resize");
    } else {
      // รอสคริปต์โหลดสั้น ๆ แล้วลองอีกครั้ง
      setTimeout(() => {
        if (!map && typeof google === 'object' && typeof google.maps === 'object') {
          startWithGeo();
        }
      }, 300);
    }
  };

  // --- ปุ่มปักหมุดที่ตำแหน่งปัจจุบัน ---
  if (locateMeBtn) {
    locateMeBtn.onclick = function() {
      if (!navigator.geolocation) {
        alert("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง");
        return;
      }
      locateMeBtn.textContent = "กำลังค้นหาตำแหน่ง...";
      locateMeBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (map && marker) {
            map.setCenter(current);
            marker.setPosition(current);
          } else if (typeof google === 'object' && typeof google.maps === 'object') {
            initMap(current);
          }
          locateMeBtn.textContent = "📍 ปักหมุดที่ตำแหน่งปัจจุบัน";
          locateMeBtn.disabled = false;
        },
        (err) => {
          alert("ไม่สามารถระบุตำแหน่งได้: " + err.message);
          locateMeBtn.textContent = "📍 ปักหมุดที่ตำแหน่งปัจจุบัน";
          locateMeBtn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    };
  }

  // --- ปุ่มยืนยันพิกัด ---
  confirmBtn.onclick = function() {
    if (!marker) return;
    const currentPos = marker.getPosition();
    gpsInput.value = `${currentPos.lat().toFixed(6)}, ${currentPos.lng().toFixed(6)}`;
    modal.style.display = "none";
  };

  // --- ปิด modal ---
  closeBtn.onclick = function() {
    modal.style.display = "none";
  };
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  // --- ตัวเลือก "แปลงหมายเลข" ตามดอยที่เลือก ---
  const mountainSelect = document.getElementById('mountain');
  const plotSelect = document.getElementById('plot_number');
  const coffeeTreeSelectInit = document.getElementById('coffee_tree');
  // เริ่มต้นปิดการเลือกต้นกาแฟ จนกว่าจะเลือกแปลง
  if (coffeeTreeSelectInit) {
    coffeeTreeSelectInit.disabled = true;
    coffeeTreeSelectInit.selectedIndex = 0; // ให้โชว์ placeholder
  }

  mountainSelect.addEventListener('change', function() {
    // รีเซ็ต cache ข้อมูลทะเบียนเกษตรกรเมื่อเปลี่ยนดอย
    farmerDataLoaded = false;
    farmerDataCache = null;
    farmerData = {};
    
    // รีเซ็ต options ของแปลง
    if (!this.value) {
      plotSelect.innerHTML = '<option value="" disabled selected>-- โปรดเลือกดอยก่อน --</option>';
      plotSelect.disabled = true;
    } else {
      plotSelect.innerHTML = '<option value="" disabled selected>-- โปรดเลือกแปลง --</option>';
      plotSelect.disabled = false; // เปิดให้เลือกแปลงเมื่อมีดอย
    }
    const selectedMountain = this.value;

    // เมื่อเปลี่ยนดอย ให้รีเซ็ตและปิดการเลือกต้นกาแฟก่อน
    if (coffeeTreeSelectInit) {
      coffeeTreeSelectInit.disabled = true;
      coffeeTreeSelectInit.innerHTML = '<option value="" disabled selected>-- โปรดเลือกดอยและแปลงก่อน --</option>' +
        '<option value="1">1</option>' +
        '<option value="2">2</option>' +
        '<option value="3">3</option>' +
        '<option value="4">4</option>' +
        '<option value="5">5</option>' +
        '<option value="6">6</option>';
    }

    if (selectedMountain === 'ดอยช้าง') {
      for (let i = 1; i <= 50; i++) {
        const option = document.createElement('option');
        option.value = `DC${i}`;
        option.textContent = `DC${i}`;
        plotSelect.appendChild(option);
      }
    } else if (selectedMountain === 'ดอยแม่สลอง') {
      for (let i = 1; i <= 50; i++) {
        const option = document.createElement('option');
        option.value = `MSL${i}`;
        option.textContent = `MSL${i}`;
        plotSelect.appendChild(option);
      }
    }
  });

  // --- Auto-format: เบอร์ปุ๋ยที่ใส่ (เช่น 15-15-15) ---
  const fertInput = document.getElementById('fertilizer_formula');
  if (fertInput) {
    fertInput.addEventListener('input', function() {
      let val = this.value.replace(/[^0-9]/g, ''); // เอาเฉพาะตัวเลข
      if (val.length > 1 && val.length <= 3) {
        val = val.slice(0, 2) + '-' + val.slice(2);
      } else if (val.length > 3 && val.length <= 5) {
        val = val.slice(0, 2) + '-' + val.slice(2, 4) + '-' + val.slice(4);
      } else if (val.length > 5) {
        val = val.slice(0, 2) + '-' + val.slice(2, 4) + '-' + val.slice(4, 6);
      }
      this.value = val;
    });

    // กันพิมพ์เกินรูปแบบ 15-15-15
    fertInput.addEventListener('keypress', function(e) {
      const raw = this.value.replace(/[^0-9]/g, '');
      if (raw.length >= 6 && /[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });

    // วาง (paste) ก็เคลียร์ให้เป็นรูปแบบที่ถูกต้อง
    fertInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      const digits = (text || '').replace(/[^0-9]/g, '').slice(0, 6);
      let val = digits;
      if (val.length > 2 && val.length <= 4) {
        val = val.slice(0, 2) + '-' + val.slice(2);
      } else if (val.length > 4) {
        val = val.slice(0, 2) + '-' + val.slice(2, 4) + '-' + val.slice(4);
      }
      fertInput.value = val;
    });
  }
});

// ---------- Prefill "ทะเบียนเกษตรกร" เมื่อเลือก ดอย + แปลง ----------
function setVal(id, v){ 
  const el = document.getElementById(id);
  if(!el) return;
  
  // ตรวจสอบค่าที่จะกรอก
  let valueToSet = v ?? '';
  
  // ถ้าเป็นตัวเลขและเป็นค่าลบในฟิลด์ที่ไม่ควรติดลบ
  if (typeof v === 'number' && !isNaN(v)) {
    const positiveOnlyFields = ['age', 'coffee_experience', 'planting_area', 'fertilizer_frequency', 
                               'fertilizer_amount', 'yield_per_tree', 'fertilizer_cost', 'labor_cost', 
                               'other_costs', 'coffee_height', 'coffee_circumference'];
    
    if (positiveOnlyFields.includes(id) && v < 0) {
      valueToSet = ''; // ถ้าเป็นค่าลบให้เซ็ตเป็นค่าว่าง
    } else {
      valueToSet = v.toString();
    }
  }
  
  if (el.tagName === 'SELECT') {
    el.value = valueToSet;
  } else {
    el.value = valueToSet;
  }
}

async function prefillFarmerSection() {
  const mountain = document.getElementById('mountain')?.value;
  const plot = document.getElementById('plot_number')?.value;
  const coffeeTree = document.getElementById('coffee_tree')?.value;

  // ถ้ายังเลือกไม่ครบ ล้างทุกฟิลด์และปลดล็อค
  if (!mountain || !plot || !coffeeTree) {
    clearFormFields();
    return;
  }

  // ตรวจสอบว่าต้องซ่อนตามวันที่ไหม (ตั้งแต่กันยายน 2025 เป็นต้นไป)
  const hideByDate = shouldHideFarmerSection();
  
  // ถ้าไม่ใช่ต้นที่ 1 (ซึ่งไม่ได้กรอกทะเบียนเกษตรกร) ให้ล้าง + ปลดล็อค เผื่อสลับกลับมา
  if (coffeeTree !== '1') {
    clearFormFields();
    unlockAllFields();
    return;
  }

  // ต้นที่ 1: ดึงข้อมูลล่าสุด หรือ ลิ้งค์จากข้อมูลเก่า (ถ้าหลัง ก.ย. 2025)
  const fallbackQuery = async () => {
    const fb = await db.collection('soil_tests_new')
      .where('mountain','==', mountain)
      .where('plot_number','==', plot)
      .where('coffee_tree','==', coffeeTree)
      .get();
    const docs = [];
    fb.forEach(d => docs.push({id:d.id, ...d.data()}));
    if (!docs.length) return null;
    docs.sort((a,b)=>{
      const ta = a.createdAt?.seconds ? a.createdAt.seconds*1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tb = b.createdAt?.seconds ? b.createdAt.seconds*1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tb - ta;
    });
    return docs[0];
  };

  try {
    const snap = await db.collection('soil_tests_new')
      .where('mountain','==', mountain)
      .where('plot_number','==', plot)
      .where('coffee_tree','==', coffeeTree)
      .orderBy('createdAt','desc')
      .limit(1)
      .get();

    let data = null;
    if (!snap.empty) data = snap.docs[0].data();
    else data = await fallbackQuery();

    if (!data) {
      // ไม่มีข้อมูลเก่า ให้ปลดล็อคให้กรอกได้
      unlockAllFields();
      return;
    }
    await fillFormFromDoc(data);
  } catch (err) {
    if (err?.code === 'failed-precondition') {
      const data = await fallbackQuery();
      if (data) await fillFormFromDoc(data); else unlockAllFields();
    } else {
      console.warn('prefill error:', err);
      unlockAllFields();
    }
  }
}

async function fillFormFromDoc(d){
  // ตรวจสอบว่าต้องซ่อนตามวันที่ไหม
  const hideByDate = shouldHideFarmerSection();
  
  // ถ้าเป็นหลัง ก.ย. 2025 และข้อมูลปัจจุบันไม่มีทะเบียนเกษตรกร ให้หาจากต้นที่ 1 ข้อมูลเก่า
  if (hideByDate && (!d.farmer_name || !d.age || !d.address)) {
    console.log('🔍 หลัง ก.ย. 2025 และไม่มีทะเบียนเกษตรกร - ค้นหาจากข้อมูลเก่า');
    const mountain = document.getElementById('mountain')?.value;
    const plot = document.getElementById('plot_number')?.value;
    
    if (mountain && plot) {
      try {
        let primarySnap = null;
        try {
          primarySnap = await db.collection('soil_tests_new')
            .where('mountain','==', mountain)
            .where('plot_number','==', plot)
            .where('coffee_tree','==', '1')
            .orderBy('createdAt','desc')
            .get();
        } catch(err) {
          // fallback query
          const fb = await db.collection('soil_tests_new')
            .where('mountain','==', mountain)
            .where('plot_number','==', plot)
            .where('coffee_tree','==', '1')
            .get();
          const docs = [];
          fb.forEach(doc => docs.push({id:doc.id, ...doc.data()}));
          if (docs.length) {
            docs.sort((a,b)=>{
              const ta = a.createdAt?.seconds ? a.createdAt.seconds*1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const tb = b.createdAt?.seconds ? b.createdAt.seconds*1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return tb - ta;
            });
            primarySnap = { empty:false, docs:docs.map(doc => ({data:()=>doc})) };
          }
        }
        
        // หาต้นที่ 1 ที่มีข้อมูลทะเบียนเกษตรกร
        if (primarySnap && !primarySnap.empty) {
          for (const doc of primarySnap.docs) {
            const candidateData = doc.data();
            if (candidateData.farmer_name && candidateData.age && candidateData.address) {
              console.log('✅ พบข้อมูลทะเบียนเกษตรกรจากต้นที่ 1 ข้อมูลเก่า');
              // ผสานข้อมูล
              const farmerKeys = [
                'farmer_name','age','coffee_experience','planting_area','address',
                'water_system','fertilizer_type','fertilizer_formula','fertilizer_frequency',
                'fertilizer_amount','soil_problems','yield_problems','internet_access',
                'yield_per_tree','cupping_experience','fertilizer_cost','labor_cost','other_costs','gps_coordinates'
              ];
              farmerKeys.forEach(key => {
                if (!d[key] && candidateData[key]) {
                  d[key] = candidateData[key];
                }
              });
              break;
            }
          }
        }
      } catch(err) {
        console.warn('ไม่สามารถค้นหาข้อมูลทะเบียนเกษตรกรจากข้อมูลเก่าได้:', err);
      }
    }
  }

  // ฟิลด์ที่จะถูกล็อค (ถ้าไม่ซ่อนตามวันที่)
  const fieldsToLock = hideByDate ? [] : [
    'farmer_name', 'age', 'coffee_experience', 'planting_area', 'address', 
    'gps_coordinates', 'water_system', 'fertilizer_type', 'fertilizer_formula',
    'fertilizer_frequency', 'fertilizer_amount', 'soil_problems', 'yield_problems',
    'internet_access', 'yield_per_tree', 'cupping_experience', 'fertilizer_cost',
    'labor_cost', 'other_costs'
  ];

  setVal('farmer_name', d.farmer_name);
  setVal('age', d.age);
  setVal('coffee_experience', d.coffee_experience);
  setVal('planting_area', d.planting_area);
  setVal('address', d.address);
  setVal('gps_coordinates', d.gps_coordinates);
  setVal('water_system', d.water_system);
  setVal('fertilizer_type', d.fertilizer_type);
  setVal('fertilizer_formula', d.fertilizer_formula);
  setVal('fertilizer_frequency', d.fertilizer_frequency);
  setVal('fertilizer_amount', d.fertilizer_amount);
  setVal('soil_problems', d.soil_problems);
  setVal('yield_problems', d.yield_problems);
  setVal('internet_access', d.internet_access);
  setVal('yield_per_tree', d.yield_per_tree);
  setVal('cupping_experience', d.cupping_experience);
  setVal('fertilizer_cost', d.fertilizer_cost);
  setVal('labor_cost', d.labor_cost);
  setVal('other_costs', d.other_costs);

  // ฟิลด์ผลผลิตเมล็ดกาแฟ (ตั้งแต่ธันวาคม 2025)
  // ไม่ prefill ข้อมูลเหล่านี้เมื่ออยู่ในช่วงที่แสดงส่วนนี้ เพื่อให้ผู้ใช้กรอกข้อมูลใหม่ทุกครั้ง
  const shouldShowBean = shouldShowBeanYieldSection();
  if (!shouldShowBean) {
    // ถ้ายังไม่ถึงเวลาแสดงส่วนนี้ ให้ prefill ตามปกติ
    setVal('fresh_weight', d.fresh_weight);
    setVal('dry_weight', d.dry_weight);
    setVal('bean_quality', d.bean_quality);
  }
  // ถ้าอยู่ในช่วงที่แสดงส่วนนี้แล้ว ไม่ prefill เพื่อให้ผู้ใช้กรอกใหม่

  // ล็อคฟิลด์และเปลี่ยนสี
  fieldsToLock.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.disabled = true;
      element.parentElement.classList.add('locked-field');
    }
  });

  // ซ่อนปุ่มแผนที่เมื่อ GPS ถูกล็อค
  const mapBtn = document.getElementById('mapBtn');
  if (mapBtn) {
    mapBtn.style.display = 'none';
  }
}

function unlockAllFields() {
  const fieldsToUnlock = [
    'farmer_name', 'age', 'coffee_experience', 'planting_area', 'address', 
    'gps_coordinates', 'water_system', 'fertilizer_type', 'fertilizer_formula',
    'fertilizer_frequency', 'fertilizer_amount', 'soil_problems', 'yield_problems',
    'internet_access', 'yield_per_tree', 'cupping_experience', 'fertilizer_cost',
    'labor_cost', 'other_costs'
  ];

  fieldsToUnlock.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.disabled = false;
      element.parentElement.classList.remove('locked-field');
    }
  });
}

function clearFormFields() {
  const fieldsToClear = [
    'farmer_name', 'age', 'coffee_experience', 'planting_area', 'address', 
    'gps_coordinates', 'water_system', 'fertilizer_type', 'fertilizer_formula',
    'fertilizer_frequency', 'fertilizer_amount', 'soil_problems', 'yield_problems',
    'internet_access', 'yield_per_tree', 'cupping_experience', 'fertilizer_cost',
    'labor_cost', 'other_costs'
  ];

  // ล้างค่าและปลดล็อค
  fieldsToClear.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.value = '';
      element.disabled = false;
      element.parentElement.classList.remove('locked-field');
    }
  });

  // แสดงปุ่มแผนที่กลับมาเมื่อล้างฟอร์ม
  const mapBtn = document.getElementById('mapBtn');
  if (mapBtn) {
    mapBtn.style.display = 'inline-block';
  }
}

// hook: ให้ prefill ทำงานแน่นอนหลังผู้ใช้เลือกแปลง
document.addEventListener('DOMContentLoaded', () => {
  // ตั้งแต่กันยายน 2025 เป็นต้นไป ซ่อน/ไม่บังคับกรอกทะเบียนเกษตรกร
  (function handleFarmerSectionByDate(){
    const disableFarmer = shouldHideFarmerSection();
    window.NO_FARMER_SECTION = disableFarmer;
    
    if (!disableFarmer) return; // ก่อนกันยายน 2025 ทำงานปกติ
    
    const section = document.getElementById('farmer_section');
    if (section) {
      section.style.display = 'none';
      // เอา required ออกทุกฟิลด์ภายใน
      section.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
    }
  })();

  const mountainSelect = document.getElementById('mountain');
  const plotSelect = document.getElementById('plot_number');
  const coffeeTreeSelect = document.getElementById('coffee_tree');

  mountainSelect.addEventListener('change', function() {
    clearFormFields(); // ล้างค่าและปลดล็อคเมื่อเปลี่ยนดอย
    // สร้าง options ตามดอย (โค้ดเดิมของคุณทำอยู่แล้ว)
    // หลังสร้างเสร็จ ถ้ามีค่า plot อยู่แล้วก็ลอง prefill อีกครั้ง
    setTimeout(prefillFarmerSection, 0);
  });

  plotSelect.addEventListener('change', prefillFarmerSection);
  coffeeTreeSelect.addEventListener('change', prefillFarmerSection);

  // เปิดให้เลือกต้นกาแฟได้หลังเลือกแปลงแล้ว
  plotSelect.addEventListener('change', function() {
  // รีเซ็ต cache ข้อมูลทะเบียนเกษตรกรเมื่อเปลี่ยนแปลง
  farmerDataLoaded = false;
  farmerDataCache = null;
  farmerData = {};
  
  // ล้างค่าทะเบียนเกษตรกรทุกครั้งที่เปลี่ยนแปลง (ตามคำขอ)
  clearFormFields();
  unlockAllFields();
    if (this.value) {
      coffeeTreeSelect.disabled = false;
      // อัปเดต placeholder ถ้ายังไม่เลือกต้น
      if (!coffeeTreeSelect.value) {
        const firstOpt = coffeeTreeSelect.querySelector('option[disabled]');
        if (firstOpt) firstOpt.textContent = '-- โปรดเลือกต้นกาแฟ --';
      }
    } else {
      coffeeTreeSelect.disabled = true;
      coffeeTreeSelect.selectedIndex = 0;
      const firstOpt = coffeeTreeSelect.querySelector('option[disabled]');
      if (firstOpt) firstOpt.textContent = '-- โปรดเลือกดอยและแปลงก่อน --';
    }
  });
});

// =========================
// �️ แสดง/ซ่อน ทะเบียนเกษตรกร ตามต้นกาแฟ (เฉพาะต้นที่ 1 เท่านั้นที่กรอก)
// =========================
document.addEventListener('DOMContentLoaded', () => {
  const coffeeTreeSelect = document.getElementById('coffee_tree');
  const farmerSection = document.getElementById('farmer_section');
  if (!coffeeTreeSelect || !farmerSection) return;

  // จด element ที่ required เดิมไว้เพื่อคืนค่าได้ภายหลัง
  const farmerRequiredEls = Array.from(farmerSection.querySelectorAll('[required]'));
  
  // เก็บสถานะ required เดิมไว้
  farmerRequiredEls.forEach(el => {
    el.dataset.wasRequired = 'true';
  });

  function toggleFarmerSection(){
    // ตรวจสอบว่าต้องซ่อนตามวันที่ไหม (ใช้ฟังก์ชันเดียวกับที่ซ่อนใน head)
    const hideByDate = shouldHideFarmerSection();
    
    const val = coffeeTreeSelect.value;
    if (hideByDate || (val && val !== '1')) {
      // บันทึกข้อมูลทะเบียนเกษตรกรก่อนซ่อน
      saveFarmerData();
      
      // ถ้าเป็นต้นที่ 2-6 ให้โหลดข้อมูลจากฐานข้อมูล
      if (val && val !== '1') {
        loadFarmerDataFromDatabase().then(success => {
          if (success) {
            console.log('✅ โหลดข้อมูลทะเบียนเกษตรกรสำหรับต้นที่', val, 'เรียบร้อย');
          } else {
            console.log('⚠️ ไม่สามารถโหลดข้อมูลทะเบียนเกษตรกรสำหรับต้นที่', val);
          }
        });
      }
      
      // ซ่อน + ปิดการใช้งาน + เอา required ออก
      if (farmerSection.style.display !== 'none') {
        farmerSection.style.display = 'none';
        farmerRequiredEls.forEach(el => {
          if (el.hasAttribute('required')) el.dataset.wasRequired = 'true';
          el.removeAttribute('required');
          el.disabled = true;
        });
      }
    } else {
      // แสดง + คืน required + เปิดการแก้ไข (เฉพาะก่อนกันยายน 2025 และต้นที่ 1)
      if (farmerSection.style.display === 'none') {
        farmerSection.style.display = '';
        farmerRequiredEls.forEach(el => {
          if (el.dataset.wasRequired) el.setAttribute('required','');
          el.disabled = false;
        });
      }
    }
  }

  coffeeTreeSelect.addEventListener('change', toggleFarmerSection);
  
  // เพิ่ม event listeners สำหรับฟิลด์ทะเบียนเกษตรกรเพื่อบันทึกข้อมูลอัตโนมัติ
  const farmerFields = [
    'farmer_name', 'age', 'coffee_experience', 'planting_area', 'address', 
    'gps_coordinates', 'water_system', 'fertilizer_type', 'fertilizer_formula',
    'fertilizer_frequency', 'fertilizer_amount', 'soil_problems', 'yield_problems',
    'internet_access', 'yield_per_tree', 'cupping_experience', 'fertilizer_cost',
    'labor_cost', 'other_costs'
  ];

  farmerFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', saveFarmerData);
      field.addEventListener('change', saveFarmerData);
    }
  });
  
  // เรียกครั้งแรกเผื่อโหลดมามีค่าอยู่ แต่ไม่บังคับเปลี่ยนถ้าซ่อนอยู่แล้ว
  if (!shouldHideFarmerSection() || farmerSection.style.display !== 'none') {
    toggleFarmerSection();
  }
});

// =========================
// 🔒 ป้องกัน Input Number เปลี่ยนค่าจากลูกกลิ้งเมาส์
// =========================

// ป้องกันการเปลี่ยนค่า input number เมื่อเลื่อนลูกกลิ้งเมาส์
function preventNumberInputScroll() {
  // ไม่ต้องทำอะไรที่นี่ เพราะใช้ Global event listener แทน
  console.log('🔒 preventNumberInputScroll: ใช้ Global event listener แทน');
}

// ป้องกันการใช้ Arrow Keys เปลี่ยนค่า input number
function preventNumberInputArrowKeys() {
  document.addEventListener('keydown', function(e) {
    if (e.target.type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
    }
  });
}

// เรียกใช้ฟังก์ชันเมื่อโหลดหน้าเสร็จ
document.addEventListener('DOMContentLoaded', function() {
  preventNumberInputScroll();
  preventNumberInputArrowKeys();
  console.log('🔒 Form page: ป้องกันลูกกลิ้งเมาส์และ arrow keys สำหรับ input number แล้ว');
});

// =========================
// 🧪 Auto Format Fertilizer Formula
// =========================

function setupFertilizerFormatting() {
  const fertilizerInput = document.getElementById('fertilizer_formula');
  if (!fertilizerInput) return;

  let lastValue = '';

  fertilizerInput.addEventListener('input', function(e) {
    let value = e.target.value;
    
    // เก็บตำแหน่ง cursor
    let cursorPosition = e.target.selectionStart;
    
    // ลบทุกอย่างที่ไม่ใช่ตัวเลข
    let numbersOnly = value.replace(/\D/g, '');
    
    // จำกัดให้มีแค่ 6 หลัก
    if (numbersOnly.length > 6) {
      numbersOnly = numbersOnly.substring(0, 6);
    }
    
    // จัดรูปแบบเป็น xx-xx-xx
    let formattedValue = '';
    if (numbersOnly.length > 0) {
      if (numbersOnly.length <= 2) {
        formattedValue = numbersOnly;
      } else if (numbersOnly.length <= 4) {
        formattedValue = numbersOnly.substring(0, 2) + '-' + numbersOnly.substring(2);
      } else {
        formattedValue = numbersOnly.substring(0, 2) + '-' + 
                        numbersOnly.substring(2, 4) + '-' + 
                        numbersOnly.substring(4);
      }
    }
    
    // อัปเดตค่าใน input
    e.target.value = formattedValue;
    
    // ปรับตำแหน่ง cursor
    if (formattedValue.length > lastValue.length) {
      // กำลังพิมพ์เพิ่ม
      let newCursorPosition = cursorPosition;
      if (cursorPosition === 3 || cursorPosition === 6) {
        newCursorPosition = cursorPosition + 1;
      }
      e.target.setSelectionRange(newCursorPosition, newCursorPosition);
    }
    
    lastValue = formattedValue;
  });

  // จัดการ backspace เพื่อลบได้ง่ายขึ้น
  fertilizerInput.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace') {
      let cursorPosition = e.target.selectionStart;
      let value = e.target.value;
      
      // ถ้า cursor อยู่หลัง - ให้ลบ - และตัวเลขด้วยกัน
      if (cursorPosition > 0 && value[cursorPosition - 1] === '-') {
        e.preventDefault();
        let newValue = value.substring(0, cursorPosition - 2) + value.substring(cursorPosition);
        e.target.value = newValue;
        e.target.setSelectionRange(cursorPosition - 2, cursorPosition - 2);
        
        // trigger input event เพื่อให้จัดรูปแบบใหม่
        e.target.dispatchEvent(new Event('input'));
      }
    }
  });

  // ตรวจสอบความถูกต้องก่อนส่งฟอร์ม
  const form = document.getElementById('soilForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      const fertilizerValue = fertilizerInput.value;
      const numbersOnly = fertilizerValue.replace(/\D/g, '');
      
      if (fertilizerValue && numbersOnly.length !== 6) {
        e.preventDefault();
        alert('กรุณากรอกเบอร์ปุ๋ยให้ครบ 6 หลัก เช่น 15-15-15');
        fertilizerInput.focus();
        return false;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', setupFertilizerFormatting);
document.addEventListener('DOMContentLoaded', window.refreshFarmerSectionStatus);
document.addEventListener('DOMContentLoaded', window.refreshBeanYieldSectionStatus);
document.addEventListener('DOMContentLoaded', () => initNavbar('form'));

// =========================
// 🔒 Global Event Listeners สำหรับป้องกัน Input Number
// =========================

// ป้องกันการเปลี่ยนค่า input[type="number"] แบบ Global
document.addEventListener('wheel', function(e) {
  if (e.target.type === 'number') {
    // ป้องกันการเปลี่ยนค่าเฉพาะ input แต่ให้เลื่อนหน้าจอได้
    e.preventDefault();
    
    // ให้หน้าจอเลื่อนได้ปกติ
    window.scrollBy(0, e.deltaY);
  }
}, { passive: false });

// ป้องกันการใช้ Arrow Keys แบบ Global
document.addEventListener('keydown', function(e) {
  if (e.target.type === 'number' && 
      (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
      document.activeElement === e.target) {
    e.preventDefault();
  }
});

console.log('🔒 Form page: Global protection for input[type="number"] initialized');
