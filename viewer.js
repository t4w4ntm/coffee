// --- ‼️ กรุณากรอกข้อมูล Firebase ของคุณที่นี่ (ใช้ชุดเดียวกับ script.js) ‼️ ---
const firebaseConfig = {
    apiKey: "AIzaSyCad3vMEdmWQUcUDJA6BHYD6AZruzgqom4",
    authDomain: "testdirt-58ba4.firebaseapp.com",
    projectId: "testdirt-58ba4",
    storageBucket: "testdirt-58ba4.firebasestorage.app",
    messagingSenderId: "89792009820",
    appId: "1:89792009820:web:86ff41e9d3211f00997899"
};

// --- เริ่มต้นการเชื่อมต่อ Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- ฟังก์ชันสำหรับดึงและแสดงข้อมูล ---
async function displayData() {
    const container = document.getElementById('data-container');
    container.innerHTML = '<p>กำลังโหลดข้อมูล...</p>'; // แสดงสถานะกำลังโหลด

    try {
        // ใช้ collection เดียวกับหน้า form/detail
        const snapshot = await db.collection("soil_tests_new").orderBy("createdAt", "desc").get();

        if (snapshot.empty) {
            container.innerHTML = '<p>ยังไม่มีข้อมูลที่บันทึกไว้</p>';
            return;
        }

        container.innerHTML = ''; // ล้างข้อความ "กำลังโหลด"

        // วนลูปเพื่อสร้าง Card แสดงผลสำหรับแต่ละข้อมูล
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4';

            // วันที่: รองรับทั้ง Timestamp และ Date/String
            let testDate = '-';
            const ts = data.createdAt;
            if (ts) {
                const dt = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
                if (!isNaN(dt)) {
                    testDate = dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                }
            }

            // รองรับทั้ง array และ string เดี่ยวของไฟล์
            const files = Array.isArray(data.files) ? data.files : (data.files ? [data.files] : []);
            const imagesHTML = files.length > 0
                ? files.map(url => `
                    <div class="card-img-wrapper">
                        <img src="${url}" class="card-img-top" alt="Soil Image" onclick="window.open('${url}', '_blank')">
                    </div>
                `).join('')
                : '';

            card.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        ดอย ${data.mountain || '-'} - แปลง ${data.plot_number || '-'}${data.coffee_tree ? ` - ต้นที่ ${data.coffee_tree}` : ''}
                    </div>
                    <div class="card-body">
                        <p class="card-text"><strong>วันที่บันทึก:</strong> ${testDate}</p>
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item">pH: ${data.ph_portable ?? '-'}</li>
                            <li class="list-group-item">OM: ${data.om_portable ?? '-'}% w/w</li>
                            <li class="list-group-item">Total-N: ${data.n_portable ?? '-'} mg/kg</li>
                            <li class="list-group-item">Avail.P: ${data.p_portable ?? '-'} mg/kg</li>
                            <li class="list-group-item">Exch.K: ${data.k_portable ?? '-'} mg/kg</li>
                            <li class="list-group-item">EC: ${data.ec_portable ?? '-'} mS/cm</li>
                            <li class="list-group-item">Moisture: ${data.moisture_portable ?? '-'}%</li>
                            <li class="list-group-item">Temperature: ${data.temp_portable ?? '-'}°C</li>
                        </ul>
                        <h6 class="mt-3">รูปภาพประกอบ:</h6>
                        <div class="card-img-container">${imagesHTML || '<p>ไม่มีรูปภาพ</p>'}</div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล: ", error);
        container.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง</p>';
    }
}

// เรียกใช้ฟังก์ชันเมื่อหน้าเว็บโหลดเสร็จ
window.onload = () => {
    initNavbar('viewer');
    displayData();
};
