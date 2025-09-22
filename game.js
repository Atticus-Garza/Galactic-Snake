// Game Configuration
const GAME_CONFIG = {
    canvasSize: 400,
    gridSize: 20,
    initialSpeed: 200,
    speedIncrease: 5,
    snakeMovementSmoothing: 0.15
};

// Game State
const gameState = {
    snake: [],
    food: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    score: 0,
    speed: GAME_CONFIG.initialSpeed,
    lastUpdate: 0,
    frameId: null,
    isGameOver: false,
    isPaused: false,
    snakePositions: []
};

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = GAME_CONFIG.canvasSize;
canvas.height = GAME_CONFIG.canvasSize;

// Game Initialization
function initializeGame() {
    // Reset game state
    gameState.snake = [{ x: 5, y: 5 }];
    gameState.food = generateFoodPosition();
    gameState.direction = { x: 1, y: 0 };
    gameState.nextDirection = { x: 1, y: 0 };
    gameState.score = 0;
    gameState.speed = GAME_CONFIG.initialSpeed;
    gameState.isGameOver = false;
    gameState.isPaused = false;
    gameState.snakePositions = [];
    
    // Update score display
    updateScoreDisplay();
    
    // Start game loop
    gameState.lastUpdate = performance.now();
    gameLoop(gameState.lastUpdate);
}

// Frame timing variables
const FRAME_MIN_TIME = (1000/60) - (1000/65); // 60fps with tolerance
let lastFrameTime = 0;

function gameLoop(timestamp) {
    if (gameState.isGameOver || gameState.isPaused) {
        return;
    }

    // Throttle frame rate
    const deltaTime = timestamp - lastFrameTime;
    if (deltaTime < FRAME_MIN_TIME) {
        gameState.frameId = requestAnimationFrame(gameLoop);
        return;
    }
    lastFrameTime = timestamp;

    // Use double buffering for smoother updates
    const currentState = {
        direction: { ...gameState.nextDirection },
        snake: gameState.snake.map(segment => ({ ...segment })),
        food: { ...gameState.food }
    };

    // Update game state at fixed time intervals
    if (timestamp - gameState.lastUpdate >= gameState.speed) {
        // Calculate new head position
        const head = {
            x: currentState.snake[0].x + currentState.direction.x,
            y: currentState.snake[0].y + currentState.direction.y
        };

        // Check for collisions
        if (isCollision(head)) {
            endGame();
            return;
        }

        // Update snake positions array for interpolation only when needed
        if (gameState.direction.x !== currentState.direction.x || 
            gameState.direction.y !== currentState.direction.y) {
            gameState.snakePositions = currentState.snake;
        }

        // Move snake
        gameState.snake.unshift(head);
        
        // Check for food collision
        if (head.x === gameState.food.x && head.y === gameState.food.y) {
            // Increase score and speed
            gameState.score++;
            gameState.speed = Math.max(50, GAME_CONFIG.initialSpeed - (gameState.score * GAME_CONFIG.speedIncrease));
            updateScoreDisplay();
            
            // Generate new food
            gameState.food = generateFoodPosition();
            
            // Create food collection effect
            createFoodEffect(head.x * GAME_CONFIG.gridSize + GAME_CONFIG.gridSize / 2, 
                           head.y * GAME_CONFIG.gridSize + GAME_CONFIG.gridSize / 2);
        } else {
            gameState.snake.pop();
        }

        // Update game state
        gameState.direction = { ...gameState.nextDirection };
        gameState.lastUpdate = timestamp;
    }

    // Draw game state
    draw(timestamp);
    
    // Request next frame
    gameState.frameId = requestAnimationFrame(gameLoop);
}

function draw(timestamp) {
    ctx.clearRect(0, 0, GAME_CONFIG.canvasSize, GAME_CONFIG.canvasSize);

    // Calculate interpolation factor
    const timeSinceUpdate = timestamp - gameState.lastUpdate;
    const interpolationFactor = Math.min(
        timeSinceUpdate / gameState.speed, 
        1
    );

    // Draw snake with smooth interpolation
    gameState.snake.forEach((segment, index) => {
        let renderX = segment.x;
        let renderY = segment.y;

        // Interpolate position for smooth movement
        if (index < gameState.snakePositions.length && interpolationFactor < 1) {
            const previousPos = gameState.snakePositions[index];
            const dx = segment.x - previousPos.x;
            const dy = segment.y - previousPos.y;
            renderX = previousPos.x + dx * interpolationFactor;
            renderY = previousPos.y + dy * interpolationFactor;
        }

        const x = renderX * GAME_CONFIG.gridSize;
        const y = renderY * GAME_CONFIG.gridSize;

        if (index === 0) {
            // Draw head
            ctx.save();
            ctx.font = `${GAME_CONFIG.gridSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'var(--primary)';
            ctx.shadowBlur = 10;
            ctx.fillText('🟢', x + GAME_CONFIG.gridSize / 2, y + GAME_CONFIG.gridSize / 2);
            ctx.restore();
        } else {
            // Draw body segment
            ctx.save();
            ctx.shadowColor = 'var(--primary)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = 'var(--primary)';
            ctx.fillRect(x + 2, y + 2, GAME_CONFIG.gridSize - 4, GAME_CONFIG.gridSize - 4);
            ctx.restore();
        }
    });

    // Draw food
    ctx.save();
    ctx.font = `${GAME_CONFIG.gridSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'var(--accent)';
    ctx.shadowBlur = 10;
    ctx.fillText('⭐', 
        gameState.food.x * GAME_CONFIG.gridSize + GAME_CONFIG.gridSize / 2,
        gameState.food.y * GAME_CONFIG.gridSize + GAME_CONFIG.gridSize / 2
    );
    ctx.restore();
}

function createFoodEffect(x, y) {
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'food-particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        const angle = (Math.PI * 2 * i) / 8;
        const distance = 40;
        particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
        
        document.body.appendChild(particle);
        particle.style.animation = 'particle-explosion 0.6s ease-out forwards';
        
        setTimeout(() => particle.remove(), 600);
    }
}

function generateFoodPosition() {
    const position = {
        x: Math.floor(Math.random() * (GAME_CONFIG.canvasSize / GAME_CONFIG.gridSize)),
        y: Math.floor(Math.random() * (GAME_CONFIG.canvasSize / GAME_CONFIG.gridSize))
    };
    
    // Regenerate if food spawns on snake
    return isOnSnake(position) ? generateFoodPosition() : position;
}

function isCollision(position) {
    // Check wall collision
    if (position.x < 0 || 
        position.y < 0 || 
        position.x >= GAME_CONFIG.canvasSize / GAME_CONFIG.gridSize || 
        position.y >= GAME_CONFIG.canvasSize / GAME_CONFIG.gridSize) {
        return true;
    }
    
    // Check self collision
    return isOnSnake(position);
}

function isOnSnake(position) {
    return gameState.snake.some(segment => segment.x === position.x && segment.y === position.y);
}

function updateScoreDisplay() {
    document.getElementById('score').textContent = `Score: ${gameState.score}`;
}

function endGame() {
    gameState.isGameOver = true;
    cancelAnimationFrame(gameState.frameId);
    document.getElementById('game').classList.remove('active');
    document.getElementById('main-menu').classList.add('active');
}

function handleDirectionInput(direction) {
    const directions = {
        'up': { x: 0, y: -1 },
        'down': { x: 0, y: 1 },
        'left': { x: -1, y: 0 },
        'right': { x: 1, y: 0 }
    };
    
    const newDirection = directions[direction];
    if (!newDirection) return;

    // Prevent 180-degree turns
    if ((gameState.direction.x !== -newDirection.x || gameState.direction.x === 0) &&
        (gameState.direction.y !== -newDirection.y || gameState.direction.y === 0)) {
        gameState.nextDirection = newDirection;
    }
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    const keys = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'w': 'up',
        's': 'down',
        'a': 'left',
        'd': 'right'
    };
    
    const direction = keys[e.key];
    if (direction) {
        e.preventDefault();
        handleDirectionInput(direction);
    }
});

// Touch Controls
function initializeTouchControls() {
    const controlsContainer = document.querySelector('.touch-controls');
    if (!controlsContainer) return;

    // Handle touch input with pointer events
    let pointerStartX = 0;
    let pointerStartY = 0;
    let lastMoveTime = 0;
    const MOVE_THROTTLE = 16; // ~60fps
    
    // Use pointer events for better performance and device compatibility
    canvas.addEventListener('pointerdown', (e) => {
        pointerStartX = e.clientX;
        pointerStartY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
    }, { passive: true });
    
    canvas.addEventListener('pointermove', (e) => {
        const now = performance.now();
        if (now - lastMoveTime < MOVE_THROTTLE) return;
        lastMoveTime = now;
        
        if (!pointerStartX && !pointerStartY) return;
        
        const deltaX = e.clientX - pointerStartX;
        const deltaY = e.clientY - pointerStartY;
        const minSwipeDistance = 30;
        
        if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                handleDirectionInput(deltaX > 0 ? 'right' : 'left');
                pointerStartX = e.clientX;
                pointerStartY = e.clientY;
            } else {
                handleDirectionInput(deltaY > 0 ? 'down' : 'up');
                pointerStartX = e.clientX;
                pointerStartY = e.clientY;
            }
        }
    }, { passive: true });
    
    canvas.addEventListener('pointerup', () => {
        pointerStartX = 0;
        pointerStartY = 0;
    }, { passive: true });

    // Handle on-screen control buttons
    document.querySelectorAll('.touch-btn').forEach(btn => {
        btn.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            const direction = this.dataset.direction;
            handleDirectionInput(direction);
            this.classList.add('pressed');
        });

        btn.addEventListener('pointerup', function() {
            this.classList.remove('pressed');
        });

        btn.addEventListener('pointerout', function() {
            this.classList.remove('pressed');
        });
    });
}

// Initialize game when play button is clicked
document.getElementById('play-btn').addEventListener('click', function() {
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game').classList.add('active');
    initializeGame();
});

// Initialize touch controls
initializeTouchControls();
