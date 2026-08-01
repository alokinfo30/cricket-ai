/**
 * Core Game Engine
 * Manages game loop, state, and system coordination
 */

import * as THREE from '/static/js/lib/three-custom.js';

export class GameEngine {
    constructor() {
        this.clock = new THREE.Clock();
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        
        // System registry
        this.systems = new Map();
        
        // Event system
        this.eventListeners = new Map();
        this.eventQueue = [];
        
        // Performance tracking
        this.performanceMetrics = {
            fps: 0,
            frameTime: 0,
            updateTime: 0,
            renderTime: 0,
            frameCount: 0,
            lastFpsUpdate: 0
        };
        
        // Game configuration
        this.config = {
            targetFPS: 60,
            fixedTimeStep: 1 / 60,
            maxDeltaTime: 0.1,
            enableVSync: true,
            enableProfiling: false
        };
    }
    
    /**
     * Register a game system
     */
    registerSystem(name, system) {
        this.systems.set(name, {
            instance: system,
            enabled: true,
            priority: this.systems.size
        });
        
        console.log(`📦 System registered: ${name}`);
    }
    
    /**
     * Get a registered system
     */
    getSystem(name) {
        return this.systems.get(name)?.instance;
    }
    
    /**
     * Enable/disable a system
     */
    setSystemEnabled(name, enabled) {
        const system = this.systems.get(name);
        if (system) {
            system.enabled = enabled;
        }
    }
    
    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.clock.start();
        
        // Initialize all systems
        this.systems.forEach((system, name) => {
            if (system.enabled && system.instance.initialize) {
                system.instance.initialize();
            }
        });
        
        console.log('▶️ Game engine started');
        this.gameLoop();
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
        this.clock.stop();
        
        // Shutdown all systems
        this.systems.forEach((system, name) => {
            if (system.instance.shutdown) {
                system.instance.shutdown();
            }
        });
        
        console.log('⏹️ Game engine stopped');
    }
    
    /**
     * Pause the game
     */
    pause() {
        this.isPaused = true;
    }
    
    /**
     * Resume the game
     */
    resume() {
        this.isPaused = false;
        this.clock.getDelta(); // Reset delta time
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.gameLoop());
        
        if (this.isPaused) return;
        
        // Calculate delta time
        this.deltaTime = Math.min(
            this.clock.getDelta(),
            this.config.maxDeltaTime
        );
        this.elapsedTime += this.deltaTime;
        
        // Profile start
        const updateStart = performance.now();
        
        // Fixed update (physics)
        let accumulator = 0;
        accumulator += this.deltaTime;
        
        while (accumulator >= this.config.fixedTimeStep) {
            this.fixedUpdate(this.config.fixedTimeStep);
            accumulator -= this.config.fixedTimeStep;
        }
        
        // Variable update (rendering)
        this.update(this.deltaTime);
        
        // Profile end
        const updateEnd = performance.now();
        this.performanceMetrics.updateTime = updateEnd - updateStart;
        
        // Update FPS counter
        this.performanceMetrics.frameCount++;
        const now = performance.now();
        
        if (now - this.performanceMetrics.lastFpsUpdate >= 1000) {
            this.performanceMetrics.fps = this.performanceMetrics.frameCount;
            this.performanceMetrics.frameCount = 0;
            this.performanceMetrics.lastFpsUpdate = now;
        }
        
        // Process events
        this.processEvents();
    }
    
    /**
     * Fixed time step update (physics)
     */
    fixedUpdate(deltaTime) {
        // Sort systems by priority
        const sortedSystems = Array.from(this.systems.entries())
            .sort((a, b) => a[1].priority - b[1].priority);
        
        for (const [name, system] of sortedSystems) {
            if (system.enabled && system.instance.fixedUpdate) {
                system.instance.fixedUpdate(deltaTime);
            }
        }
    }
    
    /**
     * Variable time step update (rendering)
     */
    update(deltaTime) {
        const sortedSystems = Array.from(this.systems.entries())
            .sort((a, b) => a[1].priority - b[1].priority);
        
        for (const [name, system] of sortedSystems) {
            if (system.enabled && system.instance.update) {
                system.instance.update(deltaTime);
            }
        }
    }
    
    /**
     * Add event listener
     */
    on(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }
    
    /**
     * Remove event listener
     */
    off(eventType, callback) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event
     */
    emit(eventType, data = {}) {
        this.eventQueue.push({
            type: eventType,
            data: data,
            timestamp: performance.now()
        });
    }
    
    /**
     * Process event queue
     */
    processEvents() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            const listeners = this.eventListeners.get(event.type);
            
            if (listeners) {
                for (const callback of listeners) {
                    try {
                        callback(event.data);
                    } catch (error) {
                        console.error(`Error in event handler for ${event.type}:`, error);
                    }
                }
            }
        }
    }
    
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    /**
     * Set game configuration
     */
    setConfig(key, value) {
        if (key in this.config) {
            this.config[key] = value;
        }
    }
    
    /**
     * Get game configuration
     */
    getConfig(key) {
        return this.config[key];
    }
}