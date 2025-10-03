// Navbar functionality
function createNavbar(activePage = '') {
    return `
        <nav class="navbar">
            <div class="navbar-container">
                <a href="home.html" class="navbar-brand">ระบบวิเคราะห์ดิน</a>
                <button class="navbar-toggle" onclick="toggleNavbar(event)">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <div class="navbar-nav" id="navbarNav">
                    <a href="index.html" class="nav-link ${activePage === 'form' ? 'active' : ''}">ฟอร์มบันทึกข้อมูล</a>
                    <a href="home.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">ข้อมูลทั้งหมด</a>
                    <button onclick="exportAllData(event)" class="nav-link">Export ข้อมูล</button>
                </div>
            </div>
        </nav>
    `;
}

// Toggle navbar for mobile
function toggleNavbar(event) {
    // หยุดการ propagate ของ event เพื่อป้องกันการ click ผิดปุ่ม
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const navbarNav = document.getElementById('navbarNav');
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbar = document.querySelector('.navbar');
    
    // ตรวจสอบว่าพบ elements หรือไม่
    if (!navbarNav || !navbarToggle || !navbar) {
        console.error('ไม่พบ navbar elements');
        return;
    }
    
    // ปิดการใช้งานปุ่ม hamburger และเพิ่ม transition class ชั่วคราวระหว่างการเปลี่ยนแปลง
    navbarToggle.disabled = true;
    navbar.classList.add('menu-transition');
    
    navbarNav.classList.toggle('active');
    navbarToggle.classList.toggle('active');
    navbar.classList.toggle('menu-open');
    
    // เปิดการใช้งานปุ่ม hamburger อีกครั้งหลังจากการเปลี่ยนแปลงเสร็จ
    setTimeout(() => {
        navbarToggle.disabled = false;
        navbar.classList.remove('menu-transition');
    }, 350); // รอให้ animation เสร็จก่อน (เพิ่มเวลาเล็กน้อย)
}

// Close navbar when clicking on a nav link (mobile)
function closeNavbarOnClick() {
    const navLinks = document.querySelectorAll('.nav-link');
    const navbarNav = document.getElementById('navbarNav');
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbar = document.querySelector('.navbar');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            if (window.innerWidth <= 768) {
                // ตรวจสอบว่า menu กำลัง transition อยู่หรือไม่
                if (navbarToggle.disabled) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                }
                
                navbarNav.classList.remove('active');
                navbarToggle.classList.remove('active');
                navbar.classList.remove('menu-open');
            }
        });
    });
}

// Close navbar when clicking outside (mobile)
function handleOutsideClick(event) {
    const navbar = document.querySelector('.navbar');
    const navbarNav = document.getElementById('navbarNav');
    const navbarToggle = document.querySelector('.navbar-toggle');
    
    if (window.innerWidth <= 768 && 
        navbarNav.classList.contains('active') && 
        !navbar.contains(event.target)) {
        navbarNav.classList.remove('active');
        navbarToggle.classList.remove('active');
        navbar.classList.remove('menu-open');
    }
}

// Handle window resize
function handleResize() {
    const navbarNav = document.getElementById('navbarNav');
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbar = document.querySelector('.navbar');
    
    if (window.innerWidth > 768) {
        navbarNav.classList.remove('active');
        navbarToggle.classList.remove('active');
        navbar.classList.remove('menu-open');
    }
}

