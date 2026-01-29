const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const uiLayer = document.getElementById('ui-layer');
const gameStatus = document.getElementById('game-status');

// Game Constants
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const GAME_SPEED = 100;

// Dependencies
const mathEngine = new MathEngine();

// Game State
let currentState = {
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0,
    tier: 0, // 0: Bronze, 1: Silver, 2: Gold, 3: Diamond
    snake: [],
    foods: [], // Array of {x, y, value, isCorrect}
    powerups: [], // Array of {x, y, type: 'bomb'|'potion'}
    currentQuestion: null,
    dx: 0,
    dy: 0,
    nextDx: 0,
    nextDy: 0,
    isRunning: false,
    interval: null
};

// Initialize High Score UI
highScoreEl.textContent = currentState.highScore;

// Event Listeners
document.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', startGame);

function initGame() {
    currentState.snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    currentState.score = 0;
    currentState.tier = 0;
    scoreEl.textContent = 0;

    currentState.dx = 1;
    currentState.dy = 0;
    currentState.nextDx = 1;
    currentState.nextDy = 0;

    updateTheme(0);
    generateNewRound();
}

function generateNewRound() {
    // 1. Generate Question based on current Tier
    currentState.currentQuestion = mathEngine.generateQuestion(currentState.tier);

    // Update UI (We need to add this element to HTML later, for now render on canvas)
    // gameStatus is used for "READY?" but we can use a new element or draw text.
    // Let's rely on draw() to show question for now.

    // 2. Spawn 3 Foods (1 Correct, 2 Distractors)
    currentState.foods = [];

    // Position 1: Correct Answer
    spawnSingleFood(currentState.currentQuestion.answer, true);

    // Position 2 & 3: Distractors
    currentState.currentQuestion.distractors.forEach(distractor => {
        spawnSingleFood(distractor, false);
    });

    // 3. Chance to Spawn Powerup (10%)
    if (Math.random() < 0.1 && currentState.powerups.length === 0) {
        spawnPowerup();
    }
}

function spawnPowerup() {
    const types = ['bomb', 'potion'];
    const type = types[Math.floor(Math.random() * types.length)];

    let valid = false;
    let p = { x: 0, y: 0, type };

    while (!valid) {
        p.x = Math.floor(Math.random() * TILE_COUNT);
        p.y = Math.floor(Math.random() * TILE_COUNT);
        valid = true;

        // Check snake
        for (let s of currentState.snake) if (s.x === p.x && s.y === p.y) valid = false;
        // Check food
        for (let f of currentState.foods) if (f.x === p.x && f.y === p.y) valid = false;
    }
    currentState.powerups.push(p);
}

function spawnSingleFood(value, isCorrect) {
    let validPosition = false;
    let newFood = { x: 0, y: 0, value, isCorrect };

    while (!validPosition) {
        newFood.x = Math.floor(Math.random() * TILE_COUNT);
        newFood.y = Math.floor(Math.random() * TILE_COUNT);

        validPosition = true;

        // Check collision with Snake
        for (let part of currentState.snake) {
            if (part.x === newFood.x && part.y === newFood.y) {
                validPosition = false;
                break;
            }
        }

        // Check collision with other Foods
        if (validPosition) {
            for (let existingFood of currentState.foods) {
                if (existingFood.x === newFood.x && existingFood.y === newFood.y) {
                    validPosition = false;
                    break;
                }
            }
        }
    }
    currentState.foods.push(newFood);
}

function startGame() {
    initGame();
    currentState.isRunning = true;
    uiLayer.classList.add('hidden');
    if (currentState.interval) clearInterval(currentState.interval);
    currentState.interval = setInterval(gameLoop, GAME_SPEED);
}

function gameLoop() {
    if (!currentState.isRunning) return;

    moveSnake();

    if (checkCollision()) {
        gameOver();
        return;
    }

    const eatenFoodIndex = checkFoodCollision();
    if (eatenFoodIndex !== -1) {
        handleEating(eatenFoodIndex);
    } else {
        currentState.snake.pop(); // Remove tail if not eating
    }

    const eatenPowerupIndex = checkPowerupCollision();
    if (eatenPowerupIndex !== -1) {
        handlePowerup(eatenPowerupIndex);
    }

    draw();
}

