const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const uiLayer = document.getElementById('ui-layer');
const gameStatus = document.getElementById('game-status');

// Game Constants
const GRID_SIZE = 20; // Size of one tile (grid cell)
const TILE_COUNT = canvas.width / GRID_SIZE; // Should be 20x20
const GAME_SPEED = 100; // ms per frame

// Game State
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = 0;
let nextDx = 0; // Buffer for next direction to prevent quick multiple keypress bugs
let nextDy = 0;
let gameInterval;
let isGameRunning = false;

// Initialize High Score UI
highScoreEl.textContent = highScore;

// Event Listeners
document.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', startGame);

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    score = 0;
    scoreEl.textContent = score;
    dx = 1; // Start moving right
    dy = 0;
    nextDx = 1;
    nextDy = 0;
    spawnFood();
}

function startGame() {
    initGame();
    isGameRunning = true;
    uiLayer.classList.add('hidden');
    // Clear any existing interval just in case
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, GAME_SPEED);
}

function gameLoop() {
    if (!isGameRunning) return;

    moveSnake();
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    if (checkFoodCollision()) {
        score++;
        scoreEl.textContent = score;
        spawnFood();
        // Don't pop the tail, so snake grows
    } else {
        snake.pop(); // Remove tail to maintain size if not ate
    }

    draw();
}

function moveSnake() {
    // Update actual direction from buffer
    dx = nextDx;
    dy = nextDy;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
}

function checkCollision() {
    const head = snake[0];

    // Wall collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        return true;
    }

    // Self collision (start from index 1 because index 0 is head)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }

    return false;
}

function checkFoodCollision() {
    const head = snake[0];
    return head.x === food.x && head.y === food.y;
}

function spawnFood() {
    // Random position respecting grid
    // Ensure food doesn't spawn on snake
    let validPosition = false;
    while (!validPosition) {
        food.x = Math.floor(Math.random() * TILE_COUNT);
        food.y = Math.floor(Math.random() * TILE_COUNT);

        validPosition = true;
        for (let part of snake) {
            if (part.x === food.x && part.y === food.y) {
                validPosition = false;
                break;
            }
        }
    }
}

function handleInput(e) {
    // Prevent default scrolling for arrow keys
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    if (!isGameRunning) return;

    switch (e.key) {
        case 'ArrowUp':
            if (dy === 0) { nextDx = 0; nextDy = -1; }
            break;
        case 'ArrowDown':
            if (dy === 0) { nextDx = 0; nextDy = 1; }
            break;
        case 'ArrowLeft':
            if (dx === 0) { nextDx = -1; nextDy = 0; }
            break;
        case 'ArrowRight':
            if (dx === 0) { nextDx = 1; nextDy = 0; }
            break;
    }
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameInterval);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }

    gameStatus.textContent = "GAME OVER";
    startBtn.textContent = "TRY AGAIN";
    uiLayer.classList.remove('hidden');
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#1e293b'; // Matches CSS var(--canvas-bg)
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Snake
    snake.forEach((part, index) => {
        // Head is slightly different color or brightness
        ctx.fillStyle = index === 0 ? '#34d399' : '#10b981';
        
        // Add a glow effect
        ctx.shadowBlur = index === 0 ? 15 : 0;
        ctx.shadowColor = '#10b981';
        
        // Draw rounded rectangle for style (optional, simple rect for now)
        const pad = 1;
        ctx.fillRect(
            part.x * GRID_SIZE + pad, 
            part.y * GRID_SIZE + pad, 
            GRID_SIZE - 2*pad, 
            GRID_SIZE - 2*pad
        );
        
        ctx.shadowBlur = 0; // Reset shadow
    });

    // Draw Food
    ctx.fillStyle = '#3b82f6';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#3b82f6';
    
    // Make food a circle
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
}
