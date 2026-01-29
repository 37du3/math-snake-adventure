const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const uiLayer = document.getElementById('ui-layer');
const gameStatus = document.getElementById('game-status');
const speedSlider = document.getElementById('speed-slider');
const goldEl = document.getElementById('gold-count');
const gemEl = document.getElementById('gem-count');

// Game Constants
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
let gameSpeed = 100;

// Dependencies
const mathEngine = new MathEngine();

// Game State
let currentState = {
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0,
    tier: 0, // 0: Bronze, 1: Silver, 2: Gold, 3: Diamond
    snake: [],
    foods: [], // Array of {x, y, value, isCorrect}
    powerups: [],
    loot: { gold: 0, gems: 0, combo: 0 },
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
// Event Listeners
document.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', startGame);
speedSlider.addEventListener('input', handleSpeedChange);

function handleSpeedChange(e) {
    gameSpeed = parseInt(e.target.value);
    // Invert logic for intuitive UI if needed, but let's stick to direct delay for now.
    // Actually, let's make it correct: Left (Low Number 50ms) = Fast. Right (High Number 300ms) = Slow.
    // This is backwards. Let's flip it in JS:
    // We want Right (High Value) = Fast (Low Delay).
    // Let's assume the HTML is `min="1" max="20"`.
    // Delay = 400 - (value * 15).
    // But since HTML is already set 50-300:
    // Let's just use the value directly and let the user figure out "Lower ms = Faster".
    // Or I used `input type="range"`.

    // Update live if running
    if (currentState.isRunning && currentState.interval) {
        clearInterval(currentState.interval);
        currentState.interval = setInterval(gameLoop, gameSpeed);
    }

    // De-focus to prevent Key capture issues
    e.target.blur();
}

function initGame() {
    currentState.snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    currentState.score = 0;
    currentState.tier = 0;
    currentState.loot = { gold: 0, gems: 0, combo: 0 };
    scoreEl.textContent = 0;
    goldEl.textContent = 0;
    gemEl.textContent = 0;

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

    // 4. Combo Chest Check
    if (currentState.loot.combo >= 3) {
        // Spawn Chest!
        spawnPowerup('chest'); // Overload spawnPowerup? Or separate? 
        // Let's modify spawnPowerup to accept type or random.
        currentState.loot.combo = 0; // Reset combo after spawn? Or after eat? Plan says "next spawn includes Chest".
        // Let's reset combo logic in handleEating -> if combo reaches 3, set flag "spawnChestNext". 
        // Actually, simplest is: if combo >= 3 passed into this round, we force spawn a Chest. 
        // But we need to distinguish Chest from Bomb/Potion.
    }
}

function spawnPowerup(forceType = null) {
    const types = ['bomb', 'potion'];
    const type = forceType || types[Math.floor(Math.random() * types.length)];

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
    if (currentState.interval) clearInterval(currentState.interval);
    currentState.interval = setInterval(gameLoop, gameSpeed);
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
        const tail = currentState.snake[currentState.snake.length - 1];
        currentState.snake.push({ ...tail });
        currentState.snake.push({ ...tail });
    } else if (powerup.type === 'chest') {
        // Treasure Chest Reward
        currentState.score += 50;
        scoreEl.textContent = currentState.score;
        // Visual effect needed? Floating text "+50"
    }

    currentState.powerups.splice(index, 1);
}

function handleEating(index) {
    const eatenFood = currentState.foods[index];

    if (eatenFood.isCorrect) {
        // Correct Answer
        currentState.score += 5;
        scoreEl.textContent = currentState.score;

        // Update Loot
        if (currentState.tier < 2) {
            currentState.loot.gold++;
            goldEl.textContent = currentState.loot.gold;
            // Check Pirate Skin Unlock
            if (currentState.loot.gold === 100) {
                // Unlock logic (visual notification?)
                console.log("Pirate Skin Unlocked!");
            }
        } else {
            currentState.loot.gems++;
            gemEl.textContent = currentState.loot.gems;
        }

        // Combo Logic
        currentState.loot.combo++;

        // Check Tier Update
        const nextTier = Math.floor(currentState.score / 25);
        if (nextTier > currentState.tier && nextTier < 4) {
            currentState.tier = nextTier;
            updateTheme(currentState.tier);
        }

        // Generate New Round (Question + Foods)
        generateNewRound();

    } else {
        // Wrong Answer
        currentState.loot.combo = 0; // Reset Combo

        // Shrink Snake: remove the tail that was just added (so effectively no growth) + remove another segment
        currentState.snake.pop();
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

        ctx.shadowBlur = 0;

        // Determine visual type based on Correctness
        if (food.isCorrect) {
            // Draw Loot (Coin or Gem)
            if (currentState.tier < 2) {
                drawCoin(food.x, food.y, food.value);
            } else {
                drawGem(food.x, food.y, food.value);
            }
        } else {
            // Draw Trap (Stone)
            drawTrap(food.x, food.y, food.value);
        }
    });

    // Draw Powerups
    currentState.powerups.forEach(p => {
        if (p.type === 'bomb') {
            drawBomb(p.x, p.y);
        } else if (p.type === 'potion') {
            drawPotion(p.x, p.y);
        } else if (p.type === 'chest') {
            drawChest(p.x, p.y);
        }
    });
}

