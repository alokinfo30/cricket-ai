/**
 * Main entry point for Cricket 3D Game
 * Initializes all systems and manages game lifecycle
 */

import { GameEngine } from './core/game-engine.js';
import { SceneManager } from './core/scene-manager.js';
import { AssetLoader } from './core/asset-loader.js';
import { StadiumBuilder } from './stadium/stadium-builder.js';
import { PlayerManager } from './players/player-manager.js';
import { BallPhysics } from './physics/ball-physics.js';
import { ParticleSystem } from './effects/particles.js';
import { SoundManager } from './effects/sounds.js';
import { HUD } from './ui/hud.js';
import { Controls } from './ui/controls.js';
import { Minimap } from './ui/minimap.js';
import { MultiplayerManager } from './network/multiplayer.js';
import { ShaderManager } from './effects/shaders.js';

class CricketGame3D {
    constructor() {
        this.engine = null;
        this.sceneManager = null;
        this.assetLoader = null;
        this.stadium = null;
        this.players = null;
        this.ball = null;
        this.particles = null;
        this.sound = null;
        this.hud = null;
        this.controls = null;
        this.minimap = null;
        this.multiplayer = null;
        this.shaders = null;
        
        this.gameState = 'loading';
        this.isMultiplayer = false;
        this.playerRole = 'spectator';
        
        // Performance metrics
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = Date.now();
        
        this.init();
    }
    
