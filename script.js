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
    interval: null,
    // FX State
    particles: [],
    shake: { x: 0, y: 0, duration: 0 }
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

    updateParticles();
    updateShake();
    draw();
}

function updateParticles() {
    for (let i = currentState.particles.length - 1; i >= 0; i--) {
        const p = currentState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;

        if (p.life <= 0) {
            currentState.particles.splice(i, 1);
        }
    }
}

function updateShake() {
    if (currentState.shake.duration > 0) {
        currentState.shake.x = (Math.random() - 0.5) * 10;
        currentState.shake.y = (Math.random() - 0.5) * 10;
        currentState.shake.duration--;
    } else {
        currentState.shake.x = 0;
        currentState.shake.y = 0;
    }
}

function spawnParticles(x, y, color, count = 10, type = 'burst') {
    // x, y are pixel coordinates (center of tile preferably)
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 0.5;
        currentState.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: Math.random() * 3 + 1,
            type: type
        });
    }
}

function triggerShake(duration = 10) {
    currentState.shake.duration = duration;
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
    const px = powerup.x * GRID_SIZE + GRID_SIZE / 2;
    const py = powerup.y * GRID_SIZE + GRID_SIZE / 2;

    if (powerup.type === 'bomb') {
        // Clear all distractors
        currentState.foods = currentState.foods.filter(f => f.isCorrect);
        // Shorten Snake (Blast damage!)
        if (currentState.snake.length > 3) {
            currentState.snake.splice(currentState.snake.length - 3, 3);
        }
        spawnParticles(px, py, '#ef4444', 20, 'explosion');
        triggerShake(15);
    } else if (powerup.type === 'potion') {
        const tail = currentState.snake[currentState.snake.length - 1];
        currentState.snake.push({ ...tail });
        currentState.snake.push({ ...tail });
        spawnParticles(px, py, '#ef4444', 15, 'sparkle'); // Golden Light
    } else if (powerup.type === 'chest') {
        // Treasure Chest Reward
        currentState.score += 50;
        scoreEl.textContent = currentState.score;
        // Visual effect needed? Floating text "+50"
        spawnParticles(px, py, '#fcd34d', 30, 'burst'); // Gold shower
        triggerShake(5);
    }

    currentState.powerups.splice(index, 1);
}

function handleEating(index) {
    const eatenFood = currentState.foods[index];

    if (eatenFood.isCorrect) {
        // Correct Answer
        currentState.score += 5;
        scoreEl.textContent = currentState.score;

        // FX: Small Burst + Tiny Shake
        const fx = eatenFood.x * GRID_SIZE + GRID_SIZE / 2;
        const fy = eatenFood.y * GRID_SIZE + GRID_SIZE / 2;
        spawnParticles(fx, fy, '#86EFAC', 8); // Green burst
        triggerShake(3);

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

        // FX: Penalty Shake + Grey Burst
        const fx = eatenFood.x * GRID_SIZE + GRID_SIZE / 2;
        const fy = eatenFood.y * GRID_SIZE + GRID_SIZE / 2;
        spawnParticles(fx, fy, '#94a3b8', 10);
        triggerShake(10);

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

    ctx.save();
    // Apply Screen Shake
    ctx.translate(currentState.shake.x, currentState.shake.y);

    // Draw Current Question (Top Center)
    if (currentState.currentQuestion) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = 'bold 30px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentState.currentQuestion.text, canvas.width / 2, canvas.height / 2);
    }

    // Draw Snake (Cartoon Style)
    currentState.snake.forEach((part, index) => {
        // Body Segment (Circle)
        const isHead = index === 0;
        const x = part.x * GRID_SIZE + GRID_SIZE / 2;
        const y = part.y * GRID_SIZE + GRID_SIZE / 2;
        const radius = GRID_SIZE / 2 + (isHead ? 2 : 1); // Head slightly bigger

        ctx.fillStyle = isHead ? accentColor : primaryColor;
        // Soft Shadow
        ctx.shadowBlur = 10;
        ctx.shadowColor = primaryColor;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Head Details (Eyes & Tongue)
        if (isHead) {
            const dx = currentState.dx;
            const dy = currentState.dy;

            // Tongue (Flicking out)
            if (Math.floor(Date.now() / 150) % 2 === 0) { // Flicker effect
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + dx * 10, y + dy * 10);
                ctx.lineTo(x + dx * 18, y + dy * 18);
                // Fork
                const angle = Math.atan2(dy, dx);
                ctx.moveTo(x + dx * 18, y + dy * 18);
                ctx.lineTo(x + dx * 18 + Math.cos(angle - 0.5) * 5, y + dy * 18 + Math.sin(angle - 0.5) * 5);
                ctx.moveTo(x + dx * 18, y + dy * 18);
                ctx.lineTo(x + dx * 18 + Math.cos(angle + 0.5) * 5, y + dy * 18 + Math.sin(angle + 0.5) * 5);
                ctx.stroke();
            }

            // Eyes (White Sclera + Black Pupil)
            // Calculate eye positions perpendicular to direction
            // Offset for left/right eye relative to center
            const eyeOffset = 6;
            const eyeRadius = 4;
            const pupilRadius = 1.5;

            // Perpendicular vector (-dy, dx) and (dy, -dx)
            const perpX = -dy;
            const perpY = dx;

            // Eye 1
            const ex1 = x + dx * 4 + perpX * eyeOffset;
            const ey1 = y + dy * 4 + perpY * eyeOffset;
            // Eye 2
            const ex2 = x + dx * 4 - perpX * eyeOffset;
            const ey2 = y + dy * 4 - perpY * eyeOffset;

            // Draw Scleras
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex1, ey1, eyeRadius, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex2, ey2, eyeRadius, 0, Math.PI * 2); ctx.fill();

            // Draw Pupils (looking forward)
            ctx.fillStyle = '#1e293b';
            const lx = dx * 2; // Look slightly forward
            const ly = dy * 2;
            ctx.beginPath(); ctx.arc(ex1 + lx, ey1 + ly, pupilRadius, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex2 + lx, ey2 + ly, pupilRadius, 0, Math.PI * 2); ctx.fill();
        }
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
            // Draw Food based on Tier
            switch (currentState.tier) {
                case 0: drawApple(food.x, food.y, food.value); break; // Bronze
                case 1: drawBurger(food.x, food.y, food.value); break; // Silver
                case 2: drawPizza(food.x, food.y, food.value); break; // Gold
                case 3: drawCake(food.x, food.y, food.value); break; // Diamond
                default: drawApple(food.x, food.y, food.value);
            }
        } else {
            // Draw Trap (Rotten/Spike)
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

    // Draw Particles
    currentState.particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    ctx.restore(); // Restore context (remove shake)
}