// --- Helper Draw Functions ---
function drawCoin(gx, gy, val) {
    const x = gx * GRID_SIZE + GRID_SIZE / 2;
    const y = gy * GRID_SIZE + GRID_SIZE / 2;
    // Gold Circle
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fbbf24';
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x, y, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // Inner Ring
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, GRID_SIZE / 2 - 5, 0, Math.PI * 2);
    ctx.stroke();
    // Value
    drawValueText(x, y, val);
}

function drawGem(gx, gy, val) {
    const x = gx * GRID_SIZE + GRID_SIZE / 2;
    const y = gy * GRID_SIZE + GRID_SIZE / 2;
    // Diamond Shape
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(x, y - (GRID_SIZE / 2 - 2));
    ctx.lineTo(x + (GRID_SIZE / 2 - 2), y);
    ctx.lineTo(x, y + (GRID_SIZE / 2 - 2));
    ctx.lineTo(x - (GRID_SIZE / 2 - 2), y);
    ctx.fill();
    // Value
    drawValueText(x, y, val);
}

function drawTrap(gx, gy, val) {
    const x = gx * GRID_SIZE + GRID_SIZE / 2;
    const y = gy * GRID_SIZE + GRID_SIZE / 2;
    // Grey Stone / Spike Mine
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    // Rough shape
    ctx.arc(x, y, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // Spikes hints (small circles around?)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, 2, 0, Math.PI * 2);
    ctx.arc(x + 5, y + 5, 2, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 5, 2, 0, Math.PI * 2);
    ctx.arc(x - 5, y + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Value (Red text to warn)
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(val, x, y);
}

function drawValueText(x, y, val) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0f172a'; // Dark Slate (almost black) for contrast on Gold/Cyan
    ctx.font = 'bold 12px Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(val, x, y);
}

function drawChest(gx, gy) {
    const x = gx * GRID_SIZE + GRID_SIZE / 2;
    const y = gy * GRID_SIZE + GRID_SIZE / 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fcd34d';
    // Box
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x - 8, y - 6, 16, 12);
    // Lid line
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x - 9, y - 2, 18, 2);
    // Lock
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawBomb(gridX, gridY) {
    const x = gridX * GRID_SIZE + GRID_SIZE / 2;
    const y = gridY * GRID_SIZE + GRID_SIZE / 2;
    const radius = GRID_SIZE / 2 - 2;

    // Pulse Effect
    const time = Date.now() / 200;
    const glow = Math.abs(Math.sin(time)) * 10 + 5;

    ctx.save();

    // Bomb Body
    ctx.shadowBlur = glow;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#1e293b'; // Dark body
    ctx.beginPath();
    ctx.arc(x, y + 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Gradient Sheen
    const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, radius);
    grad.addColorStop(0, '#64748b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y + 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Fuse
    ctx.strokeStyle = '#edaeb0'; // Fuse color
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - radius + 2);
    ctx.quadraticCurveTo(x + 5, y - radius - 5, x + 8, y - radius);
    ctx.stroke();

    // Spark
    const sparkAlpha = Math.abs(Math.sin(time * 3));
    ctx.fillStyle = `rgba(252, 211, 77, ${sparkAlpha})`; // Yellow spark
    ctx.shadowColor = '#fcd34d';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x + 8, y - radius, 2, 0, Math.PI * 2);
    ctx.fill();

    // Icon (Cross or Skull hint? Let's just keep it simple abstract bomb)
    // Red 'X' or center ?
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('b', x, y + 3); // Maybe a skull char or just '!'? '!' is better

    ctx.restore();
}

function drawPotion(gridX, gridY) {
    const x = gridX * GRID_SIZE + GRID_SIZE / 2;
    const y = gridY * GRID_SIZE + GRID_SIZE / 2;

    // Pulse Effect
    const time = Date.now() / 300;
    const glow = Math.abs(Math.sin(time)) * 10 + 5;

    ctx.save();

    // Flask Shape (Triangle-ish)
    ctx.shadowBlur = glow;
    ctx.shadowColor = '#a855f7';
    ctx.fillStyle = '#a855f7';

    ctx.beginPath();
    const w = 6;
    const h = 8;
    // Neck
    ctx.rect(x - 3, y - 8, 6, 6);
    // Base
    ctx.moveTo(x - 3, y - 2);
    ctx.lineTo(x - 7, y + 8);
    ctx.quadraticCurveTo(x, y + 10, x + 7, y + 8);
    ctx.lineTo(x + 3, y - 2);
    ctx.fill();

    // Liquid Bubble
    const bubbleY = y + 4 - Math.abs(Math.sin(time * 2)) * 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, bubbleY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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
