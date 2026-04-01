let currentScreen = 'title';
let selectedFaculty = '';
let canvas;
let ctx;

const player = {
    x: 100,
    y: 280,
    width: 40,
    height: 40,
    velocityY: 0,
    isJumping: false,
    jumpPower: 10,
    scoreMultiplier: 1.0,
    shield: 0,
    jumpCount: 0,
    canDoubleJump: false
};

const groundY = 320;
let scrollSpeed = 5;
let groundOffset = 0;
const groundWidth = 50;
let obstacles = [];
let gameOver = false;
let obstacleSpawnTimer = 0;
let distance = 0;
const clearDistance = 5000;

let playerImages = {};
let obstacleImages = {};
let backgroundImages = {};
let imagesLoaded = false;

let gameState = 'playing';
let shakeTimer = 0;
let flashTimer = 0;
let clearEffectTimer = 0;
let jumpParticles = [];

const titleScreen = document.getElementById('title-screen');
const facultyScreen = document.getElementById('faculty-screen');
const gameScreen = document.getElementById('game-screen');
const clearScreen = document.getElementById('clear-screen');
const startButton = document.getElementById('start-button');
const facultyButtons = document.querySelectorAll('.faculty-button');
const backToTitleButton = document.getElementById('back-to-title-button');
const scoreDisplay = document.getElementById('score-display');
const gameOverMessage = document.getElementById('game-over-message');
const playAgainButton = document.getElementById('play-again-button');
const playAgainFromClearButton = document.getElementById('play-again-from-clear-button');
const distanceDisplay = document.getElementById('distance-display');
const controlHint = document.getElementById('control-hint');
const selectedFacultyDisplay = document.getElementById('selected-faculty-display');
const facultyFeatureDisplay = document.getElementById('faculty-feature-display');
const facultyInfo = document.getElementById('faculty-info');
const startGameButton = document.getElementById('start-game-button');
const backToTitleFromFaculty = document.getElementById('back-to-title-from-faculty');

// スマホ判定: タッチ中心デバイスなら案内文を切り替える
function isMobileLikeDevice() {
    return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}

function updateControlHint() {
    if (!controlHint) return;
    controlHint.textContent = isMobileLikeDevice()
        ? 'タップでジャンプ！'
        : 'スペースキーでジャンプ！';
}

startButton.addEventListener('click', () => {
    showScreen('faculty');
});

facultyButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
        facultyButtons.forEach((btn) => btn.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedFaculty = e.target.dataset.faculty;

        selectedFacultyDisplay.textContent = `選んだ学部: ${selectedFaculty}`;

        let feature = '';
        if (selectedFaculty === '社会学部') {
            feature = '二段ジャンプ可能';
        } else if (selectedFaculty === '経済学部') {
            feature = 'スコア加算が高い';
        } else if (selectedFaculty === '法学部') {
            feature = '1回だけ障害物に耐えられる';
        }

        facultyFeatureDisplay.textContent = `特徴: ${feature}`;
        facultyInfo.classList.remove('hidden');
        startGameButton.classList.remove('hidden');
    });
});

startGameButton.addEventListener('click', () => {
    if (!selectedFaculty) return;
    showScreen('game');
    startGame();
});

backToTitleFromFaculty.addEventListener('click', () => {
    showScreen('title');
});

playAgainButton.addEventListener('click', () => {
    resetGame();
});

playAgainFromClearButton.addEventListener('click', () => {
    showScreen('faculty');
});

backToTitleButton.addEventListener('click', () => {
    showScreen('title');
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && currentScreen === 'game' && !gameOver) {
        e.preventDefault();
        jump();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && currentScreen === 'game' && !gameOver) {
        e.preventDefault();
    }
});

// スマホ操作対応:
// ゲーム画面をタップしたらジャンプできるようにする
function handleGameTapJump(e) {
    if (currentScreen !== 'game' || gameOver || gameState !== 'playing') return;
    if (e.target.closest('button')) return; // ボタンタップ時は誤ジャンプしない
    e.preventDefault();
    jump();
}

if (window.PointerEvent) {
    gameScreen.addEventListener('pointerdown', handleGameTapJump);
} else {
    gameScreen.addEventListener('touchstart', handleGameTapJump, { passive: false });
}
window.addEventListener('resize', updateControlHint);

function showScreen(screen) {
    titleScreen.classList.add('hidden');
    facultyScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    clearScreen.classList.add('hidden');

    if (screen === 'title') titleScreen.classList.remove('hidden');
    if (screen === 'faculty') facultyScreen.classList.remove('hidden');
    if (screen === 'game') gameScreen.classList.remove('hidden');
    if (screen === 'clear') clearScreen.classList.remove('hidden');

    currentScreen = screen;
}