    async init() {
        console.log('🏏 Initializing Cricket 3D Game...');
        
        try {
            // Initialize core systems
            this.engine = new GameEngine();
            this.sceneManager = new SceneManager();
            this.assetLoader = new AssetLoader();
            this.shaders = new ShaderManager();
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Load assets
            await this.loadAssets();
            
            // Initialize game systems
            await this.initializeSystems();
            
            // Setup UI
            this.setupUI();
            
            // Setup input
            this.setupInput();
            
            // Connect to multiplayer if needed
            await this.setupMultiplayer();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            // Start game loop
            this.startGameLoop();
            
            this.gameState = 'playing';
            console.log('✅ Game initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.showError(error.message);
        }
    }
    
    async loadAssets() {
        console.log('📦 Loading assets...');
        
        const assets = {
            models: [
                { name: 'batsman', url: '/static/assets/models/players/batsman.glb' },
                { name: 'bowler', url: '/static/assets/models/players/bowler.glb' },
                { name: 'fielder', url: '/static/assets/models/players/fielder.glb' },
                { name: 'umpire', url: '/static/assets/models/players/umpire.glb' },
                { name: 'pitch', url: '/static/assets/models/stadium/pitch.glb' },
                { name: 'stumps', url: '/static/assets/models/stadium/stumps.glb' },
                { name: 'ball', url: '/static/assets/models/stadium/ball.glb' }
            ],
            textures: [
                { name: 'grass', url: '/static/assets/textures/grass_diffuse.jpg' },
                { name: 'grassNormal', url: '/static/assets/textures/grass_normal.jpg' },
                { name: 'pitch', url: '/static/assets/textures/pitch_texture.jpg' },
                { name: 'sky', url: '/static/assets/textures/sky_hdr.hdr' },
                { name: 'crowd', url: '/static/assets/textures/crowd_atlas.png' }
            ],
            audio: [
                { name: 'crowd', url: '/static/assets/audio/crowd_ambient.mp3' },
                { name: 'ballHit', url: '/static/assets/audio/ball_hit.mp3' },
                { name: 'wicket', url: '/static/assets/audio/wicket.mp3' },
                { name: 'four', url: '/static/assets/audio/four.mp3' },
                { name: 'six', url: '/static/assets/audio/six.mp3' },
                { name: 'stadium', url: '/static/assets/audio/stadium_ambient.mp3' }
            ]
        };
        
        await this.assetLoader.loadAll(assets);
        
        this.updateLoadingProgress(30);
    }
    
    async initializeSystems() {
        console.log('🔧 Initializing game systems...');
        
        // Build stadium
        this.stadium = new StadiumBuilder(this.sceneManager.scene);
        await this.stadium.build();
        this.updateLoadingProgress(50);
        
        // Initialize players
        this.players = new PlayerManager(this.sceneManager.scene);
        await this.players.initialize();
        this.updateLoadingProgress(65);
        
        // Initialize ball physics
        this.ball = new BallPhysics(this.sceneManager.scene);
        this.updateLoadingProgress(75);
        
        // Initialize particles
        this.particles = new ParticleSystem(this.sceneManager.scene);
        this.updateLoadingProgress(82);
        
        // Initialize sounds
        this.sound = new SoundManager();
        await this.sound.initialize();
        this.updateLoadingProgress(90);
        
        // Initialize shaders
        await this.shaders.initialize();
        this.updateLoadingProgress(95);
    }
    
    setupUI() {
        console.log('🎨 Setting up UI...');
        
        // HUD
        this.hud = new HUD();
        this.hud.initialize();
        
        // Controls
        this.controls = new Controls();
        this.controls.initialize();
        
        // Minimap
        this.minimap = new Minimap();
        this.minimap.initialize();
        
        // Camera view buttons
        this.setupCameraControls();
    }
    
    setupCameraControls() {
        const views = ['broadcast', 'bowlerEnd', 'batsmanEnd', 'sideView', 'topView', 'droneView'];
        
        views.forEach(view => {
            const btn = document.getElementById(`view-${view}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.sceneManager.setCameraView(view);
                });
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case '1': this.sceneManager.setCameraView('broadcast'); break;
                case '2': this.sceneManager.setCameraView('bowlerEnd'); break;
                case '3': this.sceneManager.setCameraView('batsmanEnd'); break;
                case '4': this.sceneManager.setCameraView('sideView'); break;
                case '5': this.sceneManager.setCameraView('topView'); break;
                case '6': this.sceneManager.setCameraView('droneView'); break;
            }
        });
    }
    
    setupInput() {
        // Mouse orbit controls
        this.sceneManager.setupOrbitControls();
        
        // Batting controls
        document.querySelectorAll('.shot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const shotType = e.target.dataset.shot;
                this.playShot(shotType);
            });
        });
        
        // Bowling controls
        document.querySelectorAll('.bowl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const deliveryType = e.target.dataset.delivery;
                this.bowlDelivery(deliveryType);
            });
        });
        
        // Auto-play
        document.getElementById('auto-play-btn')?.addEventListener('click', () => {
            this.toggleAutoPlay();
        });
        
        // Simulate over
        document.getElementById('sim-over-btn')?.addEventListener('click', () => {
            this.simulateOver();
        });
    }
    
    async setupMultiplayer() {
        // Check if multiplayer game
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('gameId');
        const playerId = urlParams.get('playerId');
        
        if (gameId && playerId) {
            this.isMultiplayer = true;
            this.multiplayer = new MultiplayerManager(this);
            await this.multiplayer.connect(gameId, playerId);
        }
    }
    
    showLoadingScreen() {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.style.display = 'flex';
            loading.style.opacity = '1';
        }
    }
    
    hideLoadingScreen() {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
    }
    
    updateLoadingProgress(percent) {
        const progress = document.getElementById('loading-progress');
        const percentText = document.getElementById('loading-percent');
        
        if (progress) {
            progress.style.width = `${percent}%`;
        }
        if (percentText) {
            percentText.textContent = `${percent}%`;
        }
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 18px;
            z-index: 10000;
        `;
        errorDiv.textContent = `Error: ${message}`;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 5000);
    }
    
    startGameLoop() {
        const animate = (timestamp) => {
            requestAnimationFrame(animate);
            
            // Calculate FPS
            this.frameCount++;
            if (Date.now() - this.lastFpsUpdate >= 1000) {
                this.fps = this.frameCount;
                this.frameCount = 0;
                this.lastFpsUpdate = Date.now();
                
                // Update FPS display
                this.hud?.updateFPS(this.fps);
            }
            
            // Delta time
            const deltaTime = Math.min(0.1, this.engine.clock.getDelta());
            
            // Update systems
            this.update(deltaTime);
            
            // Render
            this.sceneManager.render();
        };
        
        requestAnimationFrame(animate);
    }
    
    update(deltaTime) {
        // Update stadium
        this.stadium?.update(deltaTime);
        
        // Update players
        this.players?.update(deltaTime);
        
        // Update ball physics
        this.ball?.update(deltaTime);
        
        // Update particles
        this.particles?.update(deltaTime);
        
        // Update HUD
        this.hud?.update(deltaTime);
        
        // Update minimap
        this.minimap?.update(deltaTime);
        
        // Update multiplayer sync
        if (this.isMultiplayer) {
            this.multiplayer?.update(deltaTime);
        }
        
        // Process game events
        this.processGameEvents();
    }
    
    processGameEvents() {
        // Process game event queue
        while (this.eventQueue && this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.handleGameEvent(event);
        }
    }
    
    handleGameEvent(event) {
        switch(event.type) {
            case 'ball_bowled':
                this.ball.bowl(event.data);
                this.sound.play('ballHit');
                break;
            case 'shot_played':
                this.ball.hit(event.data);
                this.sound.playShot(event.data.shotType);
                break;
            case 'wicket':
                this.particles.createWicketEffect(event.data.position);
                this.sound.play('wicket');
                this.showBallResult('OUT!', '🎯');
                break;
            case 'four':
                this.particles.createBoundaryEffect();
                this.sound.play('four');
                this.showBallResult('FOUR!', '🏏');
                break;
            case 'six':
                this.particles.createSixEffect();
                this.sound.play('six');
                this.showBallResult('SIX!', '💥');
                break;
            case 'score_update':
                this.hud.updateScore(event.data);
                break;
            case 'commentary':
                this.hud.addCommentary(event.data.text);
                break;
        }
    }
    
    // Game Actions
    bowlDelivery(deliveryType) {
        if (this.gameState !== 'playing') return;
        
        const deliveryData = {
            type: deliveryType,
            speed: this.calculateDeliverySpeed(deliveryType),
            line: this.controls.getBowlingLine(),
            length: this.controls.getBowlingLength()
        };
        
        // Send to server if multiplayer
        if (this.isMultiplayer) {
            this.multiplayer.sendAction({
                actionType: 'bowl',
                deliveryType: deliveryType,
                ...deliveryData
            });
        } else {
            // Local simulation
            this.ball.bowl(deliveryData);
        }
        
        // Visual feedback
        this.showBowlingIndicator(deliveryType);
    }
    
    playShot(shotType) {
        if (this.gameState !== 'playing') return;
        
        const power = this.controls.getShotPower();
        const shotData = {
            type: shotType,
            power: power,
            direction: this.controls.getShotDirection()
        };
        
        if (this.isMultiplayer) {
            this.multiplayer.sendAction({
                actionType: 'bat',
                shotType: shotType,
                shotPower: power
            });
        } else {
            this.ball.hit(shotData);
        }
        
        // Visual feedback
        this.showShotIndicator(shotType, power);
    }
    
    calculateDeliverySpeed(deliveryType) {
        const speedMap = {
            fast: 145,
            yorker: 140,
            bouncer: 135,
            slower: 105,
            off_spin: 85,
            leg_spin: 85,
            googly: 85,
            doosra: 85,
            knuckle: 110,
            slower_bouncer: 108
        };
        
        return (speedMap[deliveryType] || 120) * (0.9 + Math.random() * 0.2);
    }
    
    showBowlingIndicator(deliveryType) {
        const indicator = document.getElementById('bowling-indicator');
        if (indicator) {
            indicator.textContent = deliveryType.toUpperCase();
            indicator.classList.add('active');
            setTimeout(() => indicator.classList.remove('active'), 1000);
        }
    }
    
    showShotIndicator(shotType, power) {
        const indicator = document.getElementById('shot-indicator');
        if (indicator) {
            indicator.textContent = `${shotType.toUpperCase()} - ${power}%`;
            indicator.classList.add('active');
            setTimeout(() => indicator.classList.remove('active'), 1000);
        }
    }
    
    showBallResult(text, emoji) {
        const resultDiv = document.getElementById('ball-result');
        const resultAnim = document.getElementById('result-animation');
        const resultText = document.getElementById('result-text');
        
        if (resultDiv && resultAnim && resultText) {
            resultAnim.textContent = emoji;
            resultText.textContent = text;
            resultDiv.classList.remove('hidden');
            
            setTimeout(() => {
                resultDiv.classList.add('hidden');
            }, 2000);
        }
    }
    
    toggleAutoPlay() {
        const btn = document.getElementById('auto-play-btn');
        if (btn) {
            this.isAutoPlaying = !this.isAutoPlaying;
            btn.textContent = this.isAutoPlaying ? '⏸️ Pause' : '▶️ Auto-Play';
            btn.classList.toggle('active', this.isAutoPlaying);
        }
    }
    
    simulateOver() {
        if (this.isAutoPlaying) {
            this.isAutoPlaying = false;
            document.getElementById('auto-play-btn').textContent = '▶️ Auto-Play';
        }
        
        // Simulate 6 balls
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                this.autoPlayBall();
            }, i * 2000);
        }
    }
    
    autoPlayBall() {
        // AI decides delivery/shot
        const deliveryType = this.getRandomDeliveryType();
        const shotType = this.getRandomShotType();
        
        this.bowlDelivery(deliveryType);
        
        setTimeout(() => {
            this.playShot(shotType);
        }, 500);
    }
    
    getRandomDeliveryType() {
        const types = ['fast', 'yorker', 'bouncer', 'slower', 'off_spin', 'leg_spin'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    getRandomShotType() {
        const types = ['defend', 'drive', 'pull', 'cut', 'slog', 'loft'];
        return types[Math.floor(Math.random() * types.length)];
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.cricketGame = new CricketGame3D();
});

// Export for module usage
export default CricketGame3D;