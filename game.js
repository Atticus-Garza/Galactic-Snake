// Game Configuration
const GAME_CONFIG = {
    canvasSize: 400,
    gridSize: 20,
    initialSpeed: 200,
    speedIncrease: 2,
    snakeMovementSmoothing: 0.15,
    maxSpeed: 80,
    colors: {
        snake: "#00ffaa",
        food: "#ff3366",
        grid: "#1a1a4a",
        powerup: "#ff00ff"
    },
    powerUpDuration: 5000,
    powerUpSpawnChance: 0.1
};

// Game State
const gameState = {
    snake: [],
    food: { x: 0, y: 0 },
    powerUp: null,
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    score: 0,
    coins: parseInt(localStorage.getItem("coins")) || 0,
    highScore: parseInt(localStorage.getItem("highScore")) || 0,
    speed: GAME_CONFIG.initialSpeed,
    lastUpdate: 0,
    frameId: null,
    isGameOver: false,
    isPaused: false,
    snakePositions: [],
    powerUpActive: false,
    powerUpTimer: null,
    lastInputTime: 0,
    inputDelay: 50,
    currentSkin: localStorage.getItem("currentSkin") || "classic",
    ownedSkins: new Set(JSON.parse(localStorage.getItem("ownedSkins")) || ["classic"]),
    subscriptions: JSON.parse(localStorage.getItem('subscriptions') || '{}')
};

