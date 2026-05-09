const TARGETS = { kcal: 2500, prot: 150, carb: 285, fat: 85, fiber: 35 };

let currentFoods = JSON.parse(localStorage.getItem('currentFoods')) || [];
let history = JSON.parse(localStorage.getItem('macroHistory')) || [];
let currentCalendarDate = new Date();
let selectedDateStr = null;

document.addEventListener('DOMContentLoaded', () => {
    calculateTotals();
    renderCurrentFoods();
    renderCalendar();
    document.getElementById('current-date').innerText = "Hoy: " + new Date().toLocaleDateString();
});

// --- LÓGICA DE CALCULO Y RENDER HOY ---
function calculateTotals() {
    let totals = { kcal: 0, prot: 0, carb: 0, fat: 0, fiber: 0 };
    currentFoods.forEach(f => {
        const factor = f.grams / 100;
        totals.kcal += f.kcal * factor;
        totals.prot += f.prot * factor;
        totals.carb += f.carb * factor;
        totals.fat += f.fat * factor;
        totals.fiber += f.fiber * factor;
    });

    document.getElementById('total-kcal').innerText = `${totals.kcal.toFixed(0)} / ${TARGETS.kcal}`;
    document.getElementById('total-prot').innerText = `${totals.prot.toFixed(0)} / ${TARGETS.prot}g`;
    document.getElementById('total-carb').innerText = `${totals.carb.toFixed(0)} / ${TARGETS.carb}g`;
    document.getElementById('total-fat').innerText = `${totals.fat.toFixed(0)} / ${TARGETS.fat}g`;
    document.getElementById('total-fiber').innerText = `${totals.fiber.toFixed(0)} / ${TARGETS.fiber}g`;
    
    localStorage.setItem('currentFoods', JSON.stringify(currentFoods));
    return totals;
}

function renderCurrentFoods() {
    const list = document.getElementById('today-foods-list');
    const card = document.getElementById('today-foods-card');
    if (currentFoods.length === 0) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    list.innerHTML = currentFoods.map((f, i) => `
        <div class="food-item">
            <div><strong>${f.name}</strong><br><small>${(f.kcal * f.grams / 100).toFixed(0)} kcal</small></div>
            <div class="food-item-controls">
                <input type="number" value="${f.grams}" onchange="updateGrams(${i}, this.value)"> g
                <button class="btn-delete" onclick="removeFood(${i})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function updateGrams(i, g) {
    if (g > 0) currentFoods[i].grams = g; else currentFoods.splice(i, 1);
    calculateTotals(); renderCurrentFoods();
}

function removeFood(i) { if (confirm("¿Borrar?")) { currentFoods.splice(i, 1); calculateTotals(); renderCurrentFoods(); } }

// --- BÚSQUEDA Y AÑADIR ---
async function searchProduct() {
    const q = document.getElementById('searchInput').value; if (!q) return;
    document.getElementById('resultsCard').style.display = 'block';
    document.getElementById('results').innerHTML = 'Buscando...';
    try {
        const res = await fetch(`https://es.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=10`);
        const data = await res.json();
        renderResults(data.products);
    } catch (e) { alert("Error"); }
}

function renderResults(products) {
    const div = document.getElementById('results'); div.innerHTML = '';
    products.forEach(p => {
        const n = p.nutriments || {};
        const data = { id: p._id, name: p.product_name || '?', kcal: n['energy-kcal_100g'] || 0, prot: n.proteins_100g || 0, carb: n.carbohydrates_100g || 0, fat: n.fat_100g || 0, fiber: n.fiber_100g || 0 };
        div.innerHTML += `<div style="padding:10px; border-bottom:1px solid #eee">${data.name}<br>
            <input type="number" id="g-${data.id}" placeholder="Gramos" style="width:70px">
            <button onclick='addFood(${JSON.stringify(data)})'>Add</button></div>`;
    });
}

function addFood(data) {
    const g = parseFloat(document.getElementById(`g-${data.id}`).value);
    if (!g) return;
    currentFoods.push({ ...data, grams: g });
    calculateTotals(); renderCurrentFoods();
}

