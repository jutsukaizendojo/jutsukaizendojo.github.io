// Global state
let selectedCategory = "All";
let selectedTechnique = null;

// DOM elements
const categoryFilter = document.getElementById('categoryFilter');
const techniquesGrid = document.getElementById('techniquesGrid');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const f = firebase.database().ref("techniques");

function drawRadarChart(containerSelector, labels, data, options = {}) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const rect = container.getBoundingClientRect();
    const dpi = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpi;
    canvas.height = rect.height * dpi;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpi, dpi);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const padding = 40;
    const maxRadius = Math.min(rect.width, rect.height) / 2 * 0.7 - padding;
    const levels = options.levels || 5;
    const strokeColor = options.strokeColor || '#ad0000ff';
    const pointColor = options.pointColor || '#b50000ff';
    const labelFont = options.labelFont || `${Math.floor(rect.width/25)}px Arial`;
    const pointRadius = options.pointRadius || 5;
    const duration = options.duration || 800;

    const angleStep = (2 * Math.PI) / labels.length;

    // Easing function: easeInOutQuad
    function easeInOutQuad(t) {
        return t < 0.5 ? 2*t*t : -1 + (4-2*t)*t;
    }

    let startTime = null;
    function animate(time) {
        if (!startTime) startTime = time;
        let progress = Math.min((time - startTime) / duration, 1);
        progress = easeInOutQuad(progress); // apply easing

        ctx.clearRect(0, 0, rect.width, rect.height);

        // Draw background web
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        for (let i = 1; i <= levels; i++) {
            const r = (i / levels) * maxRadius;
            ctx.beginPath();
            for (let j = 0; j < labels.length; j++) {
                const angle = j * angleStep - Math.PI / 2;
                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);
                if (j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Draw axes
        for (let i = 0; i < labels.length; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + maxRadius * Math.cos(angle);
            const y = centerY + maxRadius * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        // Draw polygon
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const r = ((data[i] / 100) * maxRadius) * progress;
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Gradient fill
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        gradient.addColorStop(0, 'rgba(255,0,0,0.4)');
        gradient.addColorStop(1, 'rgba(255,0,0,0.1)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw points
        for (let i = 0; i < data.length; i++) {
            const r = ((data[i] / 100) * maxRadius) * progress;
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            ctx.beginPath();
            ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
            ctx.fillStyle = pointColor;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Labels fade in
        ctx.fillStyle = `rgba(51,51,51,${progress})`;
        ctx.font = labelFont;
        for (let i = 0; i < labels.length; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + (maxRadius + 25) * Math.cos(angle);
            const y = centerY + (maxRadius + 25) * Math.sin(angle);
            ctx.textAlign = x > centerX ? 'left' : x < centerX ? 'right' : 'center';
            ctx.textBaseline = y > centerY ? 'top' : y < centerY ? 'bottom' : 'middle';
            ctx.fillText(labels[i], x, y);
        }

        if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}


// Initialize the application
function init() {
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Category filter buttons
    categoryFilter.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            handleCategoryChange(e.target.dataset.category);
        }
    });

    // Modal close events
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    // Technique card clicks
    techniquesGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.technique-card');
        if (card) {
            const techniqueId = card.dataset.techniqueId;
            const technique = fetchedTechniques.find(t => t.id === techniqueId);
            if (technique) {
                openModal(technique);
            } else {
                console.warn("Technique not found for ID:", techniqueId);
            }
        }
    });


}

// Handle category filter change
function handleCategoryChange(category) {
    selectedCategory = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // Re-render techniques
    renderTechniques();
}

// Get filtered techniques based on selected category
function getFilteredTechniques() {
    if (selectedCategory === "All") {
        return Object.values(fetchedTechniques); // convert object to array
    }
    return Object.values(fetchedTechniques).filter(
        technique => technique.category === selectedCategory
    );
}


// Get difficulty class name
function getDifficultyClass(difficulty) {
    switch (difficulty.toLowerCase()) {
        case 'pemula': return 'difficulty-pemula';
        case 'menengah': return 'difficulty-menengah';
        case 'lanjutan': return 'difficulty-lanjutan';
        default: return '';
    }
}

function handleCategoryChange(category) {
    selectedCategory = category;

    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    // Render techniques
    renderTechniques();
}