// DOM Elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const finalScoreElement = document.getElementById("finalScore");
const gameOverModal = document.getElementById("gameOverModal");
const mainMenuBtn = document.getElementById("menu-btn");
const playBtn = document.getElementById("play-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const mainMenu = document.getElementById("main-menu");
const game = document.getElementById("game");
const shopBtn = document.getElementById("shop-btn");
const shopModal = document.getElementById("shopModal");
const closeShopBtn = document.getElementById("close-shop-btn");
const coinAmountDisplay = document.getElementById("coin-amount");
const shopCoinsDisplay = document.getElementById('shop-coins');
const subscriptionStatus = document.getElementById("subscription-status");
const paymentRequestModal = document.getElementById('paymentRequestModal');
const prName = document.getElementById('pr-name');
const prTier = document.getElementById('pr-tier');
const prMethod = document.getElementById('pr-method');
const prRef = document.getElementById('pr-ref');
const prProof = document.getElementById('pr-proof');
const prSubmit = document.getElementById('pr-submit');
const prCancel = document.getElementById('pr-cancel');
const prEmail = document.getElementById('pr-email');
const prAccount = document.getElementById('pr-account');
const adminModal = document.getElementById('adminModal');
const adminRequestsList = document.getElementById('admin-requests-list');
const adminClose = document.getElementById('admin-close');

const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const importFileInput = document.getElementById('importFile');

// Payment requests stored in localStorage under 'paymentRequests'
function loadPaymentRequests() {
    return JSON.parse(localStorage.getItem('paymentRequests') || '[]');
}

function savePaymentRequests(list) {
    localStorage.setItem('paymentRequests', JSON.stringify(list));
}

function openPaymentRequestModal(tier) {
    if (!paymentRequestModal) return;
    prTier.value = tier;
    prName.value = '';
    prMethod.value = 'cashapp';
    prRef.value = '';
    prProof.value = '';
    paymentRequestModal.classList.add('active');
}

function closePaymentRequestModal() {
    if (!paymentRequestModal) return;
    paymentRequestModal.classList.remove('active');
}

if (prCancel) prCancel.addEventListener('click', closePaymentRequestModal);

if (prSubmit) {
    prSubmit.addEventListener('click', () => {
        const list = loadPaymentRequests();
        const request = {
            id: 'req_' + Date.now(),
            name: prName.value || null,
            email: prEmail.value || null,
            tier: prTier.value,
            method: prMethod.value,
            account: prAccount.value || null,
            reference: prRef.value || null,
            proof: prProof.value || null,
            status: 'pending',
            submittedAt: Date.now()
        };
        list.push(request);
        savePaymentRequests(list);
        closePaymentRequestModal();
        alert('Payment request submitted. An admin will review and activate your subscription once confirmed.');
    });
}

// Admin UI
function openAdminModal() {
    if (!adminModal) return;
    adminModal.classList.add('active');
    renderAdminRequests();
}

function closeAdminModal() {
    if (!adminModal) return;
    adminModal.classList.remove('active');
}

if (adminClose) adminClose.addEventListener('click', closeAdminModal);

function renderAdminRequests() {
    if (!adminRequestsList) return;
    const list = loadPaymentRequests();
    adminRequestsList.innerHTML = '';
    if (list.length === 0) {
        adminRequestsList.innerHTML = '<div>No requests</div>';
        return;
    }
    list.forEach(req => {
        const el = document.createElement('div');
        el.className = 'admin-request';
            el.innerHTML = `
            <div><strong>${req.tier.toUpperCase()}</strong> — ${req.method} — ${new Date(req.submittedAt).toLocaleString()}</div>
            <div>Name: ${req.name || '—'}</div>
            <div>Email: ${req.email || '—'}</div>
            <div>Account: ${req.account || '—'}</div>
            <div>Ref: ${req.reference || '—'}</div>
            <div>Proof: ${req.proof ? `<a href="${req.proof}" target="_blank">link</a>` : '—'}</div>
            <div>Status: <span data-id="${req.id}">${req.status}</span></div>
        `;
        const actions = document.createElement('div');
        actions.className = 'admin-actions';
        const approve = document.createElement('button');
        approve.className = 'game-btn';
        approve.textContent = 'Approve';
        approve.addEventListener('click', () => { adminApproveRequest(req.id); });
        const reject = document.createElement('button');
        reject.className = 'game-btn';
        reject.textContent = 'Reject';
        reject.addEventListener('click', () => { adminRejectRequest(req.id); });
        actions.appendChild(approve);
        actions.appendChild(reject);
        el.appendChild(actions);
        adminRequestsList.appendChild(el);
    });
}

function adminApproveRequest(id) {
    const list = loadPaymentRequests();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return alert('Request not found');
    const req = list[idx];
    // Activate subscription
    const duration = req.tier === 'ultra' ? 365 : 30;
    activateSubscription(req.tier, duration);
    list[idx].status = 'approved';
    list[idx].reviewedAt = Date.now();
    savePaymentRequests(list);
    renderAdminRequests();
    alert(`Request ${id} approved and ${req.tier} activated.`);
}

function adminRejectRequest(id) {
    const list = loadPaymentRequests();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return alert('Request not found');
    list[idx].status = 'rejected';
    list[idx].reviewedAt = Date.now();
    savePaymentRequests(list);
    renderAdminRequests();
    alert(`Request ${id} rejected.`);
}

// Expose openPaymentRequestModal and openAdminModal to shop buttons
// Add listeners to subscription pay buttons to open payment request modal
function hookSubscriptionPayButtonsForRequests() {
    document.querySelectorAll('.subscription-item').forEach(item => {
        const tier = item.dataset.tier;
        item.querySelectorAll('.pay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Instead of immediately opening external link, open payment request modal prefilled
                openPaymentRequestModal(tier);
                // prefill method depending on button
                const method = btn.dataset.method;
                if (prMethod) prMethod.value = method || 'cashapp';
            });
        });
    });
}

