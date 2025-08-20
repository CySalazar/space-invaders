// Space Invaders - Modern Version
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'start'; // start, playing, paused, gameOver
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.keys = {};
        
        // Combo system
        this.combo = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.maxCombo = 0;
        this.lastHitTime = 0;
        
        // Game objects
        this.player = new Player(this.width / 2, this.height - 50);
        this.bullets = [];
        this.enemyBullets = [];
        this.invaders = [];
        this.particles = [];
        this.powerUps = [];
        this.meteors = [];
        this.boss = null;
        
        // Upgrade system
        this.upgrades = {
            damage: 1,
            fireRate: 1,
            speed: 1,
            luck: 1
        };
        this.upgradePoints = 0;
        
        // Timing
        this.lastTime = 0;
        this.invaderDirection = 1;
        this.invaderSpeed = 1;
        this.lastInvaderShot = 0;
        this.powerUpSpawnTimer = 0;
        this.meteorSpawnTimer = 0;
        this.bossSpawnTimer = 0;
        
        // Game mode
        this.gameMode = 'normal'; // 'normal' or 'timeAttack'
        this.timeAttackDuration = 120; // 2 minutes in seconds
        this.timeAttackTimer = 0;
        this.timeAttackObjectives = {
            score: 5000,
            combo: 10,
            meteorsDestroyed: 5
        };
        this.meteorsDestroyed = 0;
        this.objectivesCompleted = false;
        
        // Audio context
        this.audioContext = null;
        this.sounds = {};
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initAudio();
        this.createInvaders();
        this.updateModeIndicator();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.player.shoot(this.bullets);
                    this.playSound('shoot');
                }
            }
            
            if (e.code === 'KeyP') {
                this.togglePause();
            }
            if (e.code === 'KeyT' && this.gameState !== 'playing') {
                this.toggleGameMode();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // UI buttons
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    createSounds() {
        // Crea suoni sintetici
        this.sounds.shoot = this.createTone(800, 0.1, 'square');
        this.sounds.explosion = this.createTone(200, 0.3, 'sawtooth');
        this.sounds.powerUp = this.createTone(1200, 0.2, 'sine');
        this.sounds.enemyHit = this.createTone(400, 0.15, 'triangle');
    }
    
    createTone(frequency, duration, type = 'sine') {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }
    
    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('startScreen').style.display = 'none';
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseScreen').style.display = 'block';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseScreen').style.display = 'none';
        }
    }
    
    restartGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.combo = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.maxCombo = 0;
        this.meteorsDestroyed = 0;
        this.timeAttackTimer = 0;
        this.objectivesCompleted = false;
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerUps = [];
        this.meteors = [];
        this.boss = null;
        this.player = new Player(this.width / 2, this.height - 50);
        this.createInvaders();
        this.gameState = 'playing';
        document.getElementById('gameOver').style.display = 'none';
        this.updateUI();
    }
    
    createInvaders() {
        this.invaders = [];
        const rows = 5;
        const cols = 10;
        const spacing = 60;
        const startX = (this.width - (cols - 1) * spacing) / 2;
        const startY = 80;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * spacing;
                const y = startY + row * spacing;
                const type = row < 2 ? 'fast' : row < 4 ? 'normal' : 'heavy';
                this.invaders.push(new Invader(x, y, type));
            }
        }
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Update player
        this.player.update(this.keys, this.width);
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.y > 0;
        });
        
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update();
            return bullet.y < this.height;
        });
        
        // Update invaders
        this.updateInvaders(deltaTime);
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.life > 0;
        });
        
        // Update power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.update();
            return powerUp.y < this.height;
        });
        
        // Update meteors
        this.meteors = this.meteors.filter(meteor => {
            meteor.update();
            return meteor.y < this.height && meteor.health > 0;
        });
        
        // Update boss
        if (this.boss) {
            this.boss.update(this.player.x);
            if (this.boss.health <= 0) {
                this.createExplosion(this.boss.x + this.boss.width/2, this.boss.y + this.boss.height/2);
                this.score += 1000 * this.comboMultiplier;
                this.addCombo();
                this.boss = null;
                this.upgradePoints += 3;
            }
        }
        
        // Update combo system
        this.updateCombo(deltaTime);
        
        // Update time attack mode
        this.updateTimeAttack();
        
        // Check collisions
        this.checkCollisions();
        
        // Spawn power-ups
        this.spawnPowerUps(deltaTime);
        
        // Spawn meteors
        this.spawnMeteors(deltaTime);
        
        // Spawn boss
        this.spawnBoss(deltaTime);
        
        // Check win/lose conditions
        this.checkGameState();
    }
    
    updateInvaders(deltaTime) {
        let moveDown = false;
        
        // Check if invaders hit screen edge
        for (let invader of this.invaders) {
            if ((invader.x <= 0 && this.invaderDirection === -1) || 
                (invader.x >= this.width - 40 && this.invaderDirection === 1)) {
                moveDown = true;
                break;
            }
        }
        
        if (moveDown) {
            this.invaderDirection *= -1;
            for (let invader of this.invaders) {
                invader.y += 20;
            }
        }
        
        // Move invaders
        for (let invader of this.invaders) {
            invader.x += this.invaderDirection * this.invaderSpeed;
            invader.update();
        }
        
        // Invader shooting
        this.lastInvaderShot += deltaTime;
        if (this.lastInvaderShot > 1000 + Math.random() * 2000) {
            this.invaderShoot();
            this.lastInvaderShot = 0;
        }
    }
    
    invaderShoot() {
        if (this.invaders.length === 0) return;
        
        const shooter = this.invaders[Math.floor(Math.random() * this.invaders.length)];
        this.enemyBullets.push(new Bullet(shooter.x + 20, shooter.y + 30, 3, 'red'));
    }
    
    spawnPowerUps(deltaTime) {
        this.powerUpSpawnTimer += deltaTime;
        const spawnChance = 15000 - (this.upgrades.luck * 2000);
        if (this.powerUpSpawnTimer > spawnChance + Math.random() * 10000) {
            const x = Math.random() * (this.width - 30);
            const types = ['multiShot', 'shield', 'speedBoost'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.powerUps.push(new PowerUp(x, 0, type));
            this.powerUpSpawnTimer = 0;
        }
    }
    
    spawnMeteors(deltaTime) {
        this.meteorSpawnTimer += deltaTime;
        if (this.meteorSpawnTimer > 8000 + Math.random() * 7000) {
            const x = Math.random() * (this.width - 40);
            this.meteors.push(new Meteor(x, -40));
            this.meteorSpawnTimer = 0;
        }
    }
    
    spawnBoss(deltaTime) {
        this.bossSpawnTimer += deltaTime;
        if (this.level % 3 === 0 && this.invaders.length === 0 && !this.boss && this.bossSpawnTimer > 2000) {
            this.boss = new Boss(this.width / 2 - 60, 50, this.level);
            this.bossSpawnTimer = 0;
        }
    }
    
    updateCombo(deltaTime) {
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.comboMultiplier = 1;
            }
        }
    }
    
    updateTimeAttack() {
        if (this.gameMode === 'timeAttack' && this.gameState === 'playing') {
            this.timeAttackTimer++;
            
            // Check if time is up
            if (this.timeAttackTimer >= this.timeAttackDuration * 60) { // Convert to frames (60 FPS)
                this.checkTimeAttackObjectives();
                this.gameState = 'gameOver';
                return;
            }
            
            // Check objectives completion
            if (!this.objectivesCompleted) {
                const objectives = this.timeAttackObjectives;
                if (this.score >= objectives.score && 
                    this.maxCombo >= objectives.combo && 
                    this.meteorsDestroyed >= objectives.meteorsDestroyed) {
                    this.objectivesCompleted = true;
                    this.score += 2000; // Bonus for completing objectives
                }
            }
        }
    }
    
    checkTimeAttackObjectives() {
        const objectives = this.timeAttackObjectives;
        let completedCount = 0;
        
        if (this.score >= objectives.score) completedCount++;
        if (this.maxCombo >= objectives.combo) completedCount++;
        if (this.meteorsDestroyed >= objectives.meteorsDestroyed) completedCount++;
        
        // Bonus score based on completed objectives
        this.score += completedCount * 1000;
    }
    
    toggleGameMode() {
        this.gameMode = this.gameMode === 'normal' ? 'timeAttack' : 'normal';
        this.updateModeIndicator();
        if (this.gameState === 'playing') {
            this.restartGame();
        }
    }
    
    updateModeIndicator() {
        const modeElement = document.getElementById('currentMode');
        if (modeElement) {
            modeElement.textContent = this.gameMode === 'timeAttack' ? 'Time Attack' : 'Normal';
        }
    }
    
    addCombo() {
        this.combo++;
        this.comboTimer = 3000; // 3 seconds to maintain combo
        this.comboMultiplier = Math.min(1 + (this.combo * 0.1), 3); // Max 3x multiplier
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }
        this.lastHitTime = Date.now();
    }
    
    checkCollisions() {
        // Player bullets vs invaders
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.invaders.length - 1; j >= 0; j--) {
                if (this.bullets[i] && this.invaders[j] && 
                    this.checkCollision(this.bullets[i], this.invaders[j])) {
                    
                    // Create explosion particles
                    this.createExplosion(this.invaders[j].x + 20, this.invaders[j].y + 15);
                    
                    // Update score based on invader type with combo multiplier
                    const basePoints = this.invaders[j].type === 'fast' ? 30 : 
                                     this.invaders[j].type === 'normal' ? 20 : 10;
                    const points = Math.floor(basePoints * this.comboMultiplier * this.upgrades.damage);
                    this.score += points;
                    
                    // Add combo
                    this.addCombo();
                    
                    this.bullets.splice(i, 1);
                    this.invaders.splice(j, 1);
                    this.playSound('enemyHit');
                    break;
                }
            }
        }
        
        // Enemy bullets vs player
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            if (this.checkCollision(this.enemyBullets[i], this.player)) {
                this.enemyBullets.splice(i, 1);
                this.player.hit();
                this.lives--;
                this.createExplosion(this.player.x + 20, this.player.y + 15);
                this.playSound('explosion');
                
                if (this.lives <= 0) {
                    this.gameState = 'gameOver';
                    document.getElementById('finalScore').textContent = this.score;
                    document.getElementById('gameOver').style.display = 'block';
                }
            }
        }
        
        // Player vs power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            if (this.checkCollision(this.player, this.powerUps[i])) {
                this.player.applyPowerUp(this.powerUps[i].type);
                this.powerUps.splice(i, 1);
                this.playSound('powerUp');
                this.score += 50;
            }
        }
        
        // Player bullets vs meteors
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.meteors.length - 1; j >= 0; j--) {
                if (this.bullets[i] && this.meteors[j] && 
                    this.checkCollision(this.bullets[i], this.meteors[j])) {
                    
                    this.meteors[j].hit();
                    this.bullets.splice(i, 1);
                    
                    if (this.meteors[j].health <= 0) {
                        this.createExplosion(this.meteors[j].x + 20, this.meteors[j].y + 20);
                        this.score += Math.floor(100 * this.comboMultiplier);
                        this.addCombo();
                        this.meteorsDestroyed++;
                        this.meteors.splice(j, 1);
                    }
                    this.playSound('enemyHit');
                    break;
                }
            }
        }
        
        // Player vs meteors
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            if (this.checkCollision(this.player, this.meteors[i])) {
                this.meteors.splice(i, 1);
                this.player.hit();
                this.lives--;
                this.createExplosion(this.player.x + 20, this.player.y + 15);
                this.playSound('explosion');
                this.combo = 0;
                this.comboMultiplier = 1;
                
                if (this.lives <= 0) {
                    this.gameState = 'gameOver';
                    document.getElementById('finalScore').textContent = this.score;
                    document.getElementById('gameOver').style.display = 'block';
                }
            }
        }
        
        // Player bullets vs boss
        if (this.boss) {
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                if (this.bullets[i] && this.checkCollision(this.bullets[i], this.boss)) {
                    this.boss.hit(this.upgrades.damage);
                    this.bullets.splice(i, 1);
                    this.createExplosion(this.bullets[i]?.x || this.boss.x, this.bullets[i]?.y || this.boss.y);
                    this.score += Math.floor(50 * this.comboMultiplier);
                    this.addCombo();
                    this.playSound('enemyHit');
                }
            }
            
            // Boss bullets vs player
            for (let i = this.boss.bullets.length - 1; i >= 0; i--) {
                if (this.checkCollision(this.boss.bullets[i], this.player)) {
                    this.boss.bullets.splice(i, 1);
                    this.player.hit();
                    this.lives--;
                    this.createExplosion(this.player.x + 20, this.player.y + 15);
                    this.playSound('explosion');
                    this.combo = 0;
                    this.comboMultiplier = 1;
                    
                    if (this.lives <= 0) {
                        this.gameState = 'gameOver';
                        document.getElementById('finalScore').textContent = this.score;
                        document.getElementById('gameOver').style.display = 'block';
                    }
                }
            }
        }
        
        this.updateUI();
    }
    
    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(x, y));
        }
    }
    
    checkGameState() {
        if (this.invaders.length === 0) {
            this.level++;
            this.invaderSpeed += 0.5;
            this.createInvaders();
            this.score += 100 * this.level;
        }
        
        // Check if invaders reached player
        for (let invader of this.invaders) {
            if (invader.y + invader.height >= this.player.y) {
                this.lives = 0;
                this.gameState = 'gameOver';
                document.getElementById('finalScore').textContent = this.score;
                document.getElementById('gameOver').style.display = 'block';
                break;
            }
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw stars background
        this.drawStars();
        
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            // Draw game objects
            this.player.draw(this.ctx);
            
            this.bullets.forEach(bullet => bullet.draw(this.ctx));
            this.enemyBullets.forEach(bullet => bullet.draw(this.ctx));
            this.invaders.forEach(invader => invader.draw(this.ctx));
            this.meteors.forEach(meteor => meteor.draw(this.ctx));
            if (this.boss) {
                this.boss.draw(this.ctx);
                this.boss.bullets.forEach(bullet => bullet.draw(this.ctx));
            }
            this.particles.forEach(particle => particle.draw(this.ctx));
            this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
            
            // Draw combo indicator
            if (this.combo > 1) {
                this.ctx.fillStyle = '#ffff00';
                this.ctx.font = 'bold 24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`COMBO x${this.combo}`, this.width / 2, 50);
                this.ctx.fillText(`${this.comboMultiplier.toFixed(1)}x MULTIPLIER`, this.width / 2, 75);
                
                // Combo timer bar
                const barWidth = 200;
                const barHeight = 8;
                const barX = (this.width - barWidth) / 2;
                const barY = 85;
                const progress = this.comboTimer / 3000;
                
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(barX, barY, barWidth, barHeight);
                this.ctx.fillStyle = progress > 0.3 ? '#00ff00' : '#ff0000';
                this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
            }
            
            // Draw time attack UI
            if (this.gameMode === 'timeAttack') {
                const timeLeft = Math.max(0, this.timeAttackDuration - Math.floor(this.timeAttackTimer / 60));
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                
                this.ctx.fillStyle = timeLeft < 30 ? '#ff0000' : '#ffffff';
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, 20, 30);
                
                // Objectives
                this.ctx.font = '14px Arial';
                this.ctx.fillStyle = '#ffff00';
                this.ctx.fillText('Objectives:', 20, 55);
                
                const objectives = this.timeAttackObjectives;
                const scoreComplete = this.score >= objectives.score;
                const comboComplete = this.maxCombo >= objectives.combo;
                const meteorsComplete = this.meteorsDestroyed >= objectives.meteorsDestroyed;
                
                this.ctx.fillStyle = scoreComplete ? '#00ff00' : '#ffffff';
                this.ctx.fillText(`Score: ${this.score}/${objectives.score}`, 20, 75);
                
                this.ctx.fillStyle = comboComplete ? '#00ff00' : '#ffffff';
                this.ctx.fillText(`Max Combo: ${this.maxCombo}/${objectives.combo}`, 20, 95);
                
                this.ctx.fillStyle = meteorsComplete ? '#00ff00' : '#ffffff';
                this.ctx.fillText(`Meteors: ${this.meteorsDestroyed}/${objectives.meteorsDestroyed}`, 20, 115);
                
                if (this.objectivesCompleted) {
                    this.ctx.fillStyle = '#00ff00';
                    this.ctx.font = 'bold 16px Arial';
                    this.ctx.fillText('ALL OBJECTIVES COMPLETED!', 20, 140);
                }
            }
        }
    }
    
    drawStars() {
        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 37) % this.width;
            const y = (i * 73) % this.height;
            const size = Math.sin(Date.now() * 0.001 + i) * 0.5 + 1;
            this.ctx.fillRect(x, y, size, size);
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.speed = 5;
        this.shootCooldown = 0;
        this.powerUps = {
            multiShot: 0,
            shield: 0,
            speedBoost: 0
        };
    }
    
    update(keys, canvasWidth) {
        // Movement
        let speed = this.speed;
        if (this.powerUps.speedBoost > 0) {
            speed *= 1.5;
            this.powerUps.speedBoost--;
        }
        
        if (keys['ArrowLeft'] && this.x > 0) {
            this.x -= speed;
        }
        if (keys['ArrowRight'] && this.x < canvasWidth - this.width) {
            this.x += speed;
        }
        
        // Update cooldowns
        if (this.shootCooldown > 0) this.shootCooldown--;
        
        // Update power-up timers
        Object.keys(this.powerUps).forEach(key => {
            if (this.powerUps[key] > 0) this.powerUps[key]--;
        });
    }
    
    shoot(bullets) {
        if (this.shootCooldown > 0) return;
        
        if (this.powerUps.multiShot > 0) {
            // Triple shot
            bullets.push(new Bullet(this.x + 15, this.y, -5, '#00ff00'));
            bullets.push(new Bullet(this.x + 20, this.y, -5, '#00ff00'));
            bullets.push(new Bullet(this.x + 25, this.y, -5, '#00ff00'));
        } else {
            // Single shot
            bullets.push(new Bullet(this.x + 20, this.y, -5, '#00ff00'));
        }
        
        this.shootCooldown = 15;
    }
    
    hit() {
        if (this.powerUps.shield > 0) {
            this.powerUps.shield = 0; // Shield absorbs hit
            return false;
        }
        return true;
    }
    
    applyPowerUp(type) {
        switch(type) {
            case 'multiShot':
                this.powerUps.multiShot = 600; // 10 seconds at 60fps
                break;
            case 'shield':
                this.powerUps.shield = 300; // 5 seconds
                break;
            case 'speedBoost':
                this.powerUps.speedBoost = 600; // 10 seconds
                break;
        }
    }
    
    draw(ctx) {
        // Draw shield effect
        if (this.powerUps.shield > 0) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 25, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw player ship
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw ship details
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 18, this.y - 5, 4, 10);
        ctx.fillRect(this.x + 5, this.y + 25, 10, 5);
        ctx.fillRect(this.x + 25, this.y + 25, 10, 5);
    }
}