// --- Helper Draw Functions ---
// --- Helper Draw Functions ---
function drawApple(gx, gy, val) {
    const x = gx * GRID_SIZE + GRID_SIZE / 2;
    const y = gy * GRID_SIZE + GRID_SIZE / 2;
    // Red Body
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#f87171';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y + 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // Leaf
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 3, 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(x - 4, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    drawValueText(x, y + 2, val);
}

function drawBurger(gx, gy, val) {
    const x = gx * GRID_SIZE + GRID_SIZE / 2;
    const y = gy * GRID_SIZE + GRID_SIZE / 2;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#eaa221'; // Bun glow

    // Bottom Bun
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 2);
    ctx.quadraticCurveTo(x, y + 8, x + 8, y + 2);
    ctx.fill();

    // Meat
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 9, y, 18, 3);

    // Lettuce
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(x - 9, y - 2, 18, 2);

    // Top Bun
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x, y - 2, 8, Math.PI, 0);
    ctx.fill();

    drawValueText(x, y + 2, val);
}

function drawPizza(gx, gy, val) {
    const x = gx * GRID_SIZE + GRID_SIZE / 2;
    const y = gy * GRID_SIZE + GRID_SIZE / 2;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#facc15';

    // Triangle Slice
    ctx.fillStyle = '#facc15'; // Cheese
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x - 8, y + 8);
    ctx.quadraticCurveTo(x, y + 6, x + 8, y + 8);
    ctx.fill();

    // Crust
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 8);
    ctx.quadraticCurveTo(x, y + 6, x + 8, y + 8);
    ctx.stroke();

    // Pepperoni
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(x, y + 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 3, y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3, y - 2, 1.5, 0, Math.PI * 2); ctx.fill();

    drawValueText(x, y + 2, val);
}

function drawCake(gx, gy, val) {
    const x = gx * GRID_SIZE + GRID_SIZE / 2;
    const y = gy * GRID_SIZE + GRID_SIZE / 2;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#f472b6';

    // Layers (White / Pink)
    ctx.fillStyle = '#fce7f3'; // Sponge
    ctx.fillRect(x - 6, y, 12, 8);
    ctx.fillStyle = '#f472b6'; // Icing
    ctx.fillRect(x - 6, y - 4, 12, 4);

    // Cherry
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Candle
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(x - 1, y - 9, 2, 3);

    drawValueText(x, y + 4, val);
}

function drawValueText(x, y, val) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; // White text (Stroke back for contrast?)
    ctx.stokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 14px Roboto'; // Bigger font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(val, x, y);
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