// Call this during initialization too
document.addEventListener('DOMContentLoaded', () => {
    hookSubscriptionPayButtonsForRequests();
    // Export / Import handlers
    if (exportDataBtn) exportDataBtn.addEventListener('click', () => {
        const payload = {
            coins: gameState.coins,
            highScore: gameState.highScore,
            subscriptions: gameState.subscriptions || {},
            ownedSkins: Array.from(gameState.ownedSkins || []),
            paymentRequests: loadPaymentRequests()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'galactic-snake-data.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });

    if (importDataBtn && importFileInput) importDataBtn.addEventListener('click', () => {
        importFileInput.value = '';
        importFileInput.click();
    });

    if (importFileInput) importFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                const confirmMerge = confirm('Importing will merge data into local storage. Continue?');
                if (!confirmMerge) return;
                if (typeof data.coins === 'number') {
                    gameState.coins = data.coins;
                    localStorage.setItem('coins', gameState.coins);
                    if (coinAmountDisplay) coinAmountDisplay.textContent = gameState.coins;
                }
                if (typeof data.highScore === 'number') {
                    gameState.highScore = data.highScore;
                    localStorage.setItem('highScore', gameState.highScore);
                }
                if (data.subscriptions) {
                    gameState.subscriptions = data.subscriptions;
                    saveSubscriptions();
                    updateSubscriptionStatusDisplay();
                }
                if (Array.isArray(data.ownedSkins)) {
                    gameState.ownedSkins = new Set(data.ownedSkins);
                    localStorage.setItem('ownedSkins', JSON.stringify(Array.from(gameState.ownedSkins)));
                }
                if (Array.isArray(data.paymentRequests)) {
                    savePaymentRequests(data.paymentRequests);
                }
                alert('Import complete.');
            } catch (err) {
                alert('Failed to import: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
});

// Initialize canvas with proper pixel ratio
function initCanvas() {
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = GAME_CONFIG.canvasSize * pixelRatio;
    canvas.height = GAME_CONFIG.canvasSize * pixelRatio;
    canvas.style.width = `${GAME_CONFIG.canvasSize}px`;
    canvas.style.height = `${GAME_CONFIG.canvasSize}px`;
    ctx.scale(pixelRatio, pixelRatio);
}

// Event Listeners
document.addEventListener("keydown", handleKeyPress);
document.querySelectorAll(".touch-btn").forEach(btn => {
    btn.addEventListener("touchstart", handleTouchControl);
    btn.addEventListener("mousedown", handleTouchControl);
});

// Safe element event binding (in case HTML is modified)
if (playBtn) playBtn.addEventListener("click", startGame);
if (backBtn) backBtn.addEventListener("click", goToMainMenu);
if (restartBtn) restartBtn.addEventListener("click", startGame);
if (mainMenuBtn) mainMenuBtn.addEventListener("click", goToMainMenu);
if (shopBtn) shopBtn.addEventListener("click", openShop);
if (closeShopBtn) closeShopBtn.addEventListener("click", closeShop);

// Navigation Functions
function goToMainMenu() {
    mainMenu.classList.add("active");
    game.classList.remove("active");
    gameOverModal.classList.remove("active");
    if (gameState.frameId) {
        cancelAnimationFrame(gameState.frameId);
    }
    shopModal.classList.remove("active");
}

// Shop Functions
function openShop() {
    shopModal.classList.add("active");
    mainMenu.classList.remove("active");
    // Load subscriptions and bind buttons each time shop opens
    loadSubscriptions();
    bindSubscriptionButtons();
    bindShopItemButtons();
    updateShopDisplay();
    updateSubscriptionStatusDisplay();
}

function closeShop() {
    shopModal.classList.remove("active");
    mainMenu.classList.add("active");
}

function updateShopDisplay() {
    // Show coins in shop balance display
    if (shopCoinsDisplay) shopCoinsDisplay.textContent = gameState.coins;
    const shopItems = document.querySelectorAll(".shop-item");
    shopItems.forEach(item => {
        const skinName = item.dataset.item || item.dataset.skin;
        const buyBtn = item.querySelector(".buy-btn");
        const selectBtn = item.querySelector(".select-btn");
        const owned = gameState.ownedSkins.has(skinName);
        const selected = gameState.currentSkin === skinName;

        if (buyBtn) buyBtn.style.display = owned ? "none" : "block";
        if (selectBtn) {
            selectBtn.style.display = owned ? "block" : "none";
            selectBtn.disabled = selected;
            selectBtn.textContent = selected ? "Selected" : "Select";
        }
    });
}

// Buy a skin with coins
function buySkin(itemName, price) {
    price = parseInt(price) || 0;
    if (gameState.coins < price) {
        alert('Not enough coins');
        return;
    }
    gameState.coins -= price;
    gameState.ownedSkins.add(itemName);
    localStorage.setItem('coins', gameState.coins);
    localStorage.setItem('ownedSkins', JSON.stringify(Array.from(gameState.ownedSkins)));
    if (shopCoinsDisplay) shopCoinsDisplay.textContent = gameState.coins;
    alert(`${itemName} purchased!`);
    updateShopDisplay();
}

// Select/equip a skin
function selectSkin(itemName) {
    if (!gameState.ownedSkins.has(itemName)) return;
    gameState.currentSkin = itemName;
    localStorage.setItem('currentSkin', itemName);
    updateShopDisplay();
}

// Hook buy/select buttons
function bindShopItemButtons() {
    document.querySelectorAll('.shop-item').forEach(item => {
        const buyBtn = item.querySelector('.buy-btn');
        const selectBtn = item.querySelector('.select-btn');
        const itemName = item.dataset.item || item.dataset.skin;
        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                const price = buyBtn.dataset.price || buyBtn.getAttribute('data-price');
                buySkin(itemName, price);
            });
        }
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                selectSkin(itemName);
            });
        }
    });
}