function getFilteredTechniques() {
    if (selectedCategory === "All") return fetchedTechniques;
    return fetchedTechniques.filter(t => t.category === selectedCategory);
}

let fetchedTechniques = [];

// Listen for Firebase data changes
f.on("value", snapshot => {
    fetchedTechniques = []; // reset
    snapshot.forEach(child => {
        const data = child.val();
        const id = child.key;
        fetchedTechniques.push({ id, ...data });
    });

    // Render techniques AFTER fetching
    renderTechniques();
});

const techniqueSearch = document.getElementById('techniqueSearch');

techniqueSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase(); // get search text
    renderTechniques(query); // pass query to render function
});


function renderTechniques(query = "") {
    let filtered = getFilteredTechniques();

    if (query) {
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
        );
    }

    techniquesGrid.innerHTML = '';

    if (filtered.length === 0) {
        techniquesGrid.innerHTML = '<p>No techniques found.</p>';
        return;
    }

    filtered.forEach(t => {
        const cardHTML = `
            <div class="technique-card" data-technique-id="${t.id}">
                <div class="technique-card-image-container">
                    <img src="${t.image || 'images/default.jpg'}" alt="${t.name}" class="technique-card-image">
                    <div class="technique-card-overlay"></div>
                </div>
                <div class="technique-card-content">
                    <div class="technique-card-header">
                        <span class="technique-card-category">${t.category}</span>
                        <span class="technique-card-difficulty ${getDifficultyClass(t.difficulty)}">${t.difficulty}</span>
                    </div>
                    <h3 class="technique-card-name">${t.name}</h3>
                    <p class="technique-card-description">${t.description}</p>
                    <div class="technique-card-footer">
                        <span>Pelajari teknik</span>
                    </div>
                </div>
            </div>
        `;
        techniquesGrid.innerHTML += cardHTML;
    });
}


renderTechniques()

// Listen for clicks on category buttons
categoryFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-btn'); // ensures clicks inside button work
    if (!btn) return;

    // Update active button style
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update selected category
    selectedCategory = btn.dataset.category;

    // Re-render techniques
    renderTechniques();
});


// Open modal with technique details
function openModal(technique) {
    selectedTechnique = technique;
    
    // Set modal content
    document.getElementById('modalTitle').textContent = technique.name;
    document.getElementById('modalDescription').textContent = technique.description;

    // Set badges
    document.getElementById('modalBadges').innerHTML = `
        <span class="modal-badge modal-badge-category">${technique.category}</span>
        <span class="modal-badge modal-badge-difficulty">${technique.difficulty}</span>
    `;

    // Steps
    document.getElementById('modalSteps').innerHTML = technique.steps.map((step, index) => `
        <div class="modal-step">
            <div class="modal-step-number">${index + 1}</div>
            <p class="modal-step-text">${step}</p>
        </div>
    `).join('');

    // Tips
    document.getElementById('modalTips').innerHTML = technique.tips.map(tip => `
        <div class="modal-tip">
            <div class="modal-tip-bullet"></div>
            <p class="modal-tip-text">${tip}</p>
        </div>
    `).join('');

    // Common mistakes
    document.getElementById('modalMistakes').innerHTML = technique.commonMistakes.map(mistake => `
        <div class="modal-mistake">
            <div class="modal-mistake-bullet"></div>
            <p class="modal-mistake-text">${mistake}</p>
        </div>
    `).join('');

    // Videos
    let videos = technique.video ? [technique.video] : []; // wrap string in array

    if (videos.length > 0) {
        document.getElementById('modalvideo').innerHTML = videos.map(video => `
            <div class="modal-video-item">
                ${video} <!-- iframe or <video> tag -->
            </div>
        `).join('');
    } else {
        document.getElementById('modalvideo').innerHTML = '<p>No video available.</p>';
    }

    // Show modal
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Radar chart
    const labels = technique.stats ? Object.keys(technique.stats) : ["Speed","Strength","Difficulty","Agility"];
    const values = technique.stats ? Object.values(technique.stats) : [Math.random()*100, Math.random()*100, Math.random()*100, Math.random()*100];
    requestAnimationFrame(() => {
        drawRadarChart(".modal-image-container", labels, values);
    });
}


// Close modal
function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    selectedTechnique = null;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);