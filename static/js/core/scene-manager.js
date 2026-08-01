/**
 * Scene Manager
 * Manages Three.js scene, camera, renderer, and post-processing
 */

import * as THREE from '/static/js/lib/three-custom.js';
import { EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, TAARenderPass } from '/static/js/lib/three-custom.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        
        // Camera settings
        this.cameraViews = {
            broadcast: {
                position: new THREE.Vector3(0, 45, 90),
                lookAt: new THREE.Vector3(0, 0, 0),
                fov: 55
            },
            bowlerEnd: {
                position: new THREE.Vector3(0, 3, 22),
                lookAt: new THREE.Vector3(0, 0, -22),
                fov: 70
            },
            batsmanEnd: {
                position: new THREE.Vector3(0, 2, -22),
                lookAt: new THREE.Vector3(0, 0, 22),
                fov: 70
            },
            sideView: {
                position: new THREE.Vector3(30, 10, 0),
                lookAt: new THREE.Vector3(0, 0, 0),
                fov: 60
            },
            topView: {
                position: new THREE.Vector3(0, 70, 2),
                lookAt: new THREE.Vector3(0, 0, 0),
                fov: 50
            },
            droneView: {
                position: new THREE.Vector3(25, 20, 25),
                lookAt: new THREE.Vector3(0, 0, 0),
                fov: 65
            },
            closeup: {
                position: new THREE.Vector3(5, 5, 15),
                lookAt: new THREE.Vector3(0, 0, 0),
                fov: 45
            }
        };
        
        this.currentView = 'broadcast';
        this.targetView = 'broadcast';
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 1.0;
        
        // Orbit controls
        this.orbitControls = null;
        this.isOrbiting = false;
        
        // Post-processing
        this.postProcessing = {
            enabled: true,
            bloom: {
                enabled: true,
                strength: 0.5,
                radius: 0.4,
                threshold: 0.85
            }
        };
    }
    
    /**
     * Initialize scene manager
     */
    initialize() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createPostProcessing();
        this.setupLighting();
        
        console.log('🎬 Scene manager initialized');
    }
    
    /**
     * Create Three.js scene
     */
    createScene() {
        this.scene = new THREE.Scene();
        
        // Scene background
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.0003);
        
        // Enable shadows
        this.scene.shadowMap = {
            enabled: true,
            type: THREE.PCFSoftShadowMap
        };
    }
    
    /**
     * Create camera
     */
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            55,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Set default position
        const defaultView = this.cameraViews.broadcast;
        this.camera.position.copy(defaultView.position);
        this.camera.lookAt(defaultView.lookAt);
        this.camera.fov = defaultView.fov;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Create WebGL renderer
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Shadow settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Tone mapping
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Output encoding
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    /**
     * Create post-processing effects
     */
    createPostProcessing() {
        // Effect composer
        this.composer = new EffectComposer(this.renderer);
        
        // Render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Bloom pass (glow effects)
        if (this.postProcessing.bloom.enabled) {
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                this.postProcessing.bloom.strength,
                this.postProcessing.bloom.radius,
                this.postProcessing.bloom.threshold
            );
            this.composer.addPass(bloomPass);
            this.bloomPass = bloomPass;
        }
        
        // TAA render pass for anti-aliasing
        const taaPass = new TAARenderPass(this.scene, this.camera);
        taaPass.unbiased = false;
        taaPass.sampleLevel = 1;
        this.composer.addPass(taaPass);
    }
    
    /**
     * Setup lighting system
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
        this.scene.add(ambientLight);
        
        // Hemisphere light (sky/ground)
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x362907, 0.4);
        this.scene.add(hemiLight);
        
        // Main directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.position.set(80, 100, 30);
        this.sunLight.castShadow = true;
        
        // Shadow configuration
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        this.sunLight.shadow.bias = -0.0001;
        this.sunLight.shadow.normalBias = 0.02;
        
        this.scene.add(this.sunLight);
    }
    
    /**
     * Setup orbit controls for free camera
     */
    setupOrbitControls() {
        this.isOrbiting = true;
        this.currentView = 'orbit';
        
        // Store initial state
        const initialTarget = this.cameraViews.broadcast.lookAt.clone();
        const initialPosition = this.camera.position.clone();
        
        // Mouse controls
        let isDragging = false;
        let previousMouse = { x: 0, y: 0 };
        let spherical = new THREE.Spherical();
        let target = initialTarget.clone();
        
        spherical.setFromVector3(
            initialPosition.clone().sub(target)
        );
        
        document.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'CANVAS') {
                isDragging = true;
                previousMouse = { x: e.clientX, y: e.clientY };
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.isOrbiting) return;
            
            const deltaX = e.clientX - previousMouse.x;
            const deltaY = e.clientY - previousMouse.y;
            
            spherical.theta -= deltaX * 0.005;
            spherical.phi -= deltaY * 0.005;
            
            // Clamp phi
            spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, spherical.phi));
            
            const newPosition = new THREE.Vector3().setFromSpherical(spherical).add(target);
            this.camera.position.copy(newPosition);
            this.camera.lookAt(target);
            
            previousMouse = { x: e.clientX, y: e.clientY };
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Scroll to zoom
        document.addEventListener('wheel', (e) => {
            if (!this.isOrbiting) return;
            
            spherical.radius += e.deltaY * 0.1;
            spherical.radius = Math.max(15, Math.min(150, spherical.radius));
            
            const newPosition = new THREE.Vector3().setFromSpherical(spherical).add(target);
            this.camera.position.copy(newPosition);
            this.camera.lookAt(target);
        });
        
        // Touch controls
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                previousMouse = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging || !this.isOrbiting || e.touches.length !== 1) return;
            
            const deltaX = e.touches[0].clientX - previousMouse.x;
            const deltaY = e.touches[0].clientY - previousMouse.y;
            
            spherical.theta -= deltaX * 0.005;
            spherical.phi -= deltaY * 0.005;
            spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, spherical.phi));
            
            const newPosition = new THREE.Vector3().setFromSpherical(spherical).add(target);
            this.camera.position.copy(newPosition);
            this.camera.lookAt(target);
            
            previousMouse = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }
    
    /**
     * Set camera view with smooth transition
     */
    setCameraView(viewName) {
        if (viewName === 'orbit') {
            this.setupOrbitControls();
            return;
        }
        
        this.isOrbiting = false;
        const view = this.cameraViews[viewName];
        if (!view) return;
        
        this.targetView = viewName;
        this.isTransitioning = true;
        this.transitionProgress = 0;
        
        this.viewTransition = {
            startPosition: this.camera.position.clone(),
            endPosition: view.position.clone(),
            startLookAt: this.camera.getWorldDirection(new THREE.Vector3()),
            endLookAt: view.lookAt.clone(),
            startFov: this.camera.fov,
            endFov: view.fov
        };
        
        this.currentView = viewName;
    }
    
    /**
     * Update camera transitions
     */
    update(deltaTime) {
        if (this.isTransitioning) {
            this.transitionProgress += deltaTime / this.transitionDuration;
            
            if (this.transitionProgress >= 1) {
                this.transitionProgress = 1;
                this.isTransitioning = false;
            }
            
            // Smooth easing
            const t = this.easeInOutCubic(this.transitionProgress);
            const vt = this.viewTransition;
            
            // Interpolate position
            this.camera.position.lerpVectors(vt.startPosition, vt.endPosition, t);
            
            // Interpolate lookAt
            const currentLookAt = new THREE.Vector3().lerpVectors(
                vt.startLookAt,
                vt.endLookAt,
                t
            );
            this.camera.lookAt(currentLookAt);
            
            // Interpolate FOV
            this.camera.fov = THREE.MathUtils.lerp(vt.startFov, vt.endFov, t);
            this.camera.updateProjectionMatrix();
        }
    }
    
    /**
     * Easing function
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * Render the scene
     */
    render() {
        if (this.postProcessing.enabled && this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Handle window resize
     */
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    /**
     * Get current camera state
     */
    getCameraState() {
        return {
            position: this.camera.position.clone(),
            rotation: this.camera.rotation.clone(),
            fov: this.camera.fov,
            view: this.currentView
        };
    }
    
    /**
     * Add object to scene
     */
    add(object) {
        this.scene.add(object);
    }
    
    /**
     * Remove object from scene
     */
    remove(object) {
        this.scene.remove(object);
    }
    
    /**
     * Get object by name
     */
    getObjectByName(name) {
        return this.scene.getObjectByName(name);
    }
}