// Subscriptions
function loadSubscriptions() {
    const data = JSON.parse(localStorage.getItem('subscriptions') || '{}');
    gameState.subscriptions = data;
}

function saveSubscriptions() {
    localStorage.setItem('subscriptions', JSON.stringify(gameState.subscriptions || {}));
}

function getSubscriptionInfo(tier) {
    const subs = gameState.subscriptions || {};
    return subs[tier] || null;
}

function isSubscriptionActive(tier) {
    const info = getSubscriptionInfo(tier);
    if (!info) return false;
    const now = Date.now();
    return now < info.expiresAt;
}

function activateSubscription(tier, durationDays) {
    const now = Date.now();
    const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;
    gameState.subscriptions = gameState.subscriptions || {};
    gameState.subscriptions[tier] = { activatedAt: now, expiresAt };
    saveSubscriptions();
    applySubscriptionPerks(tier);
    updateSubscriptionStatusDisplay();
}

function applySubscriptionPerks(tier) {
    // Give immediate coin bonus for activation
    if (tier === 'premium') {
        gameState.coins += 50;
    } else if (tier === 'ultra') {
        gameState.coins += 300;
    }
    localStorage.setItem('coins', gameState.coins);
    coinAmountDisplay.textContent = gameState.coins;
}

function updateSubscriptionStatusDisplay() {
    const parts = [];
    ['premium','ultra'].forEach(tier => {
        const info = getSubscriptionInfo(tier);
        if (info && isSubscriptionActive(tier)) {
            const remainingMs = info.expiresAt - Date.now();
            const days = Math.ceil(remainingMs / (24*60*60*1000));
            parts.push(`${tier.toUpperCase()}: active (${days} day(s) left)`);
        } else if (info) {
            parts.push(`${tier.toUpperCase()}: expired`);
        } else {
            parts.push(`${tier.toUpperCase()}: inactive`);
        }
    });
    if (subscriptionStatus) subscriptionStatus.textContent = parts.join(' | ');
}

// Hook up subscription buttons when shop opens
function bindSubscriptionButtons() {
    const subItems = document.querySelectorAll('.subscription-item');
    subItems.forEach(item => {
        const tier = item.dataset.tier;
        const cashappUrl = item.dataset.cashapp;
        const paypalUrl = item.dataset.paypal;
        item.querySelectorAll('.pay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const method = btn.dataset.method;
                // open the link in a new tab
                const url = method === 'paypal' ? paypalUrl : cashappUrl;
                window.open(url, '_blank');
            });
        });

        const markPaid = item.querySelector('.mark-paid-btn');
        if (markPaid) {
            markPaid.addEventListener('click', () => {
            // For manual activation: ask for confirmation then activate locally
            const duration = parseInt(item.dataset.durationDays) || 30;
            const ok = confirm(`Mark ${tier} as paid and activate for ${duration} day(s)?`);
            if (ok) {
                activateSubscription(tier, duration);
                alert(`${tier} activated locally. Thank you!`);
            }
            });
        }
    });
}