// Function to export all data as CSV
async function exportAllData(event) {
    // ตรวจสอบว่า hamburger menu กำลัง transition อยู่หรือไม่
    const navbarToggle = document.querySelector('.navbar-toggle');
    if (navbarToggle && navbarToggle.disabled) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        return false;
    }
    
    try {
        // Show loading state
        const exportBtn = document.querySelector('.nav-link:last-child');
        const originalText = exportBtn.textContent;
        exportBtn.textContent = 'กำลังส่งออก...';
        exportBtn.disabled = true;
        
        // Get all data from Firestore
        const snapshot = await db.collection("soil_tests_new")
            .orderBy("createdAt", "desc")
            .get();
        
        if (snapshot.empty) {
            alert('ไม่มีข้อมูลให้ส่งออก');
            exportBtn.textContent = originalText;
            exportBtn.disabled = false;
            return;
        }
        
        // Define CSV headers based on FIELDS structure
        const csvHeaders = [
            'วันที่บันทึก',
            'ดอย',
            'แปลงหมายเลข',
            'ต้นกาแฟที่',
            'พิกัด GPS',
            'ชื่อ นามสกุล',
            'อายุ (ปี)',
            'ประสบการณ์ปลูกกาแฟ (ปี)',
            'พื้นที่เพาะปลูก (ไร่)',
            'ที่อยู่',
            'ระบบน้ำ',
            'ชนิดปุ๋ย',
            'สูตรปุ๋ย',
            'ความถี่ใส่ปุ๋ย/ปี (ครั้ง)',
            'ใส่ปุ๋ย/ครั้ง/ต้น (kg)',
            'ปัญหาดิน',
            'ปัญหาผลผลิต',
            'สัญญาณเน็ต',
            'ผลผลิตต่อต้น (kg)',
            'เคยส่งประกวด',
            'ต้นทุนปุ๋ย/ไร่/ปี (บาท)',
            'ค่าแรง/ไร่/ปี (บาท)',
            'ค่าใช้จ่ายอื่น/ไร่/ปี (บาท)',
            'N (mg/kg)',
            'P (mg/kg)',
            'K (mg/kg)',
            'OM (% w/w)',
            'pH',
            'EC (mS/cm)',
            'Moisture (%)',
            'Temp (°C)',
            'ความสูงต้น (ซม)',
            'เส้นรอบวงที่ 15 ซม (ซม)',
            'การออกดอก',
            'การออกผล',
            'ปัญหาโรคพืช',
            'ปัญหาแมลง',
            'ปัญหาหนอน',
            'น้ำหนักผลสด (กรัม)',
            'น้ำหนักผลแห้ง (กะลา) (กรัม)',
            'คุณภาพเมล็ด'
        ];
        
        const csvKeys = [
            'createdAt',
            'mountain',
            'plot_number',
            'coffee_tree',
            'gps_coordinates',
            'farmer_name',
            'age',
            'coffee_experience',
            'planting_area',
            'address',
            'water_system',
            'fertilizer_type',
            'fertilizer_formula',
            'fertilizer_frequency',
            'fertilizer_amount',
            'soil_problems',
            'yield_problems',
            'internet_access',
            'yield_per_tree',
            'cupping_experience',
            'fertilizer_cost',
            'labor_cost',
            'other_costs',
            'n_portable',
            'p_portable',
            'k_portable',
            'om_portable',
            'ph_portable',
            'ec_portable',
            'moisture_portable',
            'temp_portable',
            'coffee_height',
            'coffee_circumference',
            'flowering',
            'fruiting',
            'disease_problem',
            'insect_problem',
            'worm_problem',
            'fresh_weight',
            'dry_weight',
            'bean_quality'
        ];
        
        // Build CSV content with farmer data lookup
        let csvContent = csvHeaders.join(',') + '\n';
        
        // Group documents by mountain and plot_number to find farmer data
        const plotDataMap = new Map();
        snapshot.forEach(doc => {
            const data = doc.data();
            const plotKey = `${data.mountain}_${data.plot_number}`;
            if (!plotDataMap.has(plotKey)) {
                plotDataMap.set(plotKey, []);
            }
            plotDataMap.get(plotKey).push(data);
        });
        
        // Find farmer data from tree 1 for each plot
        const farmerDataMap = new Map();
        plotDataMap.forEach((plotDocuments, plotKey) => {
            // Find tree 1 with farmer data
            const tree1WithFarmerData = plotDocuments.find(doc => 
                doc.coffee_tree === '1' && 
                doc.farmer_name && 
                doc.age && 
                doc.address
            );
            
            if (tree1WithFarmerData) {
                const farmerFields = [
                    'farmer_name', 'age', 'coffee_experience', 'planting_area', 'address', 
                    'gps_coordinates', 'water_system', 'fertilizer_type', 'fertilizer_formula',
                    'fertilizer_frequency', 'fertilizer_amount', 'soil_problems', 'yield_problems',
                    'internet_access', 'yield_per_tree', 'cupping_experience', 'fertilizer_cost',
                    'labor_cost', 'other_costs'
                ];
                
                const farmerData = {};
                farmerFields.forEach(fieldId => {
                    if (tree1WithFarmerData[fieldId] !== undefined && 
                        tree1WithFarmerData[fieldId] !== null && 
                        tree1WithFarmerData[fieldId] !== '') {
                        farmerData[fieldId] = tree1WithFarmerData[fieldId];
                    }
                });
                farmerDataMap.set(plotKey, farmerData);
            }
        });
        
        // Process all documents with farmer data lookup
        snapshot.forEach(doc => {
            const data = doc.data();
            const plotKey = `${data.mountain}_${data.plot_number}`;
            const farmerData = farmerDataMap.get(plotKey) || {};
            
            // Merge farmer data for trees 2-6
            if (data.coffee_tree !== '1' && farmerData) {
                Object.keys(farmerData).forEach(fieldId => {
                    if ((data[fieldId] === undefined || data[fieldId] === null || data[fieldId] === '') && 
                        farmerData[fieldId] !== undefined) {
                        data[fieldId] = farmerData[fieldId];
                    }
                });
            }
            
            const row = csvKeys.map(key => {
                let value = data[key];
                
                // Handle date formatting
                if (key === 'createdAt' && value) {
                    const dt = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
                    if (!isNaN(dt)) {
                        value = dt.toLocaleDateString('th-TH', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
                
                // Handle undefined/null values
                if (value === undefined || value === null) {
                    value = '';
                }
                
                // Escape commas and quotes in text values
                value = String(value);
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                
                return value;
            });
            
            csvContent += row.join(',') + '\n';
        });
        
        // Create and download CSV file
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const now = new Date();
        const filename = `soil_analysis_data_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Reset button state
        exportBtn.textContent = originalText;
        exportBtn.disabled = false;
        
        alert('ส่งออกข้อมูลเรียบร้อยแล้ว');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('เกิดข้อผิดพลาดในการส่งออกข้อมูล: ' + error.message);
        
        // Reset button state
        const exportBtn = document.querySelector('.nav-link:last-child');
        if (exportBtn) {
            exportBtn.textContent = 'Export ข้อมูล';
            exportBtn.disabled = false;
        }
    }
}

// Initialize navbar on page load
function initNavbar(activePage) {
    const navbarHTML = createNavbar(activePage);
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    
    // Add event listeners for mobile functionality
    setTimeout(() => {
        closeNavbarOnClick();
        document.addEventListener('click', handleOutsideClick);
        window.addEventListener('resize', handleResize);
    }, 100);
}
