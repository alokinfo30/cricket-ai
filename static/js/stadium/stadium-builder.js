/**
 * Complete 3D Stadium Construction
 * Builds detailed stadium with stands, pitch, buildings, and environment
 */

import * as THREE from '/static/js/lib/three-custom.js';

export class StadiumBuilder {
    constructor(scene) {
        this.scene = scene;
        this.stadiumGroup = new THREE.Group();
        this.stadiumGroup.name = 'Stadium';
        
        // Stadium dimensions (meters)
        this.dimensions = {
            fieldRadius: 75,
            pitchLength: 22.12,
            pitchWidth: 3.05,
            boundaryRadius: 70,
            standHeight: 25,
            seatingCapacity: 50000
        };
        
        // Materials
        this.materials = {
            grass: null,
            pitch: null,
            concrete: null,
            roof: null,
            glass: null
        };
        
        // Components
        this.components = {
            field: null,
            pitch: null,
            stands: [],
            pavilion: null,
            floodlights: [],
            sightScreen: null,
            scoreboard: null
        };
    }
    
    async build() {
        console.log('🏟️ Building 3D Stadium...');
        
        await this.createMaterials();
        this.createField();
        this.createPitch();
        this.createStands();
        this.createPavilion();
        this.createFloodlights();
        this.createSightScreens();
        this.createScoreboard();
        this.createEnvironment();
        this.createCrowdSystem();
        
        this.scene.add(this.stadiumGroup);
        console.log('✅ Stadium construction complete');
    }
    
    async createMaterials() {
        // Grass material with custom shader
        this.materials.grass = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color('#2d5a27') },
                color2: { value: new THREE.Color('#1a3d16') }
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float time;
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                // Simplex noise function for realistic grass
                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
                vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
                
                float snoise(vec3 v) {
                    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                    
                    vec3 i  = floor(v + dot(v, C.yyy));
                    vec3 x0 = v - i + dot(i, C.xxx);
                    
                    vec3 g = step(x0.yzx, x0.xyz);
                    vec3 l = 1.0 - g;
                    vec3 i1 = min(g.xyz, l.zxy);
                    vec3 i2 = max(g.xyz, l.zxy);
                    
                    vec3 x1 = x0 - i1 + C.xxx;
                    vec3 x2 = x0 - i2 + C.yyy;
                    vec3 x3 = x0 - D.yyy;
                    
                    i = mod289(i);
                    vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                    
                    float n_ = 0.142857142857;
                    vec3 ns = n_ * D.wyz - D.xzx;
                    
                    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                    
                    vec4 x_ = floor(j * ns.z);
                    vec4 y_ = floor(j - 7.0 * x_);
                    
                    vec4 x = x_ * ns.x + ns.yyyy;
                    vec4 y = y_ * ns.x + ns.yyyy;
                    vec4 h = 1.0 - abs(x) - abs(y);
                    
                    vec4 b0 = vec4(x.xy, y.xy);
                    vec4 b1 = vec4(x.zw, y.zw);
                    
                    vec4 s0 = floor(b0)*2.0 + 1.0;
                    vec4 s1 = floor(b1)*2.0 + 1.0;
                    vec4 sh = -step(h, vec4(0.0));
                    
                    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                    
                    vec3 p0 = vec3(a0.xy, h.x);
                    vec3 p1 = vec3(a0.zw, h.y);
                    vec3 p2 = vec3(a1.xy, h.z);
                    vec3 p3 = vec3(a1.zw, h.w);
                    
                    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                    p0 *= norm.x;
                    p1 *= norm.y;
                    p2 *= norm.z;
                    p3 *= norm.w;
                    
                    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                    m = m * m;
                    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
                }
                