function applyFacultyAbility() {
    if (selectedFaculty === '社会学部') {
        player.jumpPower = 10;
        player.scoreMultiplier = 1.0;
        player.shield = 0;
        player.canDoubleJump = true;
    } else if (selectedFaculty === '経済学部') {
        player.jumpPower = 10;
        player.scoreMultiplier = 1.2;
        player.shield = 0;
        player.canDoubleJump = false;
    } else if (selectedFaculty === '法学部') {
        player.jumpPower = 10;
        player.scoreMultiplier = 1.0;
        player.shield = 1;
        player.canDoubleJump = false;
    }
}

function startGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    obstacles = [];
    gameOver = false;
    obstacleSpawnTimer = 0;
    distance = 0;
    groundOffset = 0;

    player.x = 100;
    player.y = groundY - player.height;
    player.velocityY = 0;
    player.isJumping = false;
    player.jumpCount = 0;

    applyFacultyAbility();

    distanceDisplay.textContent = '走行距離: 0 ピクセル';
    gameOverMessage.classList.add('hidden');
    playAgainButton.classList.add('hidden');

    gameState = 'playing';
    shakeTimer = 0;
    flashTimer = 0;
    clearEffectTimer = 0;
    jumpParticles = [];

    gameLoop();
}

function gameLoop() {
    if (gameState === 'playing' && !gameOver) {
        update();
        updateEffects();
        draw();
    } else if (gameState === 'gameover' || gameState === 'clear') {
        updateEffects();
        draw();
    }

    setTimeout(gameLoop, 1000 / 60);
}

function update() {
    if (gameState !== 'playing') return;

    groundOffset += scrollSpeed;
    groundOffset %= groundWidth;

    if (player.isJumping) {
        player.velocityY += 0.5;
        player.y += player.velocityY;

        if (player.y >= groundY - player.height) {
            player.y = groundY - player.height;
            player.velocityY = 0;
            player.isJumping = false;
            player.jumpCount = 0;
        }
    }

    obstacleSpawnTimer++;
    if (obstacleSpawnTimer > 40) {
        spawnObstacle();
        obstacleSpawnTimer = 0;
    }

    obstacles.forEach((obs, index) => {
        obs.x -= obs.speed;
        if (obs.x + obs.width < 0) {
            obstacles.splice(index, 1);
        }
    });

    checkCollision();

    distance += scrollSpeed * player.scoreMultiplier;
    distanceDisplay.textContent = `走行距離: ${Math.floor(distance)} ピクセル`;

    if (distance >= clearDistance) {
        gameClear();
    }
}

function drawBackground() {
    let bgImage = null;

    if (distance < 1666) {
        bgImage = backgroundImages.station;
    } else if (distance < 3333) {
        bgImage = backgroundImages.road;
    } else {
        bgImage = backgroundImages.momoyama;
    }

    if (imagesLoaded && bgImage && bgImage.complete) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        return;
    }

    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#228b22';
    ctx.fillRect(200, 100, 100, 50);
    ctx.fillRect(400, 120, 80, 40);

    ctx.fillStyle = '#696969';
    ctx.fillRect(600, 150, 50, 100);
    ctx.fillRect(700, 180, 40, 70);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawEffects();
    drawBackground();

    ctx.fillStyle = '#8b4513';
    for (let i = -groundWidth; i < canvas.width + groundWidth; i += groundWidth) {
        ctx.fillRect(i - groundOffset, groundY, groundWidth, canvas.height - groundY);
    }

    obstacles.forEach((obs) => {
        if (imagesLoaded && obstacleImages[obs.type] && obstacleImages[obs.type].complete) {
            ctx.drawImage(obstacleImages[obs.type], obs.x, obs.y, obs.width, obs.height);
            return;
        }

        ctx.fillStyle = obs.type === 'car' ? '#0000ff' : '#00ff00';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });

    let playerImageKey = '';
    if (selectedFaculty === '社会学部') playerImageKey = 'social';
    if (selectedFaculty === '経済学部') playerImageKey = 'economics';
    if (selectedFaculty === '法学部') playerImageKey = 'law';

    if (imagesLoaded && playerImages[playerImageKey] && playerImages[playerImageKey].complete) {
        ctx.drawImage(playerImages[playerImageKey], player.x, player.y, player.width, player.height);
        return;
    }

    let playerColor = '#ff0000';
    if (selectedFaculty === '社会学部') playerColor = '#ffa500';
    if (selectedFaculty === '経済学部') playerColor = '#0000ff';
    if (selectedFaculty === '法学部') playerColor = '#ff0000';

    ctx.fillStyle = playerColor;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function jump() {
    if (gameState !== 'playing') return;

    if (player.canDoubleJump) {
        if (!player.isJumping || player.jumpCount < 2) {
            player.velocityY = -player.jumpPower;
            player.jumpCount++;
            if (player.jumpCount === 1) player.isJumping = true;
            spawnJumpParticles();
        }
        return;
    }

    if (!player.isJumping) {
        player.velocityY = -player.jumpPower;
        player.isJumping = true;
        spawnJumpParticles();
    }
}

