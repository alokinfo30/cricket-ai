/**
 * Particle System
 * Complete particle effects for cricket game
 */

import * as THREE from '/static/js/lib/three-custom.js';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleSystems = new Map();
        this.maxParticles = 1000;
        
        // Particle pools for reuse
        this.pools = {
            wicket: [],
            boundary: [],
            six: [],
            dust: [],
            confetti: [],
            firework: [],
            spark: []
        };
        
        this.initialize();
    }
    
    /**
     * Initialize particle system
     */
    initialize() {
        this.createParticlePools();
        console.log('✨ Particle system initialized');
    }
    
    /**
     * Create particle pools
     */
    createParticlePools() {
        // Wicket particles (stumps breaking)
        this.pools.wicket = this.createPool(200, {
            size: 0.05,
            color: 0xdeb887,
            lifetime: 2.0,
            gravity: true
        });
        
        // Boundary particles (four)
        this.pools.boundary = this.createPool(150, {
            size: 0.03,
            color: 0x00ff00,
            lifetime: 1.5,
            gravity: false
        });
        
        // Six particles
        this.pools.six = this.createPool(200, {
            size: 0.04,
            color: 0xffd700,
            lifetime: 2.5,
            gravity: true
        });
        
        // Dust particles (ball hitting ground)
        this.pools.dust = this.createPool(100, {
            size: 0.02,
            color: 0xc4a35a,
            lifetime: 1.0,
            gravity: false
        });
        
        // Confetti (match win)
        this.pools.confetti = this.createPool(500, {
            size: 0.05,
            color: 0xff0000,
            lifetime: 5.0,
            gravity: true
        });
        
        // Fireworks
        this.pools.firework = this.createPool(300, {
            size: 0.02,
            color: 0xffff00,
            lifetime: 3.0,
            gravity: false
        });
        
        // Spark particles (ball hitting bat)
        this.pools.spark = this.createPool(50, {
            size: 0.01,
            color: 0xffff00,
            lifetime: 0.5,
            gravity: false
        });
    }
    
    /**
     * Create a particle pool
     */
    createPool(count, config) {
        const pool = {
            particles: [],
            geometry: new THREE.BufferGeometry(),
            material: null,
            mesh: null,
            config: config
        };
        
        // Create particles
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const lifetimes = new Float32Array(count);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
            // Initialize as inactive
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000; // Off screen
            positions[i * 3 + 2] = 0;
            
            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = 0;
            velocities[i * 3 + 2] = 0;
            
            lifetimes[i] = 0;
            sizes[i] = config.size;
            
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0;
            colors[i * 3 + 2] = 0;
        }
        
        pool.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        pool.geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        pool.geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        pool.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        pool.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create material
        pool.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 }
            },
            vertexShader: /* glsl */ `
                attribute float lifetime;
                attribute float size;
                attribute vec3 color;
                varying float vLifetime;
                varying vec3 vColor;
                
                void main() {
                    vLifetime = lifetime;
                    vColor = color;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: /* glsl */ `
                varying float vLifetime;
                varying vec3 vColor;
                
                void main() {
                    float dist = length(gl_PointCoord - 0.5) * 2.0;
                    float alpha = smoothstep(1.0, 0.0, dist);
                    alpha *= vLifetime;
                    
                    if (alpha < 0.01) discard;
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        pool.mesh = new THREE.Points(pool.geometry, pool.material);
        pool.mesh.visible = false;
        this.scene.add(pool.mesh);
        
        return pool;
    }
    
    /**
     * Emit wicket particles
     */
    createWicketEffect(position) {
        const pool = this.pools.wicket;
        const count = 100;
        let activeCount = 0;
        
        const posArray = pool.geometry.attributes.position.array;
        const velArray = pool.geometry.attributes.velocity.array;
        const lifeArray = pool.geometry.attributes.lifetime.array;
        const colorArray = pool.geometry.attributes.color.array;
        
        for (let i = 0; i < pool.particles.length && activeCount < count; i++) {
            if (lifeArray[i] <= 0) {
                // Set position
                posArray[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
                posArray[i * 3 + 1] = position.y + Math.random() * 1.5;
                posArray[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;
                
                // Set velocity
                velArray[i * 3] = (Math.random() - 0.5) * 5;
                velArray[i * 3 + 1] = Math.random() * 8 + 2;
                velArray[i * 3 + 2] = (Math.random() - 0.5) * 5;
                
                // Set lifetime
                lifeArray[i] = 1.0;
                
                // Set color (wood color variation)
                const colorVariation = 0.2;
                colorArray[i * 3] = 0.87 + (Math.random() - 0.5) * colorVariation;
                colorArray[i * 3 + 1] = 0.72 + (Math.random() - 0.5) * colorVariation;
                colorArray[i * 3 + 2] = 0.53 + (Math.random() - 0.5) * colorVariation;
                
                activeCount++;
            }
        }
        
        pool.geometry.attributes.position.needsUpdate = true;
        pool.geometry.attributes.velocity.needsUpdate = true;
        pool.geometry.attributes.lifetime.needsUpdate = true;
        pool.geometry.attributes.color.needsUpdate = true;
        pool.mesh.visible = true;
    }
    
    /**
     * Create boundary effect (four)
     */
    createBoundaryEffect(position) {
        const pool = this.pools.boundary;
        this.emitParticles(pool, position, 50, {
            spread: 2,
            speed: 3,
            upwardForce: 2,
            lifetime: 1.5
        });
    }
    
    /**
     * Create six effect
     */
    createSixEffect(position) {
        const pool = this.pools.six;
        this.emitParticles(pool, position, 100, {
            spread: 5,
            speed: 8,
            upwardForce: 10,
            lifetime: 2.5,
            color: { r: 1.0, g: 0.84, b: 0.0 }
        });
        
        // Also create fireworks
        this.createFireworkEffect(position);
    }
    
    /**
     * Create dust effect
     */
    createDustEffect(position) {
        const pool = this.pools.dust;
        this.emitParticles(pool, position, 30, {
            spread: 1,
            speed: 1,
            upwardForce: 0.5,
            lifetime: 1.0
        });
    }
    
    /**
     * Create spark effect (bat-ball contact)
     */
    createSparkEffect(position) {
        const pool = this.pools.spark;
        this.emitParticles(pool, position, 20, {
            spread: 0.5,
            speed: 5,
            upwardForce: 3,
            lifetime: 0.5
        });
    }
    
    /**
     * Create firework effect
     */
    createFireworkEffect(position) {
        const pool = this.pools.firework;
        const colors = [
            { r: 1.0, g: 0.0, b: 0.0 },
            { r: 0.0, g: 1.0, b: 0.0 },
            { r: 0.0, g: 0.0, b: 1.0 },
            { r: 1.0, g: 1.0, b: 0.0 },
            { r: 1.0, g: 0.0, b: 1.0 },
            { r: 0.0, g: 1.0, b: 1.0 }
        ];
        
        for (let burst = 0; burst < 3; burst++) {
            setTimeout(() => {
                const burstPos = new THREE.Vector3(
                    position.x + (Math.random() - 0.5) * 10,
                    position.y + 15 + Math.random() * 10,
                    position.z + (Math.random() - 0.5) * 10
                );
                
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                this.emitParticles(pool, burstPos, 50, {
                    spread: 10,
                    speed: 15,
                    upwardForce: 5,
                    lifetime: 2.0,
                    color: color
                });
            }, burst * 200);
        }
    }
    
    /**
     * Create confetti effect (match win)
     */
    createConfettiEffect() {
        const pool = this.pools.confetti;
        
        // Emit from multiple positions around the stadium
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const radius = 50;
            const position = new THREE.Vector3(
                Math.cos(angle) * radius,
                30,
                Math.sin(angle) * radius
            );
            
            this.emitParticles(pool, position, 50, {
                spread: 20,
                speed: 5,
                upwardForce: -2,
                lifetime: 5.0,
                color: { 
                    r: Math.random(), 
                    g: Math.random(), 
                    b: Math.random() 
                }
            });
        }
    }
    
    /**
     * Generic particle emission
     */
    emitParticles(pool, position, count, options) {
        let activeCount = 0;
        
        const posArray = pool.geometry.attributes.position.array;
        const velArray = pool.geometry.attributes.velocity.array;
        const lifeArray = pool.geometry.attributes.lifetime.array;
        const colorArray = pool.geometry.attributes.color.array;
        
        const color = options.color || { r: 1.0, g: 1.0, b: 1.0 };
        
        for (let i = 0; i < posArray.length / 3 && activeCount < count; i++) {
            if (lifeArray[i] <= 0) {
                // Position with spread
                posArray[i * 3] = position.x + (Math.random() - 0.5) * options.spread;
                posArray[i * 3 + 1] = position.y + (Math.random() - 0.5) * options.spread;
                posArray[i * 3 + 2] = position.z + (Math.random() - 0.5) * options.spread;
                
                // Random velocity
                velArray[i * 3] = (Math.random() - 0.5) * options.speed;
                velArray[i * 3 + 1] = Math.random() * options.speed + options.upwardForce;
                velArray[i * 3 + 2] = (Math.random() - 0.5) * options.speed;
                
                // Lifetime
                lifeArray[i] = options.lifetime;
                
                // Color
                colorArray[i * 3] = color.r;
                colorArray[i * 3 + 1] = color.g;
                colorArray[i * 3 + 2] = color.b;
                
                activeCount++;
            }
        }
        
        pool.geometry.attributes.position.needsUpdate = true;
        pool.geometry.attributes.velocity.needsUpdate = true;
        pool.geometry.attributes.lifetime.needsUpdate = true;
        pool.geometry.attributes.color.needsUpdate = true;
        pool.mesh.visible = true;
    }
    
    /**
     * Update all particle systems
     */
    update(deltaTime) {
        for (const [name, pool] of Object.entries(this.pools)) {
            this.updatePool(pool, deltaTime);
        }
    }
    
    /**
     * Update a single particle pool
     */
    updatePool(pool, deltaTime) {
        const posArray = pool.geometry.attributes.position.array;
        const velArray = pool.geometry.attributes.velocity.array;
        const lifeArray = pool.geometry.attributes.lifetime.array;
        
        let hasActiveParticles = false;
        
        for (let i = 0; i < posArray.length / 3; i++) {
            if (lifeArray[i] > 0) {
                hasActiveParticles = true;
                
                // Update lifetime
                lifeArray[i] -= deltaTime / pool.config.lifetime;
                
                // Update position
                posArray[i * 3] += velArray[i * 3] * deltaTime;
                posArray[i * 3 + 1] += velArray[i * 3 + 1] * deltaTime;
                posArray[i * 3 + 2] += velArray[i * 3 + 2] * deltaTime;
                
                // Apply gravity
                if (pool.config.gravity) {
                    velArray[i * 3 + 1] -= 9.81 * deltaTime;
                }
                
                // Fade out
                if (lifeArray[i] < 0) {
                    lifeArray[i] = 0;
                    // Move off screen
                    posArray[i * 3 + 1] = -1000;
                }
            }
        }
        
        pool.geometry.attributes.position.needsUpdate = true;
        pool.geometry.attributes.velocity.needsUpdate = true;
        pool.geometry.attributes.lifetime.needsUpdate = true;
        
        // Hide if no active particles
        if (!hasActiveParticles && pool.mesh.visible) {
            pool.mesh.visible = false;
        }
    }
    
    /**
     * Cleanup
     */
    dispose() {
        for (const pool of Object.values(this.pools)) {
            pool.geometry.dispose();
            pool.material.dispose();
            this.scene.remove(pool.mesh);
        }
    }
}