// Invader class
class Invader {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.type = type;
        this.animFrame = 0;
        this.animSpeed = type === 'fast' ? 8 : type === 'normal' ? 6 : 4;
    }
    
    update() {
        this.animFrame++;
    }
    
    draw(ctx) {
        const colors = {
            fast: '#ff0000',
            normal: '#ffff00',
            heavy: '#ff00ff'
        };
        
        ctx.fillStyle = colors[this.type];
        
        // Animated invader sprite
        const frame = Math.floor(this.animFrame / this.animSpeed) % 2;
        if (frame === 0) {
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 10, this.y + 8, 8, 8);
            ctx.fillRect(this.x + 22, this.y + 8, 8, 8);
        } else {
            ctx.fillRect(this.x + 2, this.y, this.width - 4, this.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 12, this.y + 8, 8, 8);
            ctx.fillRect(this.x + 20, this.y + 8, 8, 8);
        }
    }
}

// Bullet class
class Bullet {
    constructor(x, y, speed, color = '#fff') {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 10;
        this.speed = speed;
        this.color = color;
    }
    
    update() {
        this.y += this.speed;
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

// Particle class for explosions
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 60;
        this.maxLife = 60;
        this.color = `hsl(${Math.random() * 60 + 10}, 100%, 50%)`;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
        this.life--;
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1;
    }
}

