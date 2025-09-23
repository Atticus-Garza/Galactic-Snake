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
    ownedSkins: new Set(JSON.parse(localStorage.getItem("ownedSkins")) || ["classic"])
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

playBtn.addEventListener("click", startGame);
backBtn.addEventListener("click", goToMainMenu);
restartBtn.addEventListener("click", startGame);
mainMenuBtn.addEventListener("click", goToMainMenu);
shopBtn.addEventListener("click", openShop);
closeShopBtn.addEventListener("click", closeShop);

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
    updateShopDisplay();
}

function closeShop() {
    shopModal.classList.remove("active");
    mainMenu.classList.add("active");
}

function updateShopDisplay() {
    coinAmountDisplay.textContent = gameState.coins;
    const shopItems = document.querySelectorAll(".shop-item");
    shopItems.forEach(item => {
        const skinName = item.dataset.skin;
        const buyBtn = item.querySelector(".buy-btn");
        const selectBtn = item.querySelector(".select-btn");
        const owned = gameState.ownedSkins.has(skinName);
        const selected = gameState.currentSkin === skinName;

        buyBtn.style.display = owned ? "none" : "block";
        selectBtn.style.display = owned ? "block" : "none";
        selectBtn.disabled = selected;
        selectBtn.textContent = selected ? "Selected" : "Select";
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