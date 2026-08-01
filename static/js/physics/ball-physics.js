/**
 * Ball Physics Engine
 * Complete physics simulation for cricket ball
 */

import * as THREE from '/static/js/lib/three-custom.js';

export class BallPhysics {
    constructor(scene) {
        this.scene = scene;
        
        // Ball properties
        this.ball = null;
        this.ballRadius = 0.0359; // meters
        this.ballMass = 0.1559; // kg
        
        // Physics constants
        this.gravity = new THREE.Vector3(0, -9.81, 0);
        this.airDensity = 1.225;
        this.dragCoefficient = 0.3;
        this.magnusCoefficient = 0.2;
        this.restitution = 0.5; // Bounciness
        this.friction = 0.3;
        
        // Ball state
        this.position = new THREE.Vector3(0, 2, 20);
        this.velocity = new THREE.Vector3(0, 0, -30);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Quaternion();
        
        this.isInPlay = false;
        this.isBowled = false;
        this.hasHitBat = false;
        this.hasHitGround = false;
        
        // Wind
        this.wind = new THREE.Vector3(0, 0, 0);
        this.windVariation = 0;
        
        // Trajectory tracking
        this.trajectory = [];
        this.maxTrajectoryPoints = 300;
        
        // Trail effect
        this.trail = null;
        this.trailPoints = [];
        
        // Swing properties
        this.swingForce = 0;
        this.swingDirection = new THREE.Vector3();
        
        // Seam position (affects swing)
        this.seamAngle = 0;
        
        // Delivery properties
        this.deliveryType = 'fast';
        this.releaseSpeed = 0;
        this.releaseHeight = 2.0;
        
        this.createBall();
        this.createTrail();
    }
    