// PowerUp class
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type;
        this.speed = 2;
        this.rotation = 0;
    }
    
    update() {
        this.y += this.speed;
        this.rotation += 0.1;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        const colors = {
            multiShot: '#ff6600',
            shield: '#00ffff',
            speedBoost: '#ff00ff'
        };
        
        ctx.fillStyle = colors[this.type];
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Add symbol
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        const symbols = {
            multiShot: '≡',
            shield: '◊',
            speedBoost: '»'
        };
        ctx.fillText(symbols[this.type], 0, 5);
        
        ctx.restore();
    }
}

// Meteor class
class Meteor {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = 2 + Math.random() * 3;
        this.health = 3;
        this.maxHealth = 3;
        this.rotation = 0;
        this.rotationSpeed = 0.05 + Math.random() * 0.1;
    }
    
    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
    }
    
    hit() {
        this.health--;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Draw meteor with health-based color
        const healthRatio = this.health / this.maxHealth;
        const red = Math.floor(255 * (1 - healthRatio));
        const brown = Math.floor(139 * healthRatio);
        ctx.fillStyle = `rgb(${139 + red}, ${69 + brown}, 19)`;
        
        // Draw irregular meteor shape
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.lineTo(-5, -18);
        ctx.lineTo(8, -15);
        ctx.lineTo(18, -5);
        ctx.lineTo(15, 10);
        ctx.lineTo(5, 18);
        ctx.lineTo(-8, 15);
        ctx.lineTo(-18, 5);
        ctx.closePath();
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.restore();
    }
}