function spawnJumpParticles() {
    for (let i = 0; i < 5; i++) {
        jumpParticles.push({
            x: player.x + Math.random() * player.width,
            y: player.y + player.height,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2 - 1,
            life: 30
        });
    }
}

function spawnObstacle() {
    const type = Math.random() < 0.5 ? 'car' : 'bicycle';
    const width = type === 'car' ? 60 : 42;
    const height = type === 'car' ? 20 : 24;

    obstacles.push({
        x: canvas.width,
        y: groundY - height,
        width,
        height,
        type,
        speed: scrollSpeed + 1
    });
}

function checkCollision() {
    obstacles.forEach((obs) => {
        const hit =
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y;

        if (!hit) return;

        if (selectedFaculty === '法学部' && player.shield > 0) {
            player.shield--;
            obstacles.splice(obstacles.indexOf(obs), 1);
            playSound('shield');
            return;
        }

        gameOver = true;
        gameState = 'gameover';
        shakeTimer = 30;
        gameOverMessage.classList.remove('hidden');
        playAgainButton.classList.remove('hidden');
        playSound('gameover');
    });
}

function resetGame() {
    showScreen('game');

    player.x = 100;
    player.y = groundY - player.height;
    player.velocityY = 0;
    player.isJumping = false;
    player.jumpCount = 0;

    applyFacultyAbility();

    obstacles = [];
    gameOver = false;
    obstacleSpawnTimer = 0;
    distance = 0;
    groundOffset = 0;

    distanceDisplay.textContent = '走行距離: 0 ピクセル';
    gameOverMessage.classList.add('hidden');
    playAgainButton.classList.add('hidden');

    gameState = 'playing';
    shakeTimer = 0;
    flashTimer = 0;
    clearEffectTimer = 0;
    jumpParticles = [];
}

function gameClear() {
    gameOver = true;
    gameState = 'clear';
    clearEffectTimer = 120;

    scoreDisplay.textContent = `${selectedFaculty} - 走行距離: ${Math.floor(distance)} ピクセル`;
    showScreen('clear');
    playSound('clear');
}

function initImages() {
    playerImages.social = new Image();
    playerImages.social.src = 'assets/player_social.png';
    playerImages.economics = new Image();
    playerImages.economics.src = 'assets/player_economics.png';
    playerImages.law = new Image();
    playerImages.law.src = 'assets/player_law.png';

    obstacleImages.car = new Image();
    obstacleImages.car.src = 'assets/car.png';
    obstacleImages.bicycle = new Image();
    obstacleImages.bicycle.src = 'assets/bicycle.png';

    backgroundImages.station = new Image();
    backgroundImages.station.src = 'assets/bg_station.png';
    backgroundImages.road = new Image();
    backgroundImages.road.src = 'assets/bg_road.png';
    backgroundImages.momoyama = new Image();
    backgroundImages.momoyama.src = 'assets/bg_momoyama.png';

    let loadedCount = 0;
    const totalImages = 8;

    const checkLoaded = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
            imagesLoaded = true;
        }
    };

    Object.values(playerImages).forEach((img) => {
        img.onload = checkLoaded;
        img.onerror = checkLoaded;
    });

    Object.values(obstacleImages).forEach((img) => {
        img.onload = checkLoaded;
        img.onerror = checkLoaded;
    });

    Object.values(backgroundImages).forEach((img) => {
        img.onload = checkLoaded;
        img.onerror = checkLoaded;
    });
}

window.addEventListener('load', initImages);

function updateEffects() {
    jumpParticles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life <= 0) {
            jumpParticles.splice(index, 1);
        }
    });

    if (shakeTimer > 0) shakeTimer--;
    if (flashTimer > 0) flashTimer--;
    if (clearEffectTimer > 0) clearEffectTimer--;
}

function drawEffects() {
    if (shakeTimer > 0) {
        const shakeX = (Math.random() - 0.5) * 10;
        const shakeY = (Math.random() - 0.5) * 10;
        ctx.translate(shakeX, shakeY);
    }

    if (flashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = '#8b4513';
    jumpParticles.forEach((p) => {
        ctx.fillRect(p.x, p.y, 2, 2);
    });

    if (clearEffectTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#4caf50';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('桃山学院大学に到着！！', canvas.width / 2, canvas.height / 2);
    }

    if (shakeTimer > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

function playSound(type) {
    try {
        if (type === 'jump') {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        }
    } catch (_error) {
        // no-op
    }
}

updateControlHint();
showScreen('title');