    /**
     * Create the 3D ball
     */
    createBall() {
        // Ball geometry
        const geometry = new THREE.SphereGeometry(this.ballRadius * 10, 32, 32);
        
        // Ball material with leather texture
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            roughness: 0.4,
            metalness: 0.1
        });
        
        this.ball = new THREE.Mesh(geometry, material);
        this.ball.castShadow = true;
        this.ball.receiveShadow = true;
        this.ball.name = 'cricket-ball';
        
        // Add seam
        const seamGeometry = new THREE.TorusGeometry(this.ballRadius * 10, 0.003, 8, 32);
        const seamMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFDD0,
            roughness: 0.5,
            metalness: 0.1
        });
        this.seam = new THREE.Mesh(seamGeometry, seamMaterial);
        this.ball.add(this.seam);
        
        // Add shine indicator
        const shineGeometry = new THREE.SphereGeometry(this.ballRadius * 5, 16, 16);
        const shineMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF4444,
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0.3
        });
        this.shineIndicator = new THREE.Mesh(shineGeometry, shineMaterial);
        this.shineIndicator.position.set(this.ballRadius * 8, 0, 0);
        this.ball.add(this.shineIndicator);
        
        this.scene.add(this.ball);
    }
    
    /**
     * Create ball trail
     */
    createTrail() {
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(0xff6600) }
            },
            vertexShader: /* glsl */ `
                attribute float aAlpha;
                varying float vAlpha;
                void main() {
                    vAlpha = aAlpha;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = 3.0;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 uColor;
                varying float vAlpha;
                void main() {
                    float dist = length(gl_PointCoord - 0.5) * 2.0;
                    float alpha = smoothstep(1.0, 0.0, dist) * vAlpha;
                    gl_FragColor = vec4(uColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.trail = new THREE.Points(trailGeometry, trailMaterial);
        this.trail.visible = false;
        this.scene.add(this.trail);
    }
    
    /**
     * Bowl the ball
     */
    bowl(deliveryData) {
        this.isInPlay = true;
        this.isBowled = true;
        this.hasHitBat = false;
        this.hasHitGround = false;
        
        // Reset position
        this.position.set(0, this.releaseHeight, 20);
        
        // Calculate release speed
        this.releaseSpeed = deliveryData.speed || this.calculateSpeed(deliveryData.type);
        
        // Calculate velocity components
        const angle = THREE.MathUtils.degToRad(10);
        const speed = this.releaseSpeed;
        
        // Forward velocity
        let vz = -speed * Math.cos(angle);
        let vx = 0;
        let vy = speed * Math.sin(angle);
        
        // Line adjustment
        if (deliveryData.line) {
            vx = speed * deliveryData.line * 0.1;
        }
        
        // Length adjustment
        if (deliveryData.length) {
            const lengthFactor = deliveryData.length;
            vy = speed * Math.sin(angle) * (1 - lengthFactor * 0.8);
        }
        
        this.velocity.set(vx, vy, vz);
        
        // Set spin based on delivery type
        this.setSpin(deliveryData.type);
        
        // Set swing
        this.setSwing(deliveryData.type);
        
        // Set delivery type
        this.deliveryType = deliveryData.type;
        
        // Reset trajectory
        this.trajectory = [this.position.clone()];
        this.trailPoints = [];
        
        // Show trail
        this.trail.visible = true;
        
        // Emit event
        this.emit('ball_bowled', {
            type: deliveryData.type,
            speed: this.releaseSpeed,
            position: this.position.clone(),
            velocity: this.velocity.clone()
        });
    }
    
    /**
     * Calculate delivery speed based on type
     */
    calculateSpeed(type) {
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
        
        const baseSpeed = speedMap[type] || 120;
        return baseSpeed * (0.9 + Math.random() * 0.2);
    }
    
    /**
     * Set ball spin
     */
    setSpin(type) {
        const spinMap = {
            off_spin: new THREE.Vector3(0, 25, 0),
            leg_spin: new THREE.Vector3(0, -25, 0),
            googly: new THREE.Vector3(0, -20, 10),
            doosra: new THREE.Vector3(0, 20, -10),
            fast: new THREE.Vector3(0, 0, 5),
            yorker: new THREE.Vector3(0, 0, 3),
            bouncer: new THREE.Vector3(0, 0, -3),
            slower: new THREE.Vector3(0, 0, -8)
        };
        
        this.angularVelocity.copy(spinMap[type] || new THREE.Vector3());
    }
    
    /**
     * Set ball swing
     */
    setSwing(type) {
        this.swingForce = 0;
        this.swingDirection.set(0, 0, 0);
        
        if (type === 'fast' || type === 'yorker') {
            // Conventional swing
            this.swingForce = 2 + Math.random() * 3;
            this.swingDirection.set(
                (Math.random() - 0.5) * 2,
                0,
                0
            ).normalize();
        }
    }
    
    /**
     * Ball hit by bat
     */
    hit(shotData) {
        if (!this.isInPlay) return;
        
        this.hasHitBat = true;
        
        // Calculate hit velocity
        const power = shotData.power || 50;
        const baseSpeed = 25 * (power / 100);
        
        // Direction based on shot type
        const directionMap = {
            defend: new THREE.Vector3(0, 0.1, -0.3),
            drive: new THREE.Vector3(0.3, 0.2, -1),
            pull: new THREE.Vector3(-0.8, 0.3, -0.5),
            cut: new THREE.Vector3(0.8, 0.1, -0.4),
            slog: new THREE.Vector3(0, 0.5, -0.7),
            loft: new THREE.Vector3(0, 0.6, -0.6),
            sweep: new THREE.Vector3(-0.7, 0.1, -0.6),
            reverse: new THREE.Vector3(0.7, 0.2, -0.5),
            hook: new THREE.Vector3(-0.5, 0.4, -0.6),
            glance: new THREE.Vector3(-0.3, 0.1, -0.8)
        };
        
        const direction = directionMap[shotData.type] || new THREE.Vector3(0, 0.3, -0.7);
        const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
        
        if (magnitude > 0) {
            this.velocity.set(
                direction.x / magnitude * baseSpeed,
                direction.y / magnitude * baseSpeed,
                direction.z / magnitude * baseSpeed
            );
        }
        
        // Add topspin or backspin based on shot
        if (shotData.type === 'loft' || shotData.type === 'slog') {
            this.angularVelocity.set(10, 0, 0);
        }
        
        // Emit event
        this.emit('shot_played', {
            type: shotData.type,
            power: power,
            velocity: this.velocity.clone()
        });
    }
    
    /**
     * Update ball physics
     */
    update(deltaTime) {
        if (!this.isInPlay) return;
        
        // Sub-step for accuracy
        const subSteps = 4;
        const subDelta = deltaTime / subSteps;
        
        for (let i = 0; i < subSteps; i++) {
            this.physicsStep(subDelta);
        }
        
        // Update ball position
        this.ball.position.copy(this.position);
        
        // Update ball rotation
        this.updateRotation(deltaTime);
        
        // Update trail
        this.updateTrail(deltaTime);
        
        // Check if ball is out of play
        this.checkBoundaries();
    }
    
    /**
     * Single physics step
     */
    physicsStep(deltaTime) {
        // Gravity force
        const gravityForce = this.gravity.clone().multiplyScalar(this.ballMass);
        
        // Drag force
        const speed = this.velocity.length();
        let dragForce = new THREE.Vector3();
        
        if (speed > 0) {
            const dragMagnitude = 0.5 * this.airDensity * speed * speed * 
                                 this.dragCoefficient * Math.PI * this.ballRadius * this.ballRadius;
            dragForce = this.velocity.clone().normalize().multiplyScalar(-dragMagnitude);
        }
        
        // Magnus force (spin)
        let magnusForce = new THREE.Vector3();
        const spinMagnitude = this.angularVelocity.length();
        
        if (spinMagnitude > 0 && speed > 0) {
            const magnusMagnitude = this.magnusCoefficient * speed * spinMagnitude * this.ballMass;
            magnusForce = new THREE.Vector3().crossVectors(
                this.angularVelocity.clone().normalize(),
                this.velocity.clone().normalize()
            ).multiplyScalar(magnusMagnitude);
        }
        
        // Swing force
        let swingForceVec = new THREE.Vector3();
        if (this.swingForce > 0 && !this.hasHitBat) {
            swingForceVec = this.swingDirection.clone().multiplyScalar(this.swingForce);
        }
        
        // Wind force
        const windForce = this.wind.clone().multiplyScalar(0.05);
        
        // Net force
        const netForce = new THREE.Vector3()
            .add(gravityForce)
            .add(dragForce)
            .add(magnusForce)
            .add(swingForceVec)
            .add(windForce);
        
        // Acceleration
        const acceleration = netForce.clone().divideScalar(this.ballMass);
        
        // Update velocity
        this.velocity.add(acceleration.clone().multiplyScalar(deltaTime));
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Ground collision
        if (this.position.y <= 0) {
            this.position.y = 0;
            
            if (Math.abs(this.velocity.y) > 0.5) {
                // Bounce
                this.velocity.y = -this.velocity.y * this.restitution;
                this.velocity.x *= (1 - this.friction);
                this.velocity.z *= (1 - this.friction);
                
                this.hasHitGround = true;
                
                // Stop if velocity too low
                if (Math.abs(this.velocity.y) < 0.1) {
                    this.velocity.y = 0;
                    if (this.velocity.length() < 1) {
                        this.velocity.set(0, 0, 0);
                        this.isInPlay = false;
                    }
                }
            } else {
                this.velocity.y = 0;
                if (this.velocity.length() < 0.5) {
                    this.velocity.set(0, 0, 0);
                    this.isInPlay = false;
                }
            }
        }
        
        // Add to trajectory
        this.trajectory.push(this.position.clone());
        if (this.trajectory.length > this.maxTrajectoryPoints) {
            this.trajectory.shift();
        }
    }
    
    /**
     * Update ball rotation
     */
    updateRotation(deltaTime) {
        if (this.angularVelocity.length() > 0) {
            const axis = this.angularVelocity.clone().normalize();
            const angle = this.angularVelocity.length() * deltaTime;
            const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
            this.rotation.multiply(quaternion);
            this.ball.quaternion.copy(this.rotation);
        }
    }
    
    /**
     * Update ball trail
     */
    updateTrail(deltaTime) {
        if (!this.trail.visible) return;
        
        this.trailPoints.push(this.position.clone());
        
        // Fade old points
        const maxPoints = 50;
        while (this.trailPoints.length > maxPoints) {
            this.trailPoints.shift();
        }
        
        // Update trail geometry
        const positions = new Float32Array(this.trailPoints.length * 3);
        const alphas = new Float32Array(this.trailPoints.length);
        
        for (let i = 0; i < this.trailPoints.length; i++) {
            positions[i * 3] = this.trailPoints[i].x;
            positions[i * 3 + 1] = this.trailPoints[i].y;
            positions[i * 3 + 2] = this.trailPoints[i].z;
            
            // Alpha decreases for older points
            alphas[i] = i / this.trailPoints.length * 0.5;
        }
        
        this.trail.geometry.dispose();
        this.trail.geometry = new THREE.BufferGeometry();
        this.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.trail.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
        
        // Hide trail if ball stopped
        if (!this.isInPlay) {
            setTimeout(() => {
                this.trail.visible = false;
                this.trailPoints = [];
            }, 1000);
        }
    }
    
    /**
     * Check if ball has crossed boundary
     */
    checkBoundaries() {
        const distance = Math.sqrt(this.position.x ** 2 + this.position.z ** 2);
        const boundaryRadius = 70;
        
        if (distance > boundaryRadius) {
            if (this.position.y > 0 && !this.hasHitGround) {
                // Six!
                this.emit('boundary', { type: 'six', position: this.position.clone() });
            } else if (this.hasHitGround) {
                // Four!
                this.emit('boundary', { type: 'four', position: this.position.clone() });
            }
            
            this.isInPlay = false;
        }
        
        // Check if ball hit stumps
        if (Math.abs(this.position.z) < 0.1 && 
            Math.abs(this.position.x) < 0.3 && 
            this.position.y < 0.71 && 
            this.position.y > 0) {
            this.emit('wicket', { 
                type: 'bowled', 
                position: this.position.clone() 
            });
            this.isInPlay = false;
        }
    }
    
    /**
     * Get ball state for network sync
     */
    getState() {
        return {
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            angularVelocity: this.angularVelocity.clone(),
            isInPlay: this.isInPlay,
            isBowled: this.isBowled,
            hasHitBat: this.hasHitBat,
            deliveryType: this.deliveryType,
            releaseSpeed: this.releaseSpeed
        };
    }
    
    /**
     * Set ball state from network
     */
    setState(state) {
        this.position.copy(state.position);
        this.velocity.copy(state.velocity);
        this.angularVelocity.copy(state.angularVelocity);
        this.isInPlay = state.isInPlay;
        this.isBowled = state.isBowled;
        this.hasHitBat = state.hasHitBat;
        this.deliveryType = state.deliveryType;
        this.releaseSpeed = state.releaseSpeed;
    }
    
    /**
     * Reset ball
     */
    reset() {
        this.position.set(0, 2, 20);
        this.velocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.isInPlay = false;
        this.isBowled = false;
        this.hasHitBat = false;
        this.hasHitGround = false;
        this.trajectory = [];
        this.trailPoints = [];
        this.trail.visible = false;
        this.ball.position.copy(this.position);
    }
    
    /**
     * Event system
     */
    emit(eventName, data) {
        const event = new CustomEvent(`ball-${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }
}