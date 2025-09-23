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

// Navigation Functions
function goToMainMenu() {
    mainMenu.classList.add("active");
    game.classList.remove("active");
    gameOverModal.classList.remove("active");
    cancelAnimationFrame(gameState.frameId);
    resetGame();
}

function showGame() {
    mainMenu.classList.remove("active");
    game.classList.add("active");
}

// Game Control Functions
function handleKeyPress(event) {
    if (gameState.isGameOver) return;
    
    const now = performance.now();
    if (now - gameState.lastInputTime < gameState.inputDelay) return;
    
    const key = event.key.toLowerCase();
    const currentDirection = gameState.direction;
    
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

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    if (!gameState.isPaused) {
        gameLoop(performance.now());
    }
}

// Game Logic Functions
function generateFoodPosition() {
    let position;
    do {
        position = {
            x: Math.floor(Math.random() * GAME_CONFIG.gridSize),
            y: Math.floor(Math.random() * GAME_CONFIG.gridSize)
        };
    } while (isPositionOccupied(position));
    return position;
}

function generatePowerUpPosition() {
    let position;
    do {
        position = {
            x: Math.floor(Math.random() * GAME_CONFIG.gridSize),
            y: Math.floor(Math.random() * GAME_CONFIG.gridSize)
        };
    } while (isPositionOccupied(position) || 
             (position.x === gameState.food.x && position.y === gameState.food.y));
    return position;
}

function isPositionOccupied(position) {
    return gameState.snake.some(segment => 
        segment.x === position.x && segment.y === position.y
    );
}

function isSelfCollision(head) {
    return gameState.snake.slice(1).some(segment => 
        segment.x === head.x && segment.y === head.y
    );
}

function activatePowerUp() {
    gameState.powerUpActive = true;
    if (gameState.powerUpTimer) {
        clearTimeout(gameState.powerUpTimer);
    }
    gameState.powerUpTimer = setTimeout(() => {
        gameState.powerUpActive = false;
    }, GAME_CONFIG.powerUpDuration);
}

// Rendering Functions
function render() {
    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--background");
    ctx.fillRect(0, 0, GAME_CONFIG.canvasSize, GAME_CONFIG.canvasSize);
    
    // Draw grid
    const cellSize = GAME_CONFIG.canvasSize / GAME_CONFIG.gridSize;
    ctx.strokeStyle = GAME_CONFIG.colors.grid;
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= GAME_CONFIG.gridSize; i++) {
        const pos = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, GAME_CONFIG.canvasSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(GAME_CONFIG.canvasSize, pos);
        ctx.stroke();
    }
    
    // Draw food
    ctx.fillStyle = GAME_CONFIG.colors.food;
    drawCircle(gameState.food.x * cellSize + cellSize/2, 
               gameState.food.y * cellSize + cellSize/2, 
               cellSize/3);
    
    // Draw power-up if exists
    if (gameState.powerUp) {
        ctx.fillStyle = GAME_CONFIG.colors.powerup;
        const time = performance.now() / 500; // Oscillation speed
        const scale = 0.8 + Math.sin(time) * 0.2; // Pulsing effect
        drawStar(gameState.powerUp.x * cellSize + cellSize/2,
                gameState.powerUp.y * cellSize + cellSize/2,
                5, cellSize/4 * scale, cellSize/8 * scale);
    }
    
    // Draw snake with current skin
    let snakeColor;
    switch (gameState.currentSkin) {
        case "neon":
            const hue = (performance.now() / 50) % 360;
            snakeColor = `hsl(${hue}, 100%, 50%)`;
            break;
        case "galaxy":
            const time = performance.now() / 1000;
            const r = Math.sin(time) * 127 + 128;
            const g = Math.sin(time + 2) * 127 + 128;
            const b = Math.sin(time + 4) * 127 + 128;
            snakeColor = `rgb(${r}, ${g}, ${b})`;
            break;
        default:
            snakeColor = gameState.powerUpActive ? GAME_CONFIG.colors.powerup : GAME_CONFIG.colors.snake;
    }
    ctx.fillStyle = snakeColor;
    gameState.snake.forEach((segment, index) => {
        if (index === 0) {
            // Draw head
            drawSnakeHead(segment, cellSize);
        } else {
            // Draw body with rounded corners
            const x = segment.x * cellSize;
            const y = segment.y * cellSize;
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
            ctx.fill();
        }
    });

    // Draw glow effect when power-up is active
    if (gameState.powerUpActive) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.shadowColor = GAME_CONFIG.colors.powerup;
        ctx.shadowBlur = 20;
        gameState.snake.forEach(segment => {
            const x = segment.x * cellSize;
            const y = segment.y * cellSize;
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
            ctx.fill();
        });
        ctx.restore();
    }
}

function drawCircle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawSnakeHead(segment, cellSize) {
    const x = segment.x * cellSize;
    const y = segment.y * cellSize;
    
    // Draw head body
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
    ctx.fill();
    
    // Draw eyes
    ctx.fillStyle = "#000";
    const eyeSize = cellSize / 6;
    const eyeOffset = cellSize / 4;
    
    if (gameState.direction.x === 1) {
        drawCircle(x + cellSize - eyeOffset, y + eyeOffset, eyeSize);
        drawCircle(x + cellSize - eyeOffset, y + cellSize - eyeOffset, eyeSize);
    } else if (gameState.direction.x === -1) {
        drawCircle(x + eyeOffset, y + eyeOffset, eyeSize);
        drawCircle(x + eyeOffset, y + cellSize - eyeOffset, eyeSize);
    } else if (gameState.direction.y === 1) {
        drawCircle(x + eyeOffset, y + cellSize - eyeOffset, eyeSize);
        drawCircle(x + cellSize - eyeOffset, y + cellSize - eyeOffset, eyeSize);
    } else {
        drawCircle(x + eyeOffset, y + eyeOffset, eyeSize);
        drawCircle(x + cellSize - eyeOffset, y + eyeOffset, eyeSize);
    }
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

// Game State Management
function updateScoreDisplay() {
    scoreElement.textContent = gameState.score;
}

function resetGame() {
    gameState.snake = [{ x: 5, y: 5 }];
    gameState.food = generateFoodPosition();
    gameState.powerUp = null;
    gameState.direction = { x: 1, y: 0 };
    gameState.nextDirection = { x: 1, y: 0 };
    gameState.score = 0;
    gameState.speed = GAME_CONFIG.initialSpeed;
    gameState.isGameOver = false;
    gameState.isPaused = false;
    gameState.powerUpActive = false;
    if (gameState.powerUpTimer) {
        clearTimeout(gameState.powerUpTimer);
    }
    updateScoreDisplay();
}

function startGame() {
    showGame();
    resetGame();
    gameOverModal.classList.remove("active");
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

// Game Loop
const FRAME_MIN_TIME = (1000/60) - (1000/65); // 60fps with tolerance
let lastFrameTime = 0;

function gameLoop(timestamp) {
    if (gameState.isGameOver) {
        return;
    }

    if (gameState.isPaused) {
        gameState.frameId = requestAnimationFrame(gameLoop);
        return;
    }

    // Throttle frame rate
    const deltaTime = timestamp - lastFrameTime;
    if (deltaTime < FRAME_MIN_TIME) {
        gameState.frameId = requestAnimationFrame(gameLoop);
        return;
    }
    lastFrameTime = timestamp;

    // Update game state at fixed time intervals
    if (timestamp - gameState.lastUpdate >= gameState.speed) {
        const head = {
            x: gameState.snake[0].x + gameState.nextDirection.x,
            y: gameState.snake[0].y + gameState.nextDirection.y
        };

        // Wrap around screen edges
        head.x = (head.x + GAME_CONFIG.gridSize) % GAME_CONFIG.gridSize;
        head.y = (head.y + GAME_CONFIG.gridSize) % GAME_CONFIG.gridSize;

        // Check for collisions with self
        if (isSelfCollision(head)) {
            endGame();
            return;
        }

        // Move snake
        gameState.snake.unshift(head);
        gameState.direction = { ...gameState.nextDirection };
        
        // Check for collisions with food and power-ups
        if (head.x === gameState.food.x && head.y === gameState.food.y) {
            // Add points and coins
            addReward(10);
            
            // Update high score
            if (gameState.score > gameState.highScore) {
                gameState.highScore = gameState.score;
                localStorage.setItem("highScore", gameState.highScore);
            }
            
            // Generate new food and possibly powerup
            gameState.food = generateFoodPosition();
            if (!gameState.powerUp && Math.random() < GAME_CONFIG.powerUpSpawnChance) {
                gameState.powerUp = generatePowerUpPosition();
            }
            
            // Increase speed
            if (gameState.speed > GAME_CONFIG.maxSpeed) {
                gameState.speed -= GAME_CONFIG.speedIncrease;
            }
        } else if (gameState.powerUp && head.x === gameState.powerUp.x && head.y === gameState.powerUp.y) {
            // Activate power-up
            activatePowerUp();
            gameState.powerUp = null;
        } else {
            gameState.snake.pop();
        }
        
        gameState.lastUpdate = timestamp;
    }

    render();
    gameState.frameId = requestAnimationFrame(gameLoop);
}

// Shop Functions
function updateCoinsDisplay() {
    document.getElementById("coin-amount").textContent = gameState.coins;
    document.getElementById("shop-coins").textContent = gameState.coins;
}

function buyItem(itemName, price) {
    if (gameState.coins >= price && !gameState.ownedSkins.has(itemName)) {
        gameState.coins -= price;
        gameState.ownedSkins.add(itemName);
        localStorage.setItem("coins", gameState.coins);
        localStorage.setItem("ownedSkins", JSON.stringify([...gameState.ownedSkins]));
        updateCoinsDisplay();
        updateShopButtons();
        createParticles("🪙", 5);
    }
}

function equipSkin(skinName) {
    if (gameState.ownedSkins.has(skinName)) {
        gameState.currentSkin = skinName;
        localStorage.setItem("currentSkin", skinName);
        updateShopButtons();
    }
}

function updateShopButtons() {
    document.querySelectorAll(".shop-btn").forEach(btn => {
        const item = btn.dataset.item;
        if (gameState.ownedSkins.has(item)) {
            btn.textContent = item === gameState.currentSkin ? "Equipped" : "Equip";
            btn.dataset.owned = "true";
            btn.onclick = () => equipSkin(item);
        } else {
            btn.textContent = "Buy";
            btn.dataset.owned = "false";
            const price = parseInt(btn.dataset.price);
            btn.onclick = () => buyItem(item, price);
        }
    });
}

function createParticles(emoji, count) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.textContent = emoji;
        particle.style.left = `${Math.random() * 100}%`;
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1000);
    }
}

// Event Listeners for Shop and High Scores
document.getElementById("shop-btn").addEventListener("click", () => {
    document.getElementById("shopModal").classList.add("active");
    updateShopButtons();
});

document.getElementById("close-shop-btn").addEventListener("click", () => {
    document.getElementById("shopModal").classList.remove("active");
});

document.getElementById("high-scores-btn").addEventListener("click", () => {
    document.getElementById("highScore").textContent = gameState.highScore;
    document.getElementById("highScoresModal").classList.add("active");
});

document.getElementById("close-scores-btn").addEventListener("click", () => {
    document.getElementById("highScoresModal").classList.remove("active");
});

// Update reward system
function addReward(basePoints) {
    const points = gameState.powerUpActive ? basePoints * 2 : basePoints;
    gameState.score += points;
    
    // Add coins based on points
    const coinsEarned = Math.floor(points / 10);
    if (coinsEarned > 0) {
        gameState.coins += coinsEarned;
        localStorage.setItem("coins", gameState.coins);
        updateCoinsDisplay();
        createParticles("🪙", 1);
    }
    
    updateScoreDisplay();
}

// Initialize game
initCanvas();
updateCoinsDisplay();
updateShopButtons();