// Boss class
class Boss {
    constructor(x, y, level) {
        this.x = x;
        this.y = y;
        this.width = 120;
        this.height = 80;
        this.health = 50 + (level * 20);
        this.maxHealth = this.health;
        this.speed = 1;
        this.direction = 1;
        this.shootTimer = 0;
        this.bullets = [];
        this.pattern = 0;
        this.patternTimer = 0;
        this.level = level;
    }
    
    update(playerX) {
        // Movement pattern
        this.patternTimer++;
        if (this.patternTimer > 180) { // Change pattern every 3 seconds
            this.pattern = (this.pattern + 1) % 3;
            this.patternTimer = 0;
        }
        
        switch(this.pattern) {
            case 0: // Side to side
                this.x += this.direction * this.speed;
                if (this.x <= 0 || this.x >= 800 - this.width) {
                    this.direction *= -1;
                }
                break;
            case 1: // Follow player
                if (this.x + this.width/2 < playerX) {
                    this.x += this.speed * 0.5;
                } else {
                    this.x -= this.speed * 0.5;
                }
                break;
            case 2: // Circular movement
                this.x += Math.sin(this.patternTimer * 0.1) * 2;
                break;
        }
        
        // Shooting
        this.shootTimer++;
        if (this.shootTimer > 60 - (this.level * 5)) { // Faster shooting at higher levels
            this.shoot();
            this.shootTimer = 0;
        }
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.y < 600;
        });
    }
    
    shoot() {
        // Triple shot
        this.bullets.push(new Bullet(this.x + 30, this.y + this.height, 4, '#ff0000'));
        this.bullets.push(new Bullet(this.x + 60, this.y + this.height, 4, '#ff0000'));
        this.bullets.push(new Bullet(this.x + 90, this.y + this.height, 4, '#ff0000'));
        
        // Spread shot at higher levels
        if (this.level >= 6) {
            this.bullets.push(new Bullet(this.x + 45, this.y + this.height, 3, '#ff4444'));
            this.bullets.push(new Bullet(this.x + 75, this.y + this.height, 3, '#ff4444'));
        }
    }
    
    hit(damage = 1) {
        this.health -= damage;
    }
    
    draw(ctx) {
        // Draw boss ship
        ctx.fillStyle = '#800080';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw details
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(this.x + 10, this.y + 10, 20, 20);
        ctx.fillRect(this.x + 50, this.y + 5, 20, 30);
        ctx.fillRect(this.x + 90, this.y + 10, 20, 20);
        
        // Draw health bar
        const healthBarWidth = this.width;
        const healthBarHeight = 8;
        const healthRatio = this.health / this.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 15, healthBarWidth, healthBarHeight);
        ctx.fillStyle = healthRatio > 0.5 ? '#00ff00' : healthRatio > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(this.x, this.y - 15, healthBarWidth * healthRatio, healthBarHeight);
        
        // Add glow effect
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 15;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Game();
});