                void main() {
                    float noise = snoise(vec3(vPosition.x * 0.1, vPosition.z * 0.1, time * 0.1));
                    vec3 grassColor = mix(color1, color2, noise * 0.5 + 0.5);
                    
                    // Add mowing pattern
                    float stripe = sin(vPosition.z * 2.0) * 0.05;
                    grassColor += stripe;
                    
                    gl_FragColor = vec4(grassColor, 1.0);
                }
            `
        });
        
        // Pitch material
        this.materials.pitch = new THREE.MeshStandardMaterial({
            color: '#c4a35a',
            roughness: 0.9,
            metalness: 0.0
        });
        
        // Concrete for stands
        this.materials.concrete = new THREE.MeshStandardMaterial({
            color: '#cccccc',
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Roof material
        this.materials.roof = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.3,
            metalness: 0.5
        });
        
        // Glass for pavilion
        this.materials.glass = new THREE.MeshPhysicalMaterial({
            color: '#88ccff',
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.7,
            envMapIntensity: 1
        });
    }
    
    createField() {
        // Circular field
        const fieldGeometry = new THREE.CircleGeometry(this.dimensions.fieldRadius, 64);
        const field = new THREE.Mesh(fieldGeometry, this.materials.grass);
        field.rotation.x = -Math.PI / 2;
        field.position.y = -0.1;
        field.receiveShadow = true;
        
        this.components.field = field;
        this.stadiumGroup.add(field);
        
        // Boundary rope
        const ropeGeometry = new THREE.TorusGeometry(this.dimensions.boundaryRadius, 0.2, 16, 64);
        const ropeMaterial = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.5,
            metalness: 0.2
        });
        const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
        rope.rotation.x = Math.PI / 2;
        rope.position.y = 0.1;
        rope.receiveShadow = true;
        this.stadiumGroup.add(rope);
        
        // Inner circle markings
        const circle30 = new THREE.TorusGeometry(27.43, 0.05, 8, 32);
        const markingMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        const circle = new THREE.Mesh(circle30, markingMaterial);
        circle.rotation.x = Math.PI / 2;
        circle.position.y = 0.05;
        this.stadiumGroup.add(circle);
    }
    
    createPitch() {
        const { pitchLength, pitchWidth } = this.dimensions;
        
        // Main pitch area
        const pitchGeometry = new THREE.PlaneGeometry(pitchLength + 2, pitchWidth + 2);
        const pitch = new THREE.Mesh(pitchGeometry, this.materials.pitch);
        pitch.rotation.x = -Math.PI / 2;
        pitch.position.y = 0.01;
        pitch.receiveShadow = true;
        
        this.components.pitch = pitch;
        this.stadiumGroup.add(pitch);
        
        // Crease lines
        this.createCrease(pitchLength / 2);
        this.createCrease(-pitchLength / 2);
        
        // Stumps
        this.createStumps(pitchLength / 2);
        this.createStumps(-pitchLength / 2);
    }
    
    createCrease(zPosition) {
        const creaseGeometry = new THREE.PlaneGeometry(2.44, 0.05);
        const creaseMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        
        // Bowling crease
        const bowlingCrease = new THREE.Mesh(creaseGeometry, creaseMaterial);
        bowlingCrease.rotation.x = -Math.PI / 2;
        bowlingCrease.position.set(0, 0.02, zPosition);
        this.stadiumGroup.add(bowlingCrease);
        
        // Popping crease
        const poppingCrease = new THREE.Mesh(
            new THREE.PlaneGeometry(3.66, 0.05),
            creaseMaterial
        );
        poppingCrease.rotation.x = -Math.PI / 2;
        poppingCrease.position.set(
            0, 
            0.02, 
            zPosition > 0 ? zPosition - 1.22 : zPosition + 1.22
        );
        this.stadiumGroup.add(poppingCrease);
    }
    
    createStumps(zPosition) {
        const stumpHeight = 0.71;
        const stumpRadius = 0.02;
        
        // Three stumps
        for (let i = -1; i <= 1; i++) {
            const stumpGeometry = new THREE.CylinderGeometry(stumpRadius, stumpRadius, stumpHeight, 8);
            const stumpMaterial = new THREE.MeshStandardMaterial({
                color: '#deb887',
                roughness: 0.6
            });
            const stump = new THREE.Mesh(stumpGeometry, stumpMaterial);
            stump.position.set(i * 0.1, stumpHeight / 2, zPosition);
            stump.castShadow = true;
            stump.receiveShadow = true;
            this.stadiumGroup.add(stump);
        }
        
        // Bails
        const bailGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6);
        const bailMaterial = new THREE.MeshStandardMaterial({
            color: '#ff0000',
            roughness: 0.3
        });
        
        for (let i = -0.5; i <= 0.5; i++) {
            const bail = new THREE.Mesh(bailGeometry, bailMaterial);
            bail.rotation.z = Math.PI / 2;
            bail.position.set(i * 0.1, stumpHeight, zPosition);
            bail.castShadow = true;
            this.stadiumGroup.add(bail);
        }
    }
    
    createStands() {
        const segments = 16;
        const angleStep = (Math.PI * 2) / segments;
        
        for (let i = 0; i < segments; i++) {
            // Skip some segments for pavilion and sightscreen
            if (i >= 6 && i <= 10) continue;
            
            const angle = i * angleStep;
            const stand = this.createStandSection(angle);
            this.components.stands.push(stand);
            this.stadiumGroup.add(stand);
        }
    }
    
    createStandSection(angle) {
        const group = new THREE.Group();
        const radius = this.dimensions.boundaryRadius + 5;
        const width = 20;
        const height = this.dimensions.standHeight;
        const depth = 15;
        
        // Stand base
        const baseGeometry = new THREE.BoxGeometry(width, 2, depth);
        const base = new THREE.Mesh(baseGeometry, this.materials.concrete);
        base.position.set(
            Math.cos(angle) * radius,
            1,
            Math.sin(angle) * radius
        );
        base.rotation.y = -angle + Math.PI / 2;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Seating tiers
        for (let tier = 0; tier < 5; tier++) {
            const tierGeometry = new THREE.BoxGeometry(width - 2, 2, depth - 2);
            const tierMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(tier * 0.1, 0.5, 0.5),
                roughness: 0.8
            });
            
            const tierMesh = new THREE.Mesh(tierGeometry, tierMaterial);
            tierMesh.position.set(
                Math.cos(angle) * radius,
                3 + tier * 4,
                Math.sin(angle) * radius
            );
            tierMesh.rotation.y = -angle + Math.PI / 2;
            tierMesh.castShadow = true;
            group.add(tierMesh);
        }
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(depth / 2, 3, 4);
        const roof = new THREE.Mesh(roofGeometry, this.materials.roof);
        roof.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        roof.rotation.y = angle;
        roof.castShadow = true;
        group.add(roof);
        
        return group;
    }
    
    createPavilion() {
        const group = new THREE.Group();
        const position = new THREE.Vector3(0, 0, -(this.dimensions.boundaryRadius + 20));
        
        // Main building
        const buildingGeometry = new THREE.BoxGeometry(40, 15, 20);
        const building = new THREE.Mesh(buildingGeometry, this.materials.concrete);
        building.position.copy(position);
        building.position.y = 7.5;
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);
        
        // Glass facade
        const glassGeometry = new THREE.PlaneGeometry(38, 10);
        const glass = new THREE.Mesh(glassGeometry, this.materials.glass);
        glass.position.set(position.x, 10, position.z + 10.1);
        glass.castShadow = true;
        group.add(glass);
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(25, 5, 4);
        const roof = new THREE.Mesh(roofGeometry, this.materials.roof);
        roof.position.set(position.x, 17.5, position.z);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);
        
        this.components.pavilion = group;
        this.stadiumGroup.add(group);
    }
    
    createFloodlights() {
        const positions = [
            [45, 35, 45],
            [-45, 35, 45],
            [45, 35, -45],
            [-45, 35, -45]
        ];
        
        positions.forEach(([x, y, z]) => {
            const floodlight = this.createFloodlightTower(x, y, z);
            this.components.floodlights.push(floodlight);
            this.stadiumGroup.add(floodlight);
        });
    }
    
    createFloodlightTower(x, y, z) {
        const group = new THREE.Group();
        
        // Tower pole
        const poleGeometry = new THREE.CylinderGeometry(0.5, 1, y, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: '#444444',
            roughness: 0.5,
            metalness: 0.8
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(x, y / 2, z);
        pole.castShadow = true;
        group.add(pole);
        
        // Light array
        const lightGroup = new THREE.Group();
        const lightCount = 8;
        
        for (let i = 0; i < lightCount; i++) {
            const angle = (i / lightCount) * Math.PI * 2;
            const lightGeometry = new THREE.SphereGeometry(0.5, 8, 8);
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: '#ffffcc'
            });
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(
                Math.cos(angle) * 3,
                0,
                Math.sin(angle) * 3
            );
            lightGroup.add(light);
            
            // Light glow
            const glowGeometry = new THREE.SphereGeometry(1, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: '#ffff99',
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            light.add(glow);
        }
        
        lightGroup.position.set(x, y, z);
        group.add(lightGroup);
        
        return group;
    }
    
    createSightScreens() {
        const positions = [
            { x: 0, z: this.dimensions.boundaryRadius + 10, rotY: 0 },
            { x: 0, z: -(this.dimensions.boundaryRadius + 10), rotY: Math.PI }
        ];
        
        positions.forEach(pos => {
            const screenGeometry = new THREE.PlaneGeometry(10, 5);
            const screenMaterial = new THREE.MeshStandardMaterial({
                color: '#ffffff',
                roughness: 0.9
            });
            const screen = new THREE.Mesh(screenGeometry, screenMaterial);
            screen.position.set(pos.x, 2.5, pos.z);
            screen.rotation.y = pos.rotY;
            screen.castShadow = true;
            this.components.sightScreen = screen;
            this.stadiumGroup.add(screen);
        });
    }
    
    createScoreboard() {
        const scoreboardGroup = new THREE.Group();
        const position = new THREE.Vector3(
            this.dimensions.boundaryRadius - 10,
            20,
            0
        );
        
        // Scoreboard frame
        const frameGeometry = new THREE.BoxGeometry(15, 8, 2);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: '#000000',
            roughness: 0.5,
            metalness: 0.5
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.copy(position);
        frame.castShadow = true;
        scoreboardGroup.add(frame);
        
        // Screen
        const screenGeometry = new THREE.PlaneGeometry(13, 6);
        const screenMaterial = new THREE.MeshBasicMaterial({
            color: '#003300'
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(position.x, position.y, position.z + 1.1);
        scoreboardGroup.add(screen);
        
        this.components.scoreboard = scoreboardGroup;
        this.stadiumGroup.add(scoreboardGroup);
    }
    
    createEnvironment() {
        // Sky dome
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color('#1e3c72') },
                bottomColor: { value: new THREE.Color('#87CEEB') },
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: /* glsl */ `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(
                        mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)),
                        1.0
                    );
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.stadiumGroup.add(sky);
        
        // Cloud system
        this.createClouds();
        
        // Trees around stadium
        this.createTrees();
    }
    
    createClouds() {
        const cloudCount = 20;
        
        for (let i = 0; i < cloudCount; i++) {
            const cloud = this.createCloud();
            const angle = (i / cloudCount) * Math.PI * 2;
            const radius = this.dimensions.boundaryRadius + 30;
            
            cloud.position.set(
                Math.cos(angle) * radius,
                50 + Math.random() * 20,
                Math.sin(angle) * radius
            );
            
            this.stadiumGroup.add(cloud);
        }
    }
    
    createCloud() {
        const group = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.8,
            transparent: true,
            opacity: 0.9
        });
        
        // Create cloud from multiple spheres
        for (let i = 0; i < 5; i++) {
            const size = 2 + Math.random() * 3;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 5
            );
            group.add(sphere);
        }
        
        return group;
    }
    
    createTrees() {
        const treeCount = 50;
        
        for (let i = 0; i < treeCount; i++) {
            const angle = (i / treeCount) * Math.PI * 2;
            const radius = this.dimensions.boundaryRadius + 15 + Math.random() * 20;
            
            const tree = this.createTree();
            tree.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            
            this.stadiumGroup.add(tree);
        }
    }
    
    createTree() {
        const group = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 5, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: '#8B4513',
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2.5;
        trunk.castShadow = true;
        group.add(trunk);
        
        // Foliage
        const foliageGeometry = new THREE.ConeGeometry(3, 6, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: '#228B22',
            roughness: 0.8
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 7;
        foliage.castShadow = true;
        group.add(foliage);
        
        return group;
    }
    
    createCrowdSystem() {
        // Create crowd particles/proxies in stands
        const crowdGroup = new THREE.Group();
        crowdGroup.name = 'Crowd';
        
        const segments = 16;
        const angleStep = (Math.PI * 2) / segments;
        
        for (let i = 0; i < segments; i++) {
            if (i >= 6 && i <= 10) continue;
            
            const angle = i * angleStep;
            const radius = this.dimensions.boundaryRadius + 8;
            
            // Create crowd in this stand section
            const sectionCrowd = this.createCrowdSection(angle, radius);
            crowdGroup.add(sectionCrowd);
        }
        
        this.stadiumGroup.add(crowdGroup);
    }
    
    createCrowdSection(angle, radius) {
        const group = new THREE.Group();
        const crowdSize = 100; // Number of crowd members
        
        const colors = [
            '#FF0000', '#0000FF', '#FFFF00', '#00FF00', 
            '#FFA500', '#800080', '#FFC0CB', '#000000',
            '#FFFFFF', '#808080'
        ];
        
        for (let i = 0; i < crowdSize; i++) {
            const height = 3 + Math.random() * 20;
            const sectionAngle = angle + (Math.random() - 0.5) * 0.3;
            const sectionRadius = radius + Math.random() * 8;
            
            const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                roughness: 0.8
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            
            body.position.set(
                Math.cos(sectionAngle) * sectionRadius,
                height,
                Math.sin(sectionAngle) * sectionRadius
            );
            
            body.rotation.y = -sectionAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
            
            group.add(body);
        }
        
        return group;
    }
    
    update(deltaTime) {
        // Update grass shader time
        if (this.materials.grass && this.materials.grass.uniforms) {
            this.materials.grass.uniforms.time.value += deltaTime;
        }
        
        // Update crowd animations
        this.animateCrowd(deltaTime);
    }
    
    animateCrowd(deltaTime) {
        const crowdGroup = this.stadiumGroup.getObjectByName('Crowd');
        if (!crowdGroup) return;
        
        // Random crowd movement
        crowdGroup.children.forEach(section => {
            section.children.forEach(person => {
                // Subtle bobbing animation
                person.position.y += Math.sin(Date.now() * 0.003 + person.position.x) * 0.001;
            });
        });
    }
}