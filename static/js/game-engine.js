// Three.js 3D Game Engine for Cricket
import { Stadium } from './stadium.js';
import { PlayerManager } from './players.js';
import { BallPhysics } from './ball-physics.js';
import { MultiplayerManager } from './multiplayer.js';

class CricketGame3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.stadium = null;
        this.players = null;
        this.ball = null;
        this.multiplayer = null;
        this.clock = new THREE.Clock();
        this.gameState = 'waiting'; // waiting, bowling, batting, fielding
        this.currentOver = 0;
        this.totalOvers = 20;
        this.score = { team1: { runs: 0, wickets: 0, balls: 0 }, team2: { runs: 0, wickets: 0, balls: 0 } };
        this.target = null;
        this.isMultiplayer = false;
        this.playerRole = null; // 'batting' or 'bowling'
        this.animations = [];
        
        this.init();
    }
    
    async init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createLights();
        await this.loadStadium();
        await this.loadPlayers();
        this.createBall();
        this.setupControls();
        this.startGameLoop();
        this.hideLoadingScreen();
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        
        // Sky gradient
        const skyGeo = new THREE.SphereGeometry(500, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        
        // Fog for atmosphere
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
    }
    
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            1000
        );
        
        // Default stadium view
        this.camera.position.set(0, 50, 100);
        this.camera.lookAt(0, 0, 0);
        
        // Camera states for different views
        this.cameraViews = {
            broadcast: { position: new THREE.Vector3(0, 60, 120), lookAt: new THREE.Vector3(0, 0, 0) },
            bowlerEnd: { position: new THREE.Vector3(0, 5, 30), lookAt: new THREE.Vector3(0, 0, -30) },
            batsmanEnd: { position: new THREE.Vector3(0, 5, -30), lookAt: new THREE.Vector3(0, 0, 30) },
            sideView: { position: new THREE.Vector3(40, 20, 0), lookAt: new THREE.Vector3(0, 0, 0) },
            topView: { position: new THREE.Vector3(0, 80, 5), lookAt: new THREE.Vector3(0, 0, 0) },
            droneView: { position: new THREE.Vector3(30, 30, 30), lookAt: new THREE.Vector3(0, 0, 0) }
        };
        
        this.currentView = 'broadcast';
        this.setupCameraControls();
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    createLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambient);
        
        // Sun light (directional)
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(100, 150, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 500;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        this.scene.add(sun);
        
        // Stadium floodlights
        this.createFloodlights();
    }
    
    createFloodlights() {
        const positions = [
            [60, 40, 60], [-60, 40, 60], [60, 40, -60], [-60, 40, -60]
        ];
        
        positions.forEach(pos => {
            const light = new THREE.PointLight(0xffeedd, 0.8, 200);
            light.position.set(...pos);
            light.castShadow = true;
            this.scene.add(light);
            
            // Light pole visual
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 1, 40, 8),
                new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.2 })
            );
            pole.position.set(pos[0], 20, pos[2]);
            pole.castShadow = true;
            this.scene.add(pole);
        });
    }
    
    async loadStadium() {
        this.updateLoadingProgress(20);
        this.stadium = new Stadium(this.scene);
        await this.stadium.build();
        this.updateLoadingProgress(50);
    }
    
    async loadPlayers() {
        this.updateLoadingProgress(70);
        this.players = new PlayerManager(this.scene);
        await this.players.createTeams();
        this.updateLoadingProgress(90);
    }
    
    createBall() {
        this.ball = new BallPhysics(this.scene);
    }
    
    setupControls() {
        // Mouse orbit controls
        this.isDragging = false;
        this.previousMouse = { x: 0, y: 0 };
        this.cameraAngle = { theta: 0, phi: Math.PI / 3, radius: 100 };
        
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', () => this.onMouseUp());
        document.addEventListener('wheel', (e) => this.onScroll(e));
        
        // Touch controls for mobile
        document.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        document.addEventListener('touchend', () => this.onTouchEnd());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.onKeyPress(e));
        
        // Camera view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.setCameraView(view);
            });
        });
    }
    
    setupCameraControls() {
        // Create camera control buttons dynamically
        const controlsDiv = document.createElement('div');
        controlsDiv.id = 'camera-controls';
        controlsDiv.innerHTML = `
            <button class="view-btn" data-view="broadcast" title="Broadcast View">📺</button>
            <button class="view-btn" data-view="bowlerEnd" title="Bowler's End">🎯</button>
            <button class="view-btn" data-view="batsmanEnd" title="Batsman's View">🏏</button>
            <button class="view-btn" data-view="sideView" title="Side View">👁️</button>
            <button class="view-btn" data-view="topView" title="Top View">🦅</button>
            <button class="view-btn" data-view="droneView" title="Drone View">🚁</button>
        `;
        controlsDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 20px;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 100;
        `;
        document.getElementById('game-container').appendChild(controlsDiv);
        
        // Style buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.style.cssText = `
                width: 45px;
                height: 45px;
                border-radius: 50%;
                border: 2px solid rgba(255,255,255,0.3);
                background: rgba(0,0,0,0.7);
                color: white;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
            `;
            btn.onmouseenter = () => {
                btn.style.borderColor = '#ffd700';
                btn.style.transform = 'scale(1.1)';
            };
            btn.onmouseleave = () => {
                btn.style.borderColor = 'rgba(255,255,255,0.3)';
                btn.style.transform = 'scale(1)';
            };
        });
    }
    
    setCameraView(viewName) {
        const view = this.cameraViews[viewName];
        if (!view) return;
        
        this.currentView = viewName;
        this.animateCamera(view.position, view.lookAt);
        
        // Highlight active view button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.style.background = 'rgba(0,0,0,0.7)';
            btn.style.borderColor = 'rgba(255,255,255,0.3)';
        });
        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) {
            activeBtn.style.background = 'rgba(255, 215, 0, 0.3)';
            activeBtn.style.borderColor = '#ffd700';
        }
    }
    
    animateCamera(targetPos, targetLook) {
        const startPos = this.camera.position.clone();
        const startTime = Date.now();
        const duration = 1000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            
            this.camera.position.lerpVectors(startPos, targetPos, ease);
            this.camera.lookAt(targetLook);
            
            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    onMouseDown(event) {
        if (event.target.closest('#game-controls') || 
            event.target.closest('#side-panel') ||
            event.target.closest('#captain-panel')) return;
        
        this.isDragging = true;
        this.previousMouse = { x: event.clientX, y: event.clientY };
    }
    
    onMouseMove(event) {
        if (!this.isDragging) return;
        
        const deltaX = event.clientX - this.previousMouse.x;
        const deltaY = event.clientY - this.previousMouse.y;
        
        this.cameraAngle.theta -= deltaX * 0.005;
        this.cameraAngle.phi -= deltaY * 0.005;
        this.cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2, this.cameraAngle.phi));
        
        this.updateCameraPosition();
        
        this.previousMouse = { x: event.clientX, y: event.clientY };
    }
    
    onMouseUp() {
        this.isDragging = false;
    }
    
    onScroll(event) {
        this.cameraAngle.radius += event.deltaY * 0.1;
        this.cameraAngle.radius = Math.max(20, Math.min(200, this.cameraAngle.radius));
        this.updateCameraPosition();
    }
    
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.isDragging = true;
            this.previousMouse = { 
                x: event.touches[0].clientX, 
                y: event.touches[0].clientY 
            };
        }
        event.preventDefault();
    }
    
    onTouchMove(event) {
        if (!this.isDragging || event.touches.length !== 1) return;
        this.onMouseMove({
            clientX: event.touches[0].clientX,
            clientY: event.touches[0].clientY
        });
        event.preventDefault();
    }
    
    onTouchEnd() {
        this.isDragging = false;
    }
    
    onKeyPress(event) {
        switch(event.key) {
            case '1': this.setCameraView('broadcast'); break;
            case '2': this.setCameraView('bowlerEnd'); break;
            case '3': this.setCameraView('batsmanEnd'); break;
            case '4': this.setCameraView('sideView'); break;
            case '5': this.setCameraView('topView'); break;
            case '6': this.setCameraView('droneView'); break;
            case 'w': this.cameraAngle.phi -= 0.1; this.updateCameraPosition(); break;
            case 's': this.cameraAngle.phi += 0.1; this.updateCameraPosition(); break;
            case 'a': this.cameraAngle.theta -= 0.1; this.updateCameraPosition(); break;
            case 'd': this.cameraAngle.theta += 0.1; this.updateCameraPosition(); break;
            case 'q': this.cameraAngle.radius -= 5; this.updateCameraPosition(); break;
            case 'e': this.cameraAngle.radius += 5; this.updateCameraPosition(); break;
        }
    }
    
    updateCameraPosition() {
        const { theta, phi, radius } = this.cameraAngle;
        this.camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
        this.camera.position.y = radius * Math.cos(phi);
        this.camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
        this.camera.lookAt(0, 0, 0);
    }
    
    startGameLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            const deltaTime = this.clock.getDelta();
            
            // Update game logic
            this.update(deltaTime);
            
            // Render scene
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }
    
    update(deltaTime) {
        // Update ball physics
        if (this.ball) {
            this.ball.update(deltaTime);
        }
        
        // Update player animations
        if (this.players) {
            this.players.update(deltaTime);
        }
        
        // Update stadium elements
        if (this.stadium) {
            this.stadium.update(deltaTime);
        }
        
        // Process animation queue
        this.processAnimations(deltaTime);
    }
    
    processAnimations(deltaTime) {
        this.animations = this.animations.filter(anim => {
            anim.progress += deltaTime / anim.duration;
            if (anim.progress >= 1) {
                anim.onComplete?.();
                return false;
            }
            anim.onUpdate?.(anim.progress);
            return true;
        });
    }
    
    updateLoadingProgress(percent) {
        const progress = document.getElementById('loading-progress');
        if (progress) {
            progress.style.width = `${percent}%`;
        }
    }
    
    hideLoadingScreen() {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => loading.remove(), 500);
        }
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Game Actions
    async bowlDelivery(deliveryType, lineX, lineY) {
        if (this.gameState !== 'bowling') return;
        
        // Calculate delivery trajectory
        const speed = deliveryType === 'fast' ? 140 : 
                      deliveryType === 'slower' ? 100 : 120;
        
        await this.ball.bowl(deliveryType, lineX, lineY, speed);
        
        // Show ball result after delivery
        this.showBallResult();
    }
    
    playShot(shotType, power) {
        if (this.gameState !== 'batting') return;
        
        // Calculate shot direction based on shot type
        const directions = {
            defend: { x: 0, y: 0, z: -1, power: 0.2 },
            drive: { x: 0.5, y: 0.1, z: -1, power: 0.8 },
            pull: { x: -0.8, y: 0.3, z: -0.5, power: 0.9 },
            cut: { x: 0.9, y: 0.2, z: -0.3, power: 0.7 },
            slog: { x: 0, y: 0.6, z: -0.8, power: 1.0 },
            loft: { x: 0, y: 0.7, z: -0.7, power: 0.9 },
            sweep: { x: -0.7, y: 0.1, z: -0.7, power: 0.6 },
            reverse: { x: 0.8, y: 0.2, z: -0.6, power: 0.7 }
        };
        
        const shot = directions[shotType];
        this.ball.hit(shot, power);
        this.showBallResult();
    }
    
    showBallResult() {
        // Show result popup
        const resultDiv = document.getElementById('ball-result');
        const resultAnim = document.getElementById('result-animation');
        const resultText = document.getElementById('result-text');
        
        resultDiv.classList.remove('hidden');
        
        // Example results based on ball state
        const results = [
            { emoji: '🏏', text: 'FOUR! Beautiful shot!' },
            { emoji: '💥', text: 'SIX! Out of the ground!' },
            { emoji: '🎯', text: 'OUT! Bowled him!' },
            { emoji: '⚪', text: 'Dot ball' },
            { emoji: '🏃', text: 'Single taken' },
            { emoji: '🏃🏃', text: 'Two runs' },
            { emoji: '🦵', text: 'Leg bye' },
            { emoji: '📏', text: 'Wide ball' }
        ];
        
        const result = results[Math.floor(Math.random() * results.length)];
        resultAnim.textContent = result.emoji;
        resultText.textContent = result.text;
        
        setTimeout(() => {
            resultDiv.classList.add('hidden');
        }, 2000);
    }
    
    // Multiplayer
    async connectMultiplayer(gameId, playerId) {
        this.multiplayer = new MultiplayerManager(this);
        await this.multiplayer.connect(gameId, playerId);
        this.isMultiplayer = true;
    }
}

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    window.game = new CricketGame3D();
});

export default CricketGame3D;