// --- CALENDARIO E HISTORIAL ---
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    const month = currentCalendarDate.getMonth();
    const year = currentCalendarDate.getFullYear();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const historyDates = history.map(h => h.date);

    let html = `<div class="calendar-header"><button onclick="changeMonth(-1)">◀</button>
                <span>${new Intl.DateTimeFormat('es', {month:'long', year:'numeric'}).format(currentCalendarDate)}</span>
                <button onclick="changeMonth(1)">▶</button></div>
                <div class="calendar-grid">`;
    ['L','M','X','J','V','S','D'].forEach(d => html += `<div style="font-weight:bold;font-size:0.8rem">${d}</div>`);
    for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const dStr = new Date(year, month, d).toLocaleDateString();
        const hasData = historyDates.includes(dStr) ? 'has-data' : '';
        const isSelected = selectedDateStr === dStr ? 'selected' : '';
        html += `<div class="calendar-day ${hasData} ${isSelected}" onclick="selectDay('${dStr}')">${d}</div>`;
    }
    container.innerHTML = html + `</div>`;
}

function changeMonth(n) { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + n); renderCalendar(); }

function selectDay(dateStr) {
    selectedDateStr = dateStr;
    renderCalendar();
    const dayData = history.find(h => h.date === dateStr);
    const section = document.getElementById('day-detail-section');
    const content = document.getElementById('selected-day-content');
    
    if (!dayData) {
        section.style.display = 'block';
        document.getElementById('selected-day-title').innerText = dateStr;
        content.innerHTML = `<p style="color:gray">No hay datos guardados este día.</p>`;
        return;
    }

    section.style.display = 'block';
    document.getElementById('selected-day-title').innerText = "Datos de " + dateStr;
    content.innerHTML = `
        <div class="macros-grid">
            <div class="macro-box">Kcal<br><strong>${dayData.data.kcal.toFixed(0)}</strong></div>
            <div class="macro-box">P<br><strong>${dayData.data.prot.toFixed(0)}g</strong></div>
            <div class="macro-box">HC<br><strong>${dayData.data.carb.toFixed(0)}g</strong></div>
            <div class="macro-box">G<br><strong>${dayData.data.fat.toFixed(0)}g</strong></div>
            <div class="macro-box">F<br><strong>${dayData.data.fiber.toFixed(0)}g</strong></div>
        </div>
        <div class="history-actions">
            <button class="btn-edit-hist" onclick="editHistoryDay('${dateStr}')">✏️ Editar Totales</button>
            <button class="btn-del-hist" onclick="deleteHistoryDay('${dateStr}')">🗑️ Borrar Día</button>
        </div>
    `;
}

function saveAndResetDay() {
    if (currentFoods.length === 0) return;
    if (confirm("¿Guardar día?")) {
        const dayRecord = { date: new Date().toLocaleDateString(), data: calculateTotals() };
        history = history.filter(h => h.date !== dayRecord.date); // Evita duplicados
        history.unshift(dayRecord);
        localStorage.setItem('macroHistory', JSON.stringify(history));
        currentFoods = []; calculateTotals(); renderCurrentFoods(); renderCalendar();
        selectDay(dayRecord.date);
    }
}

function deleteHistoryDay(dateStr) {
    if (confirm(`¿Seguro que quieres borrar el historial del ${dateStr}?`)) {
        history = history.filter(h => h.date !== dateStr);
        localStorage.setItem('macroHistory', JSON.stringify(history));
        selectedDateStr = null;
        document.getElementById('day-detail-section').style.display = 'none';
        renderCalendar();
    }
}

function editHistoryDay(dateStr) {
    const day = history.find(h => h.date === dateStr);
    const newKcal = prompt("Nuevas Kcal:", day.data.kcal.toFixed(0));
    if (newKcal === null) return;
    
    day.data.kcal = parseFloat(newKcal);
    day.data.prot = parseFloat(prompt("Nueva Proteína (g):", day.data.prot.toFixed(0)));
    day.data.carb = parseFloat(prompt("Nuevos Hidratos (g):", day.data.carb.toFixed(0)));
    day.data.fat = parseFloat(prompt("Nuevas Grasas (g):", day.data.fat.toFixed(0)));
    day.data.fiber = parseFloat(prompt("Nueva Fibra (g):", day.data.fiber.toFixed(0)));
    
    localStorage.setItem('macroHistory', JSON.stringify(history));
    selectDay(dateStr);
}

// ESCÁNER (Igual que antes)
let scanner;
function startScanner() {
    if (!scanner) scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
    async (code) => {
        scanner.stop();
        document.getElementById('resultsCard').style.display = 'block';
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();
        if(data.status === 1) renderResults([data.product]); else alert("No encontrado");
    });
}