// Game Functions
function resetGame() {
    const gridSize = GAME_CONFIG.gridSize;
    const initialX = Math.floor(gridSize / 2);
    const initialY = Math.floor(gridSize / 2);
    
    gameState.snake = [
        { x: initialX, y: initialY },
        { x: initialX - 1, y: initialY },
        { x: initialX - 2, y: initialY }
    ];
    gameState.direction = { x: 1, y: 0 };
    gameState.nextDirection = { x: 1, y: 0 };
    gameState.score = 0;
    gameState.speed = GAME_CONFIG.initialSpeed;
    gameState.isGameOver = false;
    gameState.isPaused = false;
    gameState.powerUpActive = false;
    gameState.snakePositions = [];
    
    if (gameState.powerUpTimer) {
        clearTimeout(gameState.powerUpTimer);
        gameState.powerUpTimer = null;
    }
    
    spawnFood();
    scoreElement.textContent = "0";
    gameOverModal.classList.remove("active");
}

function startGame() {
    gameOverModal.classList.remove("active");
    mainMenu.classList.remove("active");
    game.classList.add("active");
    resetGame();
    gameState.lastUpdate = performance.now();
    gameLoop(gameState.lastUpdate);
}

function endGame() {
    gameState.isGameOver = true;
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem("highScore", gameState.score);
        finalScoreElement.textContent = `New High Score: ${gameState.score}!`;
    } else {
        finalScoreElement.textContent = `Final Score: ${gameState.score}`;
    }
    gameOverModal.classList.add("active");
}

function handleInput() {
    if (!isOppositeDirection(gameState.direction, gameState.nextDirection)) {
        gameState.direction = { ...gameState.nextDirection };
    }
}

function isOppositeDirection(dir1, dir2) {
    return dir1.x === -dir2.x && dir1.y === -dir2.y;
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    if (!gameState.isPaused) {
        gameState.lastUpdate = performance.now();
        gameLoop(gameState.lastUpdate);
    }
}

function spawnFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * GAME_CONFIG.gridSize),
            y: Math.floor(Math.random() * GAME_CONFIG.gridSize)
        };
    } while (isPositionOccupied(newFood));
    
    gameState.food = newFood;
    
    // Chance to spawn power-up
    if (!gameState.powerUp && Math.random() < GAME_CONFIG.powerUpSpawnChance) {
        let powerUpPos;
        do {
            powerUpPos = {
                x: Math.floor(Math.random() * GAME_CONFIG.gridSize),
                y: Math.floor(Math.random() * GAME_CONFIG.gridSize)
            };
        } while (isPositionOccupied(powerUpPos) || (powerUpPos.x === newFood.x && powerUpPos.y === newFood.y));
        gameState.powerUp = powerUpPos;
    }
}

function isPositionOccupied(pos) {
    return gameState.snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}

function checkCollision(head) {
    const hitWall = head.x < 0 || head.x >= GAME_CONFIG.gridSize ||
                   head.y < 0 || head.y >= GAME_CONFIG.gridSize;
    
    const hitSelf = gameState.snake.some((segment, index) => {
        if (index === 0) return false; // Skip head
        return segment.x === head.x && segment.y === head.y;
    });
    
    return hitWall || hitSelf;
}

function moveSnake() {
    // Add new head
    const head = gameState.snake[0];
    const newHead = {
        x: head.x + gameState.direction.x,
        y: head.y + gameState.direction.y
    };
    
    // Check for collision
    if (checkCollision(newHead)) {
        endGame();
        return;
    }
    
    gameState.snake.unshift(newHead);
    
    // Check if food is eaten
    if (newHead.x === gameState.food.x && newHead.y === gameState.food.y) {
        gameState.score++;
        gameState.coins++;
        localStorage.setItem("coins", gameState.coins);
        coinAmountDisplay.textContent = gameState.coins;
        scoreElement.textContent = gameState.score;
        spawnFood();
        // Increase speed
        if (gameState.speed > GAME_CONFIG.maxSpeed) {
            gameState.speed -= GAME_CONFIG.speedIncrease;
        }
    } else if (gameState.powerUp && newHead.x === gameState.powerUp.x && newHead.y === gameState.powerUp.y) {
        activatePowerUp();
    } else {
        gameState.snake.pop();
    }
    
    // Record position for smooth movement
    gameState.snakePositions.push({
        segments: gameState.snake.map(s => ({ ...s })),
        t: performance.now()
    });
    
    // Keep only recent positions for interpolation
    while (gameState.snakePositions.length > 3) {
        gameState.snakePositions.shift();
    }
}

function activatePowerUp() {
    gameState.powerUpActive = true;
    gameState.powerUp = null;
    gameState.score += 5;
    scoreElement.textContent = gameState.score;
    
    if (gameState.powerUpTimer) {
        clearTimeout(gameState.powerUpTimer);
    }
    
    gameState.powerUpTimer = setTimeout(() => {
        gameState.powerUpActive = false;
    }, GAME_CONFIG.powerUpDuration);
}

function interpolateSnake(currentTime) {
    if (gameState.snakePositions.length < 2) return gameState.snake;
    
    const pos = gameState.snakePositions;
    const lastUpdate = pos[pos.length - 1].t;
    const prevUpdate = pos[pos.length - 2].t;
    
    const t = Math.min((currentTime - prevUpdate) / (lastUpdate - prevUpdate), 1);
    const smoothT = t * (2 - t); // Smooth step interpolation
    
    return pos[pos.length - 2].segments.map((segment, i) => ({
        x: lerp(segment.x, pos[pos.length - 1].segments[i].x, smoothT),
        y: lerp(segment.y, pos[pos.length - 1].segments[i].y, smoothT)
    }));
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function drawGame(currentTime) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    
    const interpolatedSnake = interpolateSnake(currentTime);
    drawSnake(interpolatedSnake);
    drawFood();
    if (gameState.powerUp) {
        drawPowerUp();
    }
}

function drawGrid() {
    ctx.strokeStyle = GAME_CONFIG.colors.grid;
    ctx.lineWidth = 0.5;
    
    const cellSize = GAME_CONFIG.canvasSize / GAME_CONFIG.gridSize;
    for (let i = 0; i <= GAME_CONFIG.gridSize; i++) {
        const pos = i * cellSize;
        
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, GAME_CONFIG.canvasSize);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(GAME_CONFIG.canvasSize, pos);
        ctx.stroke();
    }
}

function drawSnake(snake) {
    const cellSize = GAME_CONFIG.canvasSize / GAME_CONFIG.gridSize;
    const radius = cellSize / 2;
    
    // Draw snake body
    snake.forEach((segment, index) => {
        const x = (segment.x + 0.5) * cellSize;
        const y = (segment.y + 0.5) * cellSize;
        
        ctx.fillStyle = GAME_CONFIG.colors.snake;
        if (index === 0) { // Head
            ctx.beginPath();
            ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes
            const eyeOffset = radius * 0.3;
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(x + eyeOffset, y - eyeOffset, radius * 0.1, 0, Math.PI * 2);
            ctx.arc(x + eyeOffset, y + eyeOffset, radius * 0.1, 0, Math.PI * 2);
            ctx.fill();
        } else { // Body
            ctx.beginPath();
            ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawFood() {
    const cellSize = GAME_CONFIG.canvasSize / GAME_CONFIG.gridSize;
    const x = (gameState.food.x + 0.5) * cellSize;
    const y = (gameState.food.y + 0.5) * cellSize;
    const radius = cellSize * 0.3;
    
    ctx.fillStyle = GAME_CONFIG.colors.food;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawPowerUp() {
    const cellSize = GAME_CONFIG.canvasSize / GAME_CONFIG.gridSize;
    const x = (gameState.powerUp.x + 0.5) * cellSize;
    const y = (gameState.powerUp.y + 0.5) * cellSize;
    const radius = cellSize * 0.3;
    
    ctx.fillStyle = GAME_CONFIG.colors.powerup;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add sparkle effect
    const sparkleRadius = radius * 1.2;
    const sparkleAngle = (performance.now() / 500) % (Math.PI * 2);
    
    ctx.strokeStyle = GAME_CONFIG.colors.powerup;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const angle = sparkleAngle + (Math.PI / 2 * i);
        ctx.beginPath();
        ctx.moveTo(
            x + Math.cos(angle) * radius,
            y + Math.sin(angle) * radius
        );
        ctx.lineTo(
            x + Math.cos(angle) * sparkleRadius,
            y + Math.sin(angle) * sparkleRadius
        );
        ctx.stroke();
    }
}

function gameLoop(currentTime) {
    if (gameState.isGameOver) return;
    
    if (!gameState.isPaused) {
        const deltaTime = currentTime - gameState.lastUpdate;
        
        if (deltaTime >= gameState.speed) {
            handleInput();
            moveSnake();
            gameState.lastUpdate = currentTime;
        }
        
        drawGame(currentTime);
    }
    
    gameState.frameId = requestAnimationFrame(gameLoop);
}

// Handle keyboard input
function handleKeyPress(event) {
    if (gameState.isGameOver) return;
    
    const now = performance.now();
    if (now - gameState.lastInputTime < gameState.inputDelay) return;
    
    const key = event.key.toLowerCase();
    const currentDirection = gameState.direction;
    
    // Prevent 180-degree turns
    switch (key) {
        case "arrowup":
        case "w":
            if (currentDirection.y !== 1) {
                gameState.nextDirection = { x: 0, y: -1 };
            }
            break;
        case "arrowdown":
        case "s":
            if (currentDirection.y !== -1) {
                gameState.nextDirection = { x: 0, y: 1 };
            }
            break;
        case "arrowleft":
        case "a":
            if (currentDirection.x !== 1) {
                gameState.nextDirection = { x: -1, y: 0 };
            }
            break;
        case "arrowright":
        case "d":
            if (currentDirection.x !== -1) {
                gameState.nextDirection = { x: 1, y: 0 };
            }
            break;
        case " ":
        case "p":
            togglePause();
            break;
    }
    
    gameState.lastInputTime = now;
}

// Handle touch/click controls
function handleTouchControl(event) {
    event.preventDefault();
    if (gameState.isGameOver) return;
    
    const now = performance.now();
    if (now - gameState.lastInputTime < gameState.inputDelay) return;
    
    const direction = event.target.dataset.direction;
    const currentDirection = gameState.direction;
    
    switch (direction) {
        case "up":
            if (currentDirection.y !== 1) {
                gameState.nextDirection = { x: 0, y: -1 };
            }
            break;
        case "down":
            if (currentDirection.y !== -1) {
                gameState.nextDirection = { x: 0, y: 1 };
            }
            break;
        case "left":
            if (currentDirection.x !== 1) {
                gameState.nextDirection = { x: -1, y: 0 };
            }
            break;
        case "right":
            if (currentDirection.x !== -1) {
                gameState.nextDirection = { x: 1, y: 0 };
            }
            break;
    }
    
    gameState.lastInputTime = now;
}

// Initialization on load
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    // Ensure displays reflect stored values
    coinAmountDisplay.textContent = gameState.coins;
    scoreElement.textContent = gameState.score;
    loadSubscriptions();
    updateSubscriptionStatusDisplay();
    // Bind subscription buttons if shop is present
    bindSubscriptionButtons();

    // Resize canvas on window resize to maintain pixel ratio
    window.addEventListener('resize', () => {
        // reset and re-init
        initCanvas();
    });
});