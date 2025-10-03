// ---------- Firebase ----------
const firebaseConfig = {
  apiKey: "AIzaSyCad3vMEdmWQUcUDJA6BHYD6AZruzgqom4",
  authDomain: "testdirt-58ba4.firebaseapp.com",
  projectId: "testdirt-58ba4",
  storageBucket: "testdirt-58ba4.firebasestorage.app",
  messagingSenderId: "89792009820",
  appId: "1:89792009820:web:86ff41e9d3211f00997899"
};

// --- Cloudinary (ใช้เหมือนหน้า form) ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfix1lo9q/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "soil_test_uploads";

if (firebase.apps?.length === 0) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const COLLECTION = "soil_tests_new";

// ฟังก์ชันตรวจสอบวันที่สำหรับการซ่อนทะเบียนเกษตรกร (คัดลอกมาจาก script.js)
function shouldHideFarmerSection(recordDate = null) {
  // ถ้าไม่ส่งวันที่มา ใช้วันที่ปัจจุบัน
  const now = recordDate || new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // ตั้งแต่ 1 พฤศจิกายน 2025 เป็นต้นไป
  return (year > 2025) || (year === 2025 && month >= 11);
}

// ฟังก์ชันตรวจสอบวันที่สำหรับการแสดงผลผลิตเมล็ดกาแฟ
function shouldShowBeanYieldSection(recordDate = null) {
  return true; // แสดงส่วนผลผลิตเมล็ดกาแฟตลอดเวลา
}

// ฟังก์ชันตรวจสอบว่าบันทึกนี้ไม่มีข้อมูลทะเบียนเกษตรกรเพราะอยู่ในช่วงที่ไม่บังคับ
function recordMissingFarmerDataDueToDate(data) {
  if (!data.createdAt) {
    console.log('❌ ไม่มี createdAt:', data);
    return false;
  }
  
  // แปลง Firebase Timestamp เป็น Date
  const recordDate = data.createdAt.seconds ? 
    new Date(data.createdAt.seconds * 1000) : 
    new Date(data.createdAt);
  
  // ตรวจสอบว่าบันทึกนี้อยู่ในช่วงที่ไม่บังคับกรอกทะเบียนเกษตรกรหรือไม่
  const hideFarmer = shouldHideFarmerSection(recordDate);
  
  // ตรวจสอบว่าไม่มีข้อมูลทะเบียนเกษตรกรสำคัญ
  const missingFarmerData = !data.farmer_name || !data.age || !data.address;
  
  console.log('🔍 ตรวจสอบลิ้งค์ทะเบียนเกษตรกร:');
  console.log('  📅 วันที่บันทึก:', recordDate.toLocaleDateString('th-TH'));
  console.log('  🚫 ซ่อนทะเบียนตามวันที่:', hideFarmer);
  console.log('  📝 ขาดข้อมูลเกษตรกร:', missingFarmerData, {
    farmer_name: !!data.farmer_name,
    age: !!data.age,
    address: !!data.address
  });
  console.log('  🎯 ต้องลิ้งค์:', hideFarmer && missingFarmerData);
  
  return hideFarmer && missingFarmerData;
}

const FIELDS = [
  // label, key, type, options (ถ้ามี)
  ["ชื่อ นามสกุล","farmer_name","text"],
  ["ดอย","mountain","select",["ดอยช้าง","ดอยแม่สลอง"]],
  ["แปลงหมายเลข","plot_number","text"],
  ["ต้นกาแฟที่","coffee_tree","select",["1","2","3","4","5","6"]],
  ["พิกัด GPS","gps_coordinates","text"],

  ["อายุ (ปี)","age","number"],
  ["ประสบการณ์ปลูกกาแฟ (ปี)","coffee_experience","number"],
  ["พื้นที่เพาะปลูก (ไร่)","planting_area","number"],
  ["ที่อยู่","address","textarea"],

  ["ระบบน้ำ","water_system","select",["น้ำฝน","น้ำบาดาล","บ่อน้ำธรรมชาติ","อื่นๆ"]],
  ["ชนิดปุ๋ย","fertilizer_type","select",["ปุ๋ยเคมี","ปุ๋ยอินทรีย์","ปุ๋ยคอกปุ๋ยหมัก","ไม่ได้ใส่ปุ๋ย"]],
  ["สูตรปุ๋ย","fertilizer_formula","text"],
  ["ความถี่ใส่ปุ๋ย/ปี (ครั้ง)","fertilizer_frequency","number"],
  ["ใส่ปุ๋ย/ครั้ง/ต้น (kg)","fertilizer_amount","number"],

  ["ปัญหาดิน","soil_problems","textarea"],
  ["ปัญหาผลผลิต","yield_problems","textarea"],
  ["สัญญาณเน็ต","internet_access","select",["มีสัญญาณอินเตอร์เน็ต","ไม่มีสัญญาณอินเตอร์เน็ต"]],
  ["ผลผลิตต่อต้น (kg)","yield_per_tree","number"],
  ["เคยส่งประกวด","cupping_experience","select",["เคยประกวด","ไม่เคยประกวด"]],

  ["ต้นทุนปุ๋ย/ไร่/ปี (บาท)","fertilizer_cost","number"],
  ["ค่าแรง/ไร่/ปี (บาท)","labor_cost","number"],
  ["ค่าใช้จ่ายอื่น/ไร่/ปี (บาท)","other_costs","number"],

  ["N (mg/kg)","n_portable","number"],
  ["P (mg/kg)","p_portable","number"],
  ["K (mg/kg)","k_portable","number"],
  ["OM (% w/w)","om_portable","number"],
  ["pH","ph_portable","number"],
  ["EC (mS/cm)","ec_portable","number"],
  ["Moisture (%)","moisture_portable","number"],
  ["Temp (°C)","temp_portable","number"],

  ["ความสูงต้น (ซม)","coffee_height","number"],
  ["เส้นรอบวงที่ 15 ซม (ซม)","coffee_circumference","number"],
  ["การออกดอก","flowering","select",["มีปกติ","มีน้อยกว่าปกติ","มีมากกว่าปกติ","ไม่มีเลย"]],
  ["การออกผล","fruiting","select",["มีปกติ","มีน้อยกว่าปกติ","มีมากกว่าปกติ","ไม่มีเลย"]],
  ["ปัญหาโรคพืช","disease_problem","select",["มีปกติ","มีน้อยกว่าปกติ","มีมากกว่าปกติ","ไม่มีเลย"]],
  ["ปัญหาแมลง","insect_problem","select",["มีปกติ","มีน้อยกว่าปกติ","มีมากกว่าปกติ","ไม่มีเลย"]],
  ["ปัญหาหนอน","worm_problem","select",["มีปกติ","มีน้อยกว่าปกติ","มีมากกว่าปกติ","ไม่มีเลย"]],

  // ผลผลิตเมล็ดกาแฟ (ตั้งแต่ธันวาคม 2025)
  ["น้ำหนักผลสด (กรัม)","fresh_weight","number"],
  ["น้ำหนักผลแห้ง (กะลา) (กรัม)","dry_weight","number"],
  ["คุณภาพเมล็ด","bean_quality","select",["1","2","3","4","5","6","7","8","9","10"]],
];

// แปลง FIELDS เป็น map
const FIELD_META = Object.fromEntries(
  FIELDS.map(([label,key,type,opts]) => [key,{label,type,opts}])
);

// โซน (เหมือน form.html)
const SECTIONS = [
  { title:'ข้อมูลแปลง', keys:['mountain','plot_number','coffee_tree','gps_coordinates'] },
  { title:'ทะเบียนเกษตรกร', keys:[
      'farmer_name','age','coffee_experience','planting_area','address',
      'water_system','fertilizer_type','fertilizer_formula','fertilizer_frequency',
      'fertilizer_amount','soil_problems','yield_problems','internet_access',
      'yield_per_tree','cupping_experience','fertilizer_cost','labor_cost','other_costs'
  ]},
  { title:'วัดค่าดิน ด้วยเครื่องวัดดินแบบพกพา', keys:[
      'n_portable','ph_portable','p_portable','om_portable',
      'k_portable','moisture_portable','ec_portable','temp_portable'
  ]},
  { title:'ติดตามการเจริญเติบโตต้นกาแฟ', keys:[
      'coffee_height','coffee_circumference','flowering','fruiting',
      'disease_problem','insect_problem','worm_problem'
  ]},
  { title:'ผลผลิตเมล็ดกาแฟ', keys:[
      'fresh_weight','dry_weight','bean_quality'
  ]}
];

function toDateSafe(v){ if(!v) return null; if(v instanceof Date) return v; if(v.seconds) return new Date(v.seconds*1000); return new Date(v); }
function show(v){ return (v===undefined||v===null||v==='')?'-':v; }
function getIdFromURL(){ return new URLSearchParams(location.search).get('id'); }

// Normalize files field to array
function normalizeFiles(v){
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string') return v ? [v] : [];
  return [];
}

// เก็บไฟล์ใหม่ที่ผู้ใช้เลือกในโหมดแก้ไข (สะสมข้ามการเลือกหลายครั้ง)
const newSelectedFiles = [];
const newSelectedKeys = new Set();
function addNewFiles(list){
  Array.from(list || []).forEach(f => {
    if (!/\.(jpe?g|png)$/i.test(f.name)) return;
    const key = `${f.name}|${f.size}|${f.lastModified}`;
    if (!newSelectedKeys.has(key)){
      newSelectedKeys.add(key);
      newSelectedFiles.push(f);
    }
  });
}

function buildFieldHTML(label,key,type,value,options,editing){
  const safeVal = value ?? '';
  const dataAttr = `data-key="${key}" data-type="${type}"`;

  // 1) ล็อกไม่ให้แก้ "ดอย", "แปลงหมายเลข", และ "ต้นกาแฟ" ในโหมดแก้ไข
  const lockedKeys = new Set(['mountain','plot_number','coffee_tree']);
  if (editing && lockedKeys.has(key)) {
    return `<div class="info-item locked-field" ${dataAttr}>
      <span class="info-label">${label}</span>
      <span class="info-value">${show(safeVal)}</span>
    </div>`;
  }

  // 2) ฟิลด์ GPS: ถ้าแก้ไข ให้มีปุ่ม "เลือกจากแผนที่"
  if (key === 'gps_coordinates') {
    if (!editing) {
      return `<div class="info-item" ${dataAttr}>
        <span class="info-label">${label}</span>
        <span class="info-value">${show(safeVal)}</span>
      </div>`;
    }
    return `<div class="info-item" ${dataAttr}>
      <span class="info-label">${label}</span>
      <span class="info-input">
        <div class="gps-input-group">
          <input type="text" value="${safeVal}" placeholder="คลิกปุ่มเพื่อเลือกจากแผนที่">
          <button type="button" id="mapBtn">เลือกจากแผนที่</button>
        </div>
      </span>
    </div>`;
  }

  // โหมดดูปกติ
  if(!editing){
    return `<div class="info-item" ${dataAttr}>
      <span class="info-label">${label}</span>
      <span class="info-value">${show(safeVal)}</span>
    </div>`;
  }

  // ชนิด textarea/select/input ปกติในโหมดแก้ไข
  if(type==='textarea'){
    return `<div class="info-item" ${dataAttr}>
      <span class="info-label">${label}</span>
      <span class="info-input"><textarea>${safeVal}</textarea></span>
    </div>`;
  }
  if(type==='select'){
    const opts = (options||[]).map(o=>`<option value="${o}" ${o===safeVal?'selected':''}>${o}</option>`).join('');
    return `<div class="info-item" ${dataAttr}>
      <span class="info-label">${label}</span>
      <span class="info-input"><select>${opts}</select></span>
    </div>`;
  }
  const inputType = type==='number' ? 'number' : 'text';
  const inputStyle = type==='number' ? ' style="-webkit-appearance: textfield; -moz-appearance: textfield; appearance: textfield;"' : '';
  const inputClass = type==='number' ? ' class="no-spinner"' : '';
  return `<div class="info-item" ${dataAttr}>
    <span class="info-label">${label}</span>
    <span class="info-input"><input type="${inputType}" value="${safeVal}"${inputStyle}${inputClass}></span>
  </div>`;
}


function buildPortableTable(editing,d){
  const keys = [
    'n_portable','ph_portable','p_portable','om_portable',
    'k_portable','moisture_portable','ec_portable','temp_portable'
  ];
  const labels = {
    n_portable:'N (mg/kg)', ph_portable:'pH', p_portable:'P (mg/kg)', om_portable:'OM (% w/w)',
    k_portable:'K (mg/kg)', moisture_portable:'Moisture (%)', ec_portable:'EC (mS/cm)', temp_portable:'Temp (°C)'
  };
  // ลำดับสำหรับ responsive (1 column): N P K EC pH OM Moisture Temp
  const responsiveOrder = {
    'n_portable': 1, 'p_portable': 2, 'k_portable': 3, 'ec_portable': 4,
    'ph_portable': 5, 'om_portable': 6, 'moisture_portable': 7, 'temp_portable': 8
  };
  
  const cells = keys.map(key=>{
    const val = d[key] ?? '';
    const order = responsiveOrder[key];
    if(editing){
      return `<div class="kv-cell" data-key="${key}" data-type="number" data-order="${order}">
        <span class="kv-label">${labels[key]}</span>
        <input type="number" value="${val}" class="no-spinner" style="-webkit-appearance: textfield; -moz-appearance: textfield; appearance: textfield;">
      </div>`;
    }
    return `<div class="kv-cell" data-order="${order}">
      <span class="kv-label">${labels[key]}</span>
      <span class="kv-value">${show(val)}</span>
    </div>`;
  }).join('');
  return `<div class="kv-table">${cells}</div>`;
}

function buildImagesHTML(files, editing = false){
  const fileArr = normalizeFiles(files);
  if(fileArr.length===0){
    return `<div class="images-section"><div class="no-images">ไม่มีรูปภาพ</div></div>`;
  }
  const imgs = fileArr.filter(u=>/\.(png|jpg|jpeg)$/i.test(u))
    .map((url, index) => {
      const deleteBtn = editing ? `<button class="image-delete-btn" onclick="deleteImage(${index})" title="ลบรูปนี้"></button>` : '';
      return `<div class="image-item">
        ${deleteBtn}
        <img src="${url}" alt="ไฟล์แนบ" onclick="window.open('${url}','_blank')">
      </div>`;
    }).join('');
  return `<div class="images-section"><div class="images-grid">${imgs}</div></div>`;
}

const state = { docId:null, data:null };

async function displayDetailData(){
  const container = document.getElementById('detail-container');
  const docId = getIdFromURL();
  state.docId = docId;

  if(!docId){ container.innerHTML = '<p class="loading">ไม่พบข้อมูลที่ต้องการ</p>'; return; }
  container.innerHTML = '<p class="loading">กำลังโหลดข้อมูล...</p>';

  const doc = await db.collection(COLLECTION).doc(docId).get();
  if(!doc.exists){ container.innerHTML = '<p class="loading">ไม่พบข้อมูลที่ต้องการ</p>'; return; }
  state.data = doc.data();
  // Ensure files is always an array
  state.data.files = normalizeFiles(state.data.files);

  // ถ้าเป็นต้นที่ 2-6 หรือเป็นบันทึกที่ไม่มีข้อมูลทะเบียนเกษตรกรเพราะอยู่ในช่วงไม่บังคับ
  // ให้ดึงข้อมูลทะเบียนเกษตรกรจากต้นที่ 1 ของแปลงเดียวกัน (ถ้ามี) เพื่อเติม
  try {
    const ct = state.data.coffee_tree;
    const isTree2to6 = ct && ct !== '1';
    
    // สำหรับต้นที่ 1: ตรวจสอบว่าอยู่ในช่วงไม่บังคับและไม่มีข้อมูลทะเบียนเกษตรกร
    const isTree1NeedingLink = (ct === '1') && recordMissingFarmerDataDueToDate(state.data);
    
    // ต้นที่ 2-6 ลิ้งค์เสมอ หรือ ต้นที่ 1 ที่ต้องการลิ้งค์
    const needsFarmerMerge = isTree2to6 || isTree1NeedingLink;
    
    console.log('🌳 ข้อมูลต้นกาแฟ:', ct);
    console.log('🔗 ตรวจสอบการลิ้งค์:', {
      isTree2to6,
      isTree1NeedingLink,
      needsFarmerMerge,
      reason: isTree2to6 ? 'ต้นที่ 2-6 (ลิ้งค์เสมอ)' : 
              isTree1NeedingLink ? 'ต้นที่ 1 หลัง 1 ก.ย. ไม่มีทะเบียนเกษตรกร' : 
              'ไม่ต้องลิ้งค์'
    });
    
    if (needsFarmerMerge) {
      const mountain = state.data.mountain;
      const plot = state.data.plot_number;
      console.log('🏔️ ค้นหาข้อมูลต้นที่ 1 ของ:', { mountain, plot });
      
      if (mountain && plot) {
        let primarySnap = null;
        try {
          // ค้นหาต้นที่ 1 ของแปลงเดียวกันที่มีข้อมูลทะเบียนเกษตรกร
          primarySnap = await db.collection(COLLECTION)
            .where('mountain','==', mountain)
            .where('plot_number','==', plot)
            .where('coffee_tree','==', '1')
            .orderBy('createdAt','desc')
            .get();
        } catch(err){
          console.log('⚠️ fallback query (ไม่ใช้ orderBy)');
          // fallback ไม่ใช้ orderBy
          const fb = await db.collection(COLLECTION)
            .where('mountain','==', mountain)
            .where('plot_number','==', plot)
            .where('coffee_tree','==', '1')
            .get();
          const docs = [];
          fb.forEach(d => docs.push({id:d.id,...d.data()}));
          if(docs.length){
            docs.sort((a,b)=>{
              const ta = a.createdAt?.seconds ? a.createdAt.seconds*1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const tb = b.createdAt?.seconds ? b.createdAt.seconds*1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return tb - ta;
            });
            primarySnap = { empty:false, docs:docs.map(d => ({data:()=>d})) };
          }
        }
        
        console.log('📋 ผลการค้นหาต้นที่ 1:', primarySnap?.empty ? 'ไม่พบ' : `พบ ${primarySnap.docs?.length || 0} รายการ`);
        
        // หาต้นที่ 1 ที่มีข้อมูลทะเบียนเกษตรกร
        let foundBaseData = null;
        if (primarySnap && !primarySnap.empty) {
          for (const doc of primarySnap.docs) {
            const candidateData = doc.data();
            // ตรวจสอบว่ามีข้อมูลทะเบียนเกษตรกรหรือไม่
            if (candidateData.farmer_name && candidateData.age && candidateData.address) {
              foundBaseData = candidateData;
              console.log('✅ พบต้นที่ 1 ที่มีข้อมูลทะเบียนเกษตรกร');
              break;
            }
          }
          
          if (!foundBaseData) {
            console.log('❌ ไม่พบต้นที่ 1 ที่มีข้อมูลทะเบียนเกษตรกรครบถ้วน');
          }
        }
        
        if (foundBaseData) {
          console.log('📊 ข้อมูลต้นที่ 1:', {
            farmer_name: foundBaseData.farmer_name,
            age: foundBaseData.age,
            address: foundBaseData.address
          });
          
          const farmerKeys = [
            'farmer_name','age','coffee_experience','planting_area','address',
            'water_system','fertilizer_type','fertilizer_formula','fertilizer_frequency',
            'fertilizer_amount','soil_problems','yield_problems','internet_access',
            'yield_per_tree','cupping_experience','fertilizer_cost','labor_cost','other_costs','gps_coordinates'
          ];
          
          let mergedCount = 0;
          farmerKeys.forEach(k=>{
            const val = state.data[k];
            if (val===undefined || val===null || val==='') {
              if (foundBaseData[k] !== undefined && foundBaseData[k] !== null && foundBaseData[k] !== '') {
                state.data[k] = foundBaseData[k];
                mergedCount++;
              }
            }
          });
          
          console.log(`✅ ลิ้งค์สำเร็จ: ${mergedCount} ฟิลด์`);
          
          // แสดงข้อความแจ้งเตือนว่าลิ้งค์ข้อมูลมาจากไหน
          if (isTree2to6) {
            console.log('🔗 ลิ้งค์ข้อมูลทะเบียนเกษตรกรจากต้นที่ 1 (ต้น 2-6)');
          } else if (isTree1NeedingLink) {
            console.log('🔗 ลิ้งค์ข้อมูลทะเบียนเกษตรกรจากต้นที่ 1 (บันทึกนี้อยู่ในช่วงไม่บังคับกรอกทะเบียน)');
          }
        } else {
          console.log('❌ ไม่พบข้อมูลต้นที่ 1 ที่มีข้อมูลทะเบียนเกษตรกรในแปลงและดอยเดียวกัน');
        }
      }
    }
  } catch(mergeErr){
    console.warn('merge farmer data from tree 1 failed:', mergeErr);
  }

  render(false);
}

// ฟังก์ชันรีเฟรชข้อมูลจากฐานข้อมูล
async function refreshData(){
  if(!state.docId) return false;
  
  try {
    const doc = await db.collection(COLLECTION).doc(state.docId).get();
    if(doc.exists) {
      state.data = doc.data();
      return true;
    }
    return false;
  } catch(error) {
    console.error('Error refreshing data:', error);
    return false;
  }
}

function render(editing){
  const container = document.getElementById('detail-container');
  const d = state.data;
  
  // ตรวจสอบข้อมูลผลผลิตเมล็ดกาแฟ
  console.log('🌾 ข้อมูลผลผลิตเมล็ดกาแฟ:', {
    fresh_weight: d.fresh_weight,
    dry_weight: d.dry_weight, 
    bean_quality: d.bean_quality
  });

  const createdAt = toDateSafe(d.createdAt);
  const createdText = createdAt
    ? createdAt.toLocaleString('th-TH',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})
    : '-';

  const headerTitle = [d.mountain, d.plot_number, d.coffee_tree ? `ต้นที่ ${d.coffee_tree}` : ''].filter(Boolean).join(' - ') || '(ไม่ระบุข้อมูล)';

  // helper: สร้าง info-item จาก key
  const buildItemByKey = (key)=> {
    const meta = FIELD_META[key]; if(!meta) return '';
    return buildFieldHTML(meta.label,key,meta.type,d[key],meta.opts,editing);
  };

  // Row "บันทึกเมื่อ"
  const createdRow = `<div class="info-item ${editing ? 'locked-field' : ''}">
    <span class="info-label">บันทึกเมื่อ</span>
    <span class="info-value">${createdText}</span>
  </div>`;

  // Sections
  const sectionsHTML = SECTIONS.map((sec, idx)=>{
    // ตรวจสอบว่าควรแสดงโซนผลผลิตเมล็ดกาแฟหรือไม่ (ใช้วันที่บันทึกข้อมูล)
    if (sec.title === 'ผลผลิตเมล็ดกาแฟ') {
      const showBeanYield = shouldShowBeanYieldSection(createdAt);
      console.log('🌾 การแสดงผลผลิตเมล็ดกาแฟ (ตามวันที่บันทึก):', showBeanYield, 'createdAt:', createdAt);
      if (!showBeanYield) {
        return ''; // ไม่แสดงโซนนี้ถ้าบันทึกก่อนเดือนธันวาคม 2025
      }
    }
    
    let bodyHTML = '';
    if (sec.title === 'วัดค่าดิน ด้วยเครื่องวัดดินแบบพกพา') {
      bodyHTML = buildPortableTable(editing, d);
    } else {
      const rows = (idx===0 ? [createdRow] : []).concat(sec.keys.map(buildItemByKey)).join('');
      bodyHTML = rows;
    }
    return `
      <section class="detail-section">
        <h3 class="section-title">${sec.title}</h3>
        <div class="section-body">${bodyHTML}</div>
      </section>
    `;
  }).filter(Boolean).join(''); // filter(Boolean) เพื่อลบ empty string ออก

  // Images section (มีช่องเพิ่มรูปในโหมดแก้ไข)
  const existingImgs = buildImagesHTML(d.files, editing);
  const addImagesHTML = editing ? `
    <div class="add-images">
      <div class="add-images-header">
        <span class="add-images-title">เพิ่มรูปภาพใหม่</span>
        <button type="button" id="addNewFileBtn" class="btn-add-file">+ เพิ่มไฟล์</button>
      </div>
      <div id="newFileInputs" class="file-inputs-container">
        <div class="no-files-message">กดปุ่ม "+ เพิ่มไฟล์" เพื่อเพิ่มรูปภาพใหม่</div>
      </div>
      <div id="newPreview" class="images-grid"></div>
      <small class="hint">รูปใหม่จะถูกอัปโหลดเมื่อกด "ยืนยันการแก้ไข"</small>
    </div>
  ` : '';

  const imagesSectionHTML = `
    <section class="detail-section images">
      <h3 class="section-title">รูปภาพประกอบ</h3>
      <div class="section-body">
        ${existingImgs}
        ${addImagesHTML}
      </div>
    </section>
  `;

  container.innerHTML = `
    <div class="detail-card">
      <div class="card-header">
        <span id="headerTitle">${headerTitle}</span>

        <div class="header-actions" ${editing ? 'style="display: none;"' : ''}>
          <button id="editToggle" class="btn-edit" aria-label="แก้ไข">แก้ไขข้อมูล</button>
        </div>
      </div>

      <div class="card-body">
        ${sectionsHTML}
        ${imagesSectionHTML}
      </div>
      <div id="editControls" class="edit-controls" ${editing ? '' : 'hidden'}>
        <button id="saveBtn" class="btn-confirm">ยืนยันการแก้ไข</button>
        <button id="cancelBtn" class="btn-secondary">ยกเลิก</button>
      </div>
    </div>
  `;

  // delete section - ซ่อนในโหมดแก้ไข
  const deleteSection = document.querySelector('.delete-section');
  if(deleteSection){
    deleteSection.style.display = editing ? 'none' : 'block';
  }
  const deleteBtn = document.getElementById('deleteBtn');
  if(deleteBtn){
    deleteBtn.style.display = editing ? 'none' : 'inline-block';
    deleteBtn.textContent = "ลบข้อมูลนี้";
    deleteBtn.onclick = onDelete;
  }

  // bind edit buttons
  document.getElementById('editToggle').onclick = ()=> render(true);
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  if(saveBtn) saveBtn.onclick = onSave;
  if(cancelBtn) cancelBtn.onclick = async ()=> {
    // แสดง loading state
    const originalText = cancelBtn.textContent;
    cancelBtn.disabled = true;
    cancelBtn.textContent = 'กำลังโหลด...';
    
    try {
      // ใช้ฟังก์ชัน refreshData ที่เพิ่งสร้าง
      const refreshed = await refreshData();
      if(refreshed) {
        render(false);
        console.log('ข้อมูลถูกรีเฟรชจากฐานข้อมูลแล้ว');
      } else {
        alert('ไม่พบข้อมูลที่ต้องการ');
        window.location.href = 'home.html';
      }
    } catch(error) {
      console.error('Error during cancel operation:', error);
      alert('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
      render(false); // fallback to cached data
    } finally {
      // คืนสถานะปุ่มเป็นปกติ
      cancelBtn.disabled = false;
      cancelBtn.textContent = originalText;
    }
  };

  // auto-format สูตรปุ๋ยตอนแก้ไข
  if(editing){
    const fertItem = container.querySelector('.info-item[data-key="fertilizer_formula"]');
    if (fertItem){
      const input = fertItem.querySelector('input');
      input.addEventListener('input', function(){
        let val = this.value.replace(/[^0-9]/g,'').slice(0,6);
        if (val.length > 2 && val.length <= 4) val = val.slice(0,2)+'-'+val.slice(2);
        else if (val.length > 4) val = val.slice(0,2)+'-'+val.slice(2,4)+'-'+val.slice(4);
        this.value = val;
      });
    }
    // === แผนที่ตอนแก้ไข GPS ===
const mapBtn = document.getElementById('mapBtn');
if (mapBtn) {
  const modal = document.getElementById('mapModal');
  const closeBtn = document.querySelector('#mapModal .close-btn');
  const confirmBtn = document.getElementById('confirmLocationBtn');
  const locateMeBtn = document.getElementById('locateMeBtn');
  const gpsInput = container.querySelector('.info-item[data-key="gps_coordinates"] input');

  // เปิด modal + init แผนที่ (อ่านค่าที่มีอยู่ก่อน)
  mapBtn.onclick = () => {
    modal.style.display = 'block';
    const start = parseLatLngFromInput(gpsInput?.value) || defaultDetailPosition;
    initDetailMap(start);
  };
  closeBtn.onclick = () => modal.style.display = 'none';
  window.onclick = (e)=> { if(e.target===modal) modal.style.display='none'; };

  // ปักหมุดที่ตำแหน่งปัจจุบัน
  if (locateMeBtn) {
    locateMeBtn.onclick = () => {
      locateMeBtn.disabled = true;
      locateMeBtn.textContent = 'กำลังค้นหาตำแหน่ง...';
      if (!navigator.geolocation) {
        alert('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง'); 
        locateMeBtn.disabled = false; locateMeBtn.textContent = '📍 ปักหมุดที่ตำแหน่งปัจจุบัน';
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (detailMap && detailMarker) {
            detailMap.setCenter(p);
            detailMarker.setPosition(p);
          } else {
            initDetailMap(p);
          }
          locateMeBtn.disabled = false;
          locateMeBtn.textContent = '📍 ปักหมุดที่ตำแหน่งปัจจุบัน';
        },
        err => {
          alert('ไม่สามารถระบุตำแหน่งได้: ' + err.message);
          locateMeBtn.disabled = false;
          locateMeBtn.textContent = '📍 ปักหมุดที่ตำแหน่งปัจจุบัน';
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    };
  }

  // ยืนยันพิกัด -> ใส่ลง input
  confirmBtn.onclick = () => {
    if (!detailMarker) return;
    const pos = detailMarker.getPosition();
    gpsInput.value = `${pos.lat().toFixed(6)}, ${pos.lng().toFixed(6)}`;
    modal.style.display = 'none';
  };
}

    // ระบบเพิ่มไฟล์หลายครั้งแบบเดียวกับหน้า form
    const addFileBtn = document.getElementById('addNewFileBtn');
    const fileInputsContainer = document.getElementById('newFileInputs');
    const preview = document.getElementById('newPreview');
    
    if(addFileBtn && fileInputsContainer){
      // ฟังก์ชันสร้าง file input ใหม่
      const createNewFileInput = () => {
        const row = document.createElement("div");
        row.classList.add("file-row");

        const input = document.createElement("input");
        input.type = "file";
        input.name = "newMediaFiles[]";
        input.accept = ".jpg,.jpeg,.png";
        input.multiple = true;
        input.classList.add("new-file-input");

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.textContent = "ลบ";
        removeBtn.classList.add("remove-btn");
        removeBtn.addEventListener("click", () => {
          row.remove();
          // ไม่ลบไฟล์ที่สะสมไว้ เพื่อกันหายโดยไม่ตั้งใจ
          const remainingInputs = fileInputsContainer.querySelectorAll('.file-row');
          if (remainingInputs.length === 0) {
            const noFilesMessage = fileInputsContainer.querySelector('.no-files-message');
            if (noFilesMessage) noFilesMessage.style.display = 'block';
          }
        });

        // เมื่อเลือกไฟล์: สะสม + อัปเดตพรีวิวจากอาร์เรย์ + เคลียร์ input เพื่อเลือกซ้ำได้
        input.addEventListener("change", () => {
          addNewFiles(input.files);
          updateNewPreviewFromArray();
          input.value = '';
        });

        row.appendChild(input);
        row.appendChild(removeBtn);
        return row;
      };

      addFileBtn.addEventListener('click', () => {
        const noFilesMessage = fileInputsContainer.querySelector('.no-files-message');
        if (noFilesMessage) noFilesMessage.style.display = 'none';
        fileInputsContainer.appendChild(createNewFileInput());
      });
    }

    // เรียกครั้งแรกเพื่อให้พรีวิวตรงกับสถานะสะสม (ว่าง)
    updateNewPreviewFromArray();

    // ไม่เพิ่ม input แรกทันที ให้รอกดปุ่มก่อน
  }
  
  // *** เพิ่มการป้องกันลูกกลิ้งเมาส์ในโหมดแก้ไข ***
  if (editing) {
    preventDetailNumberInputScroll();
  }
}

async function onSave(){
  const container = document.getElementById('detail-container');
  const updates = {};

  // เก็บค่าจาก info-item
  container.querySelectorAll('.info-item[data-key]').forEach(it=>{
    const key = it.getAttribute('data-key');
    const type = it.getAttribute('data-type');
    const input = it.querySelector('input, select, textarea');
    if(!input) return;
    let v = input.value;
    if(type==='number') v = v==='' ? null : Number(v);
    updates[key] = v;
  });

  // เก็บค่าจาก kv-table
  container.querySelectorAll('.kv-cell[data-key]').forEach(cell=>{
    const key = cell.getAttribute('data-key');
    const input = cell.querySelector('input');
    let v = input ? input.value : null;
    v = v==='' ? null : Number(v);
    updates[key] = v;
  });

  // อัปโหลดรูปใหม่ (ถ้ามี)
  // ใช้รายการที่สะสมไว้เป็นหลัก; ถ้าไม่มีเลย fallback ไปอ่านจาก inputs
  let newFiles = newSelectedFiles.slice();
  if (newFiles.length === 0) {
    const newFileInputs = document.querySelectorAll('.new-file-input');
    newFiles = [];
    newFileInputs.forEach(input => {
      const files = Array.from(input.files || []);
      newFiles.push(...files);
    });
  }
  let newURLs = [];

  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  if(saveBtn){ saveBtn.disabled = true; saveBtn.textContent = 'กำลังบันทึก/อัปโหลด...'; }
  if(cancelBtn) cancelBtn.disabled = true;

  try{
    if(newFiles.length){
      const uploads = newFiles.map(file=>{
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        return fetch(CLOUDINARY_URL, { method:'POST', body:fd }).then(r=>r.json());
      });
      const results = await Promise.all(uploads);
      newURLs = results.filter(r=>r && r.secure_url).map(r=>r.secure_url);
    }

    // รวมรูปเดิม + รูปใหม่ (normalize และ unique)
    const oldFiles = normalizeFiles(state.data.files);
    updates.files = Array.from(new Set([...oldFiles, ...newURLs]));

    // อัปเดต Firestore
    const currentData = state.data;
    const mountain = currentData.mountain;
    const plotNumber = currentData.plot_number;
    
    if (mountain && plotNumber) {
      // หาเอกสารทั้งหมดของแปลงเดียวกัน
      const snapshot = await db.collection(COLLECTION)
        .where('mountain', '==', mountain)
        .where('plot_number', '==', plotNumber)
        .get();
      
      if (!snapshot.empty) {
        // แยกข้อมูลที่จะอัปเดตทั้งหมด vs ข้อมูลเฉพาะเอกสารนี้
        const sharedUpdates = {}; // ข้อมูลที่แชร์กันทั้งแปลง (ทะเบียนเกษตรกร + พิกัด)
        const specificUpdates = {}; // ข้อมูลเฉพาะเอกสารนี้ (ข้อมูลดิน + ติดตามต้นกาแฟ + รูปภาพ)
        
        // ฟิลด์ที่จะแชร์กันทั้งแปลง: ทะเบียนเกษตรกรและพิกัด
        const sharedFields = new Set([
          'gps_coordinates', // พิกัด
          'farmer_name', 'age', 'coffee_experience', 'planting_area', 'address', // ข้อมูลเกษตรกร
          'water_system', 'fertilizer_type', 'fertilizer_formula', 'fertilizer_frequency',
          'fertilizer_amount', 'soil_problems', 'yield_problems', 'internet_access',
          'yield_per_tree', 'cupping_experience', 'fertilizer_cost', 'labor_cost', 'other_costs'
        ]);
        
        // แยกประเภทของ updates
        for (const [key, value] of Object.entries(updates)) {
          if (sharedFields.has(key)) {
            // ข้อมูลทะเบียนเกษตรกรและพิกัด = แชร์กันทั้งแปลง
            sharedUpdates[key] = value;
          } else {
            // ข้อมูลดิน (_portable), ติดตามต้นกาแฟ (coffee_*), รูปภาพ = เฉพาะเอกสารนี้
            specificUpdates[key] = value;
          }
        }
        
        // อัปเดตด้วย batch
        const batch = db.batch();
        
        snapshot.docs.forEach(doc => {
          if (doc.id === state.docId) {
            // เอกสารปัจจุบัน: อัปเดตทั้งข้อมูลแชร์และข้อมูลเฉพาะ
            batch.update(doc.ref, { ...sharedUpdates, ...specificUpdates, updatedAt: new Date() });
          } else {
            // เอกสารอื่นๆ ของแปลงเดียวกัน: อัปเดตเฉพาะข้อมูลแชร์
            if (Object.keys(sharedUpdates).length > 0) {
              batch.update(doc.ref, { ...sharedUpdates, updatedAt: new Date() });
            }
          }
        });
        
        await batch.commit();
        
        // แสดงข้อความแจ้งเตือน
        if (snapshot.docs.length > 1) {
          alert(`บันทึกการแก้ไขเรียบร้อย`);
        } else {
          alert('บันทึกการแก้ไขเรียบร้อย');
        }
      } else {
        // ไม่พบข้อมูลอื่น ให้อัปเดตปกติ
        await db.collection(COLLECTION).doc(state.docId).update(updates);
        alert('บันทึกการแก้ไขเรียบร้อย');
      }
    } else {
      // ไม่มีข้อมูลแปลง ให้อัปเดตปกติ
      await db.collection(COLLECTION).doc(state.docId).update(updates);
      alert('บันทึกการแก้ไขเรียบร้อย');
    }

    // sync แล้ว render ใหม่
    state.data = { ...state.data, ...updates };
    render(false);
  }catch(err){
    console.error(err);
    alert('บันทึกไม่สำเร็จ');
  }finally{
    if(saveBtn){ saveBtn.disabled=false; saveBtn.textContent='ยืนยันการแก้ไข'; }
    if(cancelBtn) cancelBtn.disabled=false;
  }
}

async function onDelete(){
  if(!confirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้? การดำเนินการนี้ไม่สามารถยกเลิกได้")) return;
  const btn = document.getElementById('deleteBtn');
  btn.disabled = true; btn.textContent = "กำลังลบข้อมูล...";
  try{
    await db.collection(COLLECTION).doc(state.docId).delete();
    alert("ลบข้อมูลเรียบร้อยแล้ว!");
    location.href = "home.html";
  }catch(err){
    console.error(err);
    alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    btn.disabled = false; btn.textContent = "ลบข้อมูลนี้";
  }
}

window.onload = displayDetailData;

// ฟังก์ชันลบรูปภาพ
function deleteImage(index) {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรูปนี้?')) return;
  
  const files = normalizeFiles(state.data.files);
  if (index >= 0 && index < files.length) {
    files.splice(index, 1);
    state.data.files = files;
    render(true); // render ใหม่ในโหมดแก้ไข
  }
}

/* ========= Export helpers ========= */
function collectOrderedPairs() {
  // คืนเป็น [{section:'ชื่อโซน', items:[{label,value}, ...]}]
  const d = state.data || {};
  const result = [];
  const createdAt = toDateSafe(d.createdAt);
  const createdText = createdAt
    ? createdAt.toLocaleString('th-TH',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})
    : '-';

  SECTIONS.forEach((sec, idx) => {
    const items = [];
    if (idx === 0) items.push({ label: 'บันทึกเมื่อ', value: createdText });
    sec.keys.forEach(k => {
      const meta = FIELD_META[k]; if (!meta) return;
      items.push({ label: meta.label, value: (d[k] ?? '') });
    });
    result.push({ section: sec.title, items });
  });

  return result;
}

function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
}
function getExportFilename(ext){
  const d = state.data || {};
  // เอา plot_number เป็นหลัก + เติมดอย และต้นกาแฟถ้ามี
  const base = [d.mountain, d.plot_number, d.coffee_tree ? `ต้น${d.coffee_tree}` : ''].filter(Boolean).join('-') || 'soil_detail';
  // ล้างอักขระต้องห้ามในไฟล์เนม
  const safe = base.replace(/[\\/:*?"<>|]+/g, '_').trim();
  return `${safe}.${ext}`;
}




// ค่าเริ่มต้น (ภาคเหนือไทย)
const defaultDetailPosition = { lat: 19.0333, lng: 99.8333 };
let detailMap, detailMarker;

function parseLatLngFromInput(text){
  if (!text) return null;
  const m = String(text).trim().split(',').map(s=>Number(s));
  if (m.length===2 && !isNaN(m[0]) && !isNaN(m[1])) return { lat:m[0], lng:m[1] };
  return null;
}

function initDetailMap(startPos){
  const start = startPos || defaultDetailPosition;
  const el = document.getElementById('map');
  if (!el || !window.google || !google.maps) return;

  detailMap = new google.maps.Map(el, { center:start, zoom: 13 });
  detailMarker = new google.maps.Marker({ position:start, map:detailMap, draggable:true });

  // คลิกแผนที่เพื่อย้ายหมุด
  detailMap.addListener('click', (e) => detailMarker.setPosition(e.latLng));
}

// ให้ callback ของสคริปต์ Maps เรียกเจอ
window.initMapDetail = function(){
  // จะถูกเรียกตอนโหลดสคริปต์เสร็จ แต่เราจะ init จริง ๆ ตอนเปิด modal
};

// =========================
// 🔒 ป้องกัน Input Number เปลี่ยนค่าจากลูกกลิ้งเมาส์ในโหมดแก้ไข
// =========================

// ป้องกันการเปลี่ยนค่า input number เมื่อเลื่อนลูกกลิ้งเมาส์
function preventDetailNumberInputScroll() {
  const numberInputs = document.querySelectorAll('input[type="number"]');
  
  numberInputs.forEach(function(input) {
    // ลบ event listener เก่าก่อน (ป้องกันการซ้ำ)
    input.removeEventListener('wheel', input._wheelHandler);
    
    // สร้าง event handler ใหม่
    input._wheelHandler = function(e) {
      // ป้องกันการเปลี่ยนค่าเฉพาะ input เท่านั้น
      e.preventDefault();
      
      // ให้หน้าจอเลื่อนได้ปกติ
      window.scrollBy(0, e.deltaY);
    };
    
    // เพิ่ม event listener ใหม่ (ไม่ใช้ passive: false)
    input.addEventListener('wheel', input._wheelHandler);
  });
}

// เรียกใช้ฟังก์ชันทุกครั้งที่ render โหมดแก้ไข
// จะถูกเรียกใน render function โดยตรง

// =========================
// 🚀 Global Event Listeners เพื่อป้องกันลูกกลิ้งเมาส์
// =========================

// ป้องกันการเปลี่ยนค่าของ input[type="number"] เมื่อเลื่อนลูกกลิ้งเมาส์ (แต่ยังให้เลื่อนหน้าได้)
document.addEventListener('wheel', function(e) {
  if (e.target.type === 'number') {
    // ป้องกันการเปลี่ยนค่าเฉพาะ input แต่ให้เลื่อนหน้าจอได้
    e.preventDefault();
    
    // ให้หน้าจอเลื่อนได้ปกติ
    window.scrollBy(0, e.deltaY);
  }
}, { passive: false });

// ป้องกันการเปลี่ยนค่าของ input[type="number"] เมื่อใช้ arrow keys
document.addEventListener('keydown', function(e) {
  if (e.target.type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
  }
});

console.log('🔒 Detail page: ป้องกันการเปลี่ยนค่า input number แต่ยังเลื่อนหน้าได้');