function moveSnake() {
    currentState.dx = currentState.nextDx;
    currentState.dy = currentState.nextDy;

    const head = {
        x: currentState.snake[0].x + currentState.dx,
        y: currentState.snake[0].y + currentState.dy
    };
    currentState.snake.unshift(head);
}

function checkCollision() {
    const head = currentState.snake[0];

    // Wall
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        return true;
    }

    // Self
    for (let i = 1; i < currentState.snake.length; i++) {
        if (head.x === currentState.snake[i].x && head.y === currentState.snake[i].y) {
            return true;
        }
    }

    return false;
}

function checkFoodCollision() {
    const head = currentState.snake[0];
    return currentState.foods.findIndex(f => f.x === head.x && f.y === head.y);
}

function checkPowerupCollision() {
    const head = currentState.snake[0];
    return currentState.powerups.findIndex(p => p.x === head.x && p.y === head.y);
}

function handlePowerup(index) {
    const powerup = currentState.powerups[index];

    // Effect
    if (powerup.type === 'bomb') {
        // Clear all distractors
        currentState.foods = currentState.foods.filter(f => f.isCorrect);
        // Visual flash (simple console for now)
    } else if (powerup.type === 'potion') {
        // Grow snake by 2 (push tail copies)
        const tail = currentState.snake[currentState.snake.length - 1];
        currentState.snake.push({ ...tail });
        currentState.snake.push({ ...tail });
    }

    currentState.powerups.splice(index, 1);
}

function handleEating(index) {
    const eatenFood = currentState.foods[index];

    if (eatenFood.isCorrect) {
        // Correct Answer
        currentState.score += 5;
        scoreEl.textContent = currentState.score;

        // Check Level Up (Every 5*5 = 25 points? No, user said every 5 answers -> 5 items)
        // Let's stick to simple Score Thresholds for now implementation logic.
        // Bronze < 25, Silver < 50, Gold < 75... 
        // Or simply: increment tier every 5 correct answers.

        // Check Tier Update
        const nextTier = Math.floor(currentState.score / 25);
        if (nextTier > currentState.tier && nextTier < 4) {
            currentState.tier = nextTier;
            updateTheme(currentState.tier);
        }

        // Generate New Round (Question + Foods)
        // Snake grows (we don't pop tail in gameLoop)
        generateNewRound();

    } else {
        // Wrong Answer
        // Shrink Snake: remove the tail that was just added (so effectively no growth) + remove another segment
        currentState.snake.pop(); // Revert the growth that happens by default (since we didn't pop in gameLoop yet? Wait logic in gameLoop says "else pop". So if we hit food, we DON'T pop. So snake grows +1.)
        // If we want to shrink, we need to pop TWICE? 
        // 1. We hit food -> loop doesn't pop. Length +1.
        // 2. We want net -1. So we pop 2 items.

        currentState.snake.pop();
        currentState.snake.pop();

        // Score Penalty
        currentState.score = Math.max(0, currentState.score - 2);
        scoreEl.textContent = currentState.score;

        // Remove the eaten option
        currentState.foods.splice(index, 1);

        // Check Death by Shrink
        if (currentState.snake.length < 3) {
            gameOver();
        }
    }
}

function handleInput(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    if (!currentState.isRunning) return;

    switch (e.key) {
        case 'ArrowUp':
            if (currentState.dy === 0) { currentState.nextDx = 0; currentState.nextDy = -1; }
            break;
        case 'ArrowDown':
            if (currentState.dy === 0) { currentState.nextDx = 0; currentState.nextDy = 1; }
            break;
        case 'ArrowLeft':
            if (currentState.dx === 0) { currentState.nextDx = -1; currentState.nextDy = 0; }
            break;
        case 'ArrowRight':
            if (currentState.dx === 0) { currentState.nextDx = 1; currentState.nextDy = 0; }
            break;
    }
}

function gameOver() {
    currentState.isRunning = false;
    clearInterval(currentState.interval);

    if (currentState.score > currentState.highScore) {
        currentState.highScore = currentState.score;
        localStorage.setItem('snakeHighScore', currentState.highScore);
        highScoreEl.textContent = currentState.highScore;
    }

    gameStatus.textContent = "GAME OVER";
    startBtn.textContent = "TRY AGAIN";
    uiLayer.classList.remove('hidden');
}

function draw() {
    // Get current theme colors
    const style = getComputedStyle(document.body);
    const canvasBg = style.getPropertyValue('--canvas-bg').trim();
    const primaryColor = style.getPropertyValue('--primary-color').trim();
    const accentColor = style.getPropertyValue('--accent-color').trim();

    // Clear canvas
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Current Question (Top Center)
    if (currentState.currentQuestion) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = 'bold 30px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentState.currentQuestion.text, canvas.width / 2, canvas.height / 2);
    }

    // Draw Snake
    currentState.snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? accentColor : primaryColor;
        ctx.shadowBlur = index === 0 ? 15 : 0;
        ctx.shadowColor = primaryColor;

        const pad = 1;
        ctx.fillRect(
            part.x * GRID_SIZE + pad,
            part.y * GRID_SIZE + pad,
            GRID_SIZE - 2 * pad,
            GRID_SIZE - 2 * pad
        );
        ctx.shadowBlur = 0;
    });

    // Draw Foods
    currentState.foods.forEach(food => {
        // Different color for different items? Hidden?
        // User wants "3 balls with numbers". Player must identify which is correct.
        // We shouldn't color code them as "correct/wrong" visually, or it's too easy.
        // They should look similar or random colors.

        ctx.fillStyle = '#3b82f6';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#3b82f6';

        // Circle background
        ctx.beginPath();
        const cx = food.x * GRID_SIZE + GRID_SIZE / 2;
        const cy = food.y * GRID_SIZE + GRID_SIZE / 2;
        ctx.arc(cx, cy, GRID_SIZE / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(food.value, cx, cy);
    });

    // Draw Powerups
    currentState.powerups.forEach(p => {
        const cx = p.x * GRID_SIZE + GRID_SIZE / 2;
        const cy = p.y * GRID_SIZE + GRID_SIZE / 2;

        ctx.shadowBlur = 10;
        if (p.type === 'bomb') {
            ctx.fillStyle = '#ef4444'; // Red
            ctx.shadowColor = '#ef4444';
            // Simple square
            ctx.fillRect(p.x * GRID_SIZE + 4, p.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8);
        } else {
            ctx.fillStyle = '#a855f7'; // Purple Potion
            ctx.shadowColor = '#a855f7';
            // Triangle
            ctx.beginPath();
            ctx.moveTo(cx, p.y * GRID_SIZE + 2);
            ctx.lineTo(p.x * GRID_SIZE + 2, p.y * GRID_SIZE + GRID_SIZE - 2);
            ctx.lineTo(p.x * GRID_SIZE + GRID_SIZE - 2, p.y * GRID_SIZE + GRID_SIZE - 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    });
}

function updateTheme(tier) {
    document.body.className = ''; // Clear existing
    const badge = document.getElementById('tier-badge');

    switch (tier) {
        case 1:
            document.body.classList.add('theme-silver');
            badge.textContent = 'SILVER';
            badge.style.borderColor = '#7DD3FC';
            break;
        case 2:
            document.body.classList.add('theme-gold');
            badge.textContent = 'GOLD';
            badge.style.borderColor = '#FDE047';
            break;
        case 3:
            document.body.classList.add('theme-diamond');
            badge.textContent = 'DIAMOND';
            badge.style.borderColor = '#F0ABFC';
            break;
        default:
            // Bronze
            badge.textContent = 'BRONZE';
            badge.style.borderColor = '#86EFAC';
            break;
    }
}
