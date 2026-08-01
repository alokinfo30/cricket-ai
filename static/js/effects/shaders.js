/**
 * Custom WebGL Shaders
 * Advanced shader effects for cricket game
 */

import * as THREE from '/static/js/lib/three-custom.js';

export class ShaderManager {
    constructor() {
        this.shaders = new Map();
        this.uniforms = new Map();
    }
    
    /**
     * Initialize all custom shaders
     */
    async initialize() {
        this.createGrassShader();
        this.createWaterShader();
        this.createSkyShader();
        this.createShadowShader();
        this.createGlowShader();
        this.createHeatHazeShader();
        this.createMotionBlurShader();
        
        console.log('🎨 Shader manager initialized');
    }
    
    /**
     * Advanced grass shader with wind animation
     */
    createGrassShader() {
        const grassShader = {
            uniforms: {
                time: { value: 0 },
                windDirection: { value: new THREE.Vector3(1, 0, 0) },
                windStrength: { value: 0.5 },
                grassColor1: { value: new THREE.Color('#2d5a27') },
                grassColor2: { value: new THREE.Color('#4a7c3f') },
                grassColor3: { value: new THREE.Color('#1a3d16') }
            },
            vertexShader: /* glsl */ `
                uniform float time;
                uniform vec3 windDirection;
                uniform float windStrength;
                
                varying vec2 vUv;
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                varying float vHeight;
                
                // Simplex 3D noise
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
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vNormal = normalize(mat3(modelMatrix) * normal);
                    vUv = uv;
                    vHeight = position.y;
                    
                    // Calculate wind effect
                    float windNoise = snoise(vec3(
                        worldPosition.x * 0.5 + time * 0.3,
                        worldPosition.y * 0.5,
                        worldPosition.z * 0.5 + time * 0.2
                    ));
                    
                    // Stronger wind effect for taller grass
                    float heightFactor = smoothstep(0.0, 0.5, position.y);
                    float windEffect = windNoise * windStrength * heightFactor;
                    
                    // Apply wind displacement
                    vec3 newPosition = position;
                    newPosition.x += windEffect * windDirection.x;
                    newPosition.z += windEffect * windDirection.z;
                    
                    // Add subtle swaying
                    float sway = sin(worldPosition.x * 2.0 + time) * cos(worldPosition.z * 2.0 + time) * 0.02;
                    newPosition.x += sway;
                    newPosition.z += sway;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 grassColor1;
                uniform vec3 grassColor2;
                uniform vec3 grassColor3;
                uniform float time;
                
                varying vec2 vUv;
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                varying float vHeight;
                
                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
                
                float snoise(vec2 v) {
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                       -0.577350269189626, 0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy));
                    vec2 x0 = v - i + dot(i, C.xx);
                    vec2 i1;
                    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod(i, 289.0);
                    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                                   + i.x + vec3(0.0, i1.x, 1.0));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                            dot(x12.zw,x12.zw)), 0.0);
                    m = m*m;
                    m = m*m;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                    vec3 g;
                    g.x = a0.x * x0.x + h.x * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }
                
                void main() {
                    // Generate grass pattern
                    float noise1 = snoise(vWorldPosition.xz * 0.1 + time * 0.02);
                    float noise2 = snoise(vWorldPosition.xz * 0.3 - time * 0.03);
                    float noise3 = snoise(vWorldPosition.xz * 0.5 + time * 0.01);
                    
                    // Create mowing pattern
                    float stripe = sin(vWorldPosition.z * 4.0) * 0.08;
                    
                    // Height-based coloring
                    float heightColor = smoothstep(0.0, 0.3, vHeight);
                    
                    // Mix colors
                    vec3 baseColor = mix(grassColor1, grassColor2, noise1 * 0.5 + 0.5);
                    baseColor = mix(baseColor, grassColor3, noise2 * 0.3);
                    baseColor = mix(baseColor, grassColor2, heightColor * 0.5);
                    baseColor += stripe;
                    
                    // Add variation
                    baseColor += noise3 * 0.05;
                    
                    // Simple lighting
                    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
                    float diffuse = dot(vNormal, lightDir) * 0.5 + 0.5;
                    baseColor *= diffuse;
                    
                    // Add subtle specular for wet look
                    vec3 viewDir = normalize(vec3(0.0, 1.0, -1.0));
                    vec3 halfDir = normalize(lightDir + viewDir);
                    float specular = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
                    baseColor += specular * 0.1;
                    
                    gl_FragColor = vec4(baseColor, 1.0);
                }
            `
        };
        
        this.shaders.set('grass', grassShader);
    }
    
    /**
     * Water shader for drinks break cooler effect
     */
    createWaterShader() {
        const waterShader = {
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color('#4488ff') }
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
                uniform vec3 color;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    // Animated water ripples
                    float ripple1 = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time) * 0.1;
                    float ripple2 = sin(vUv.x * 20.0 - time * 0.5) * cos(vUv.y * 15.0 + time * 0.3) * 0.05;
                    float ripple3 = sin(length(vUv - 0.5) * 15.0 - time * 2.0) * 0.08;
                    
                    vec3 waterColor = color + ripple1 + ripple2 + ripple3;
                    
                    // Fresnel effect
                    float fresnel = pow(1.0 - abs(dot(normalize(vPosition), vec3(0.0, 1.0, 0.0))), 3.0);
                    waterColor += fresnel * 0.2;
                    
                    gl_FragColor = vec4(waterColor, 0.8);
                }
            `
        };
        
        this.shaders.set('water', waterShader);
    }
    
    /**
     * Dynamic sky shader
     */
    createSkyShader() {
        const skyShader = {
            uniforms: {
                topColor: { value: new THREE.Color('#1e3c72') },
                middleColor: { value: new THREE.Color('#2a5298') },
                bottomColor: { value: new THREE.Color('#87CEEB') },
                sunPosition: { value: new THREE.Vector3(0, 100, 0) },
                time: { value: 0 }
            },
            vertexShader: /* glsl */ `
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vNormal = normalize(mat3(modelMatrix) * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 topColor;
                uniform vec3 middleColor;
                uniform vec3 bottomColor;
                uniform vec3 sunPosition;
                uniform float time;
                
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                
                void main() {
                    float h = normalize(vWorldPosition).y;
                    
                    // Sky gradient
                    vec3 skyColor;
                    if (h > 0.3) {
                        skyColor = mix(middleColor, topColor, (h - 0.3) / 0.7);
                    } else if (h > 0.0) {
                        skyColor = mix(bottomColor, middleColor, h / 0.3);
                    } else {
                        skyColor = bottomColor;
                    }
                    
                    // Sun glow
                    vec3 sunDir = normalize(sunPosition);
                    float sunDot = dot(normalize(vWorldPosition), sunDir);
                    float sunGlow = smoothstep(0.95, 1.0, sunDot) * 0.5;
                    skyColor += sunGlow * vec3(1.0, 0.9, 0.5);
                    
                    // Cloud effect
                    float cloudNoise = sin(vWorldPosition.x * 0.01 + time * 0.01) * 
                                      cos(vWorldPosition.z * 0.01 + time * 0.01) * 0.5 + 0.5;
                    skyColor = mix(skyColor, vec3(1.0), cloudNoise * 0.1 * (1.0 - abs(h)));
                    
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide
        };
        
        this.shaders.set('sky', skyShader);
    }
    
    /**
     * Enhanced shadow shader
     */
    createShadowShader() {
        const shadowShader = {
            uniforms: {
                shadowMap: { value: null },
                shadowMatrix: { value: new THREE.Matrix4() }
            },
            vertexShader: /* glsl */ `
                varying vec4 vShadowCoord;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vShadowCoord = shadowMatrix * worldPosition;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform sampler2D shadowMap;
                varying vec4 vShadowCoord;
                
                float unpackDepth(const in vec4 rgba_depth) {
                    const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
                    float depth = dot(rgba_depth, bit_shift);
                    return depth;
                }
                
                void main() {
                    vec3 shadowCoord = vShadowCoord.xyz / vShadowCoord.w;
                    shadowCoord = shadowCoord * 0.5 + 0.5;
                    
                    float shadow = 1.0;
                    
                    if (shadowCoord.z > 0.0 && shadowCoord.z < 1.0) {
                        float shadowDepth = unpackDepth(texture2D(shadowMap, shadowCoord.xy));
                        
                        if (shadowDepth < shadowCoord.z - 0.005) {
                            shadow = 0.5;
                        }
                        
                        // PCF (Percentage Closer Filtering)
                        float shadowSum = 0.0;
                        float texelSize = 1.0 / 2048.0;
                        
                        for (float x = -1.5; x <= 1.5; x += 1.0) {
                            for (float y = -1.5; y <= 1.5; y += 1.0) {
                                float pcfDepth = unpackDepth(
                                    texture2D(shadowMap, shadowCoord.xy + vec2(x, y) * texelSize)
                                );
                                shadowSum += shadowCoord.z - 0.005 > pcfDepth ? 0.5 : 1.0;
                            }
                        }
                        
                        shadow = shadowSum / 16.0;
                    }
                    
                    gl_FragColor = vec4(vec3(shadow), 1.0);
                }
            `
        };
        
        this.shaders.set('shadow', shadowShader);
    }
    
    /**
     * Glow effect shader
     */
    createGlowShader() {
        const glowShader = {
            uniforms: {
                glowColor: { value: new THREE.Color('#ffff00') },
                intensity: { value: 1.0 },
                falloff: { value: 2.0 }
            },
            vertexShader: /* glsl */ `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vPosition = worldPosition.xyz;
                    vNormal = normalize(mat3(modelMatrix) * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 glowColor;
                uniform float intensity;
                uniform float falloff;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vec3 viewDir = normalize(cameraPosition - vPosition);
                    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
                    float glow = pow(fresnel, falloff) * intensity;
                    
                    gl_FragColor = vec4(glowColor, glow);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        };
        
        this.shaders.set('glow', glowShader);
    }
    
    /**
     * Heat haze shader (for hot day effect)
     */
    createHeatHazeShader() {
        const heatHazeShader = {
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 },
                distortion: { value: 0.5 }
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform float distortion;
                
                varying vec2 vUv;
                
                void main() {
                    vec2 distortedUv = vUv;
                    
                    // Simplex-like distortion
                    distortedUv.x += sin(vUv.y * 10.0 + time) * distortion * 0.01;
                    distortedUv.y += cos(vUv.x * 10.0 + time) * distortion * 0.01;
                    
                    vec4 color = texture2D(tDiffuse, distortedUv);
                    
                    // Add heat shimmer
                    float shimmer = sin(vUv.y * 50.0 + time * 5.0) * 0.02;
                    color.rgb += shimmer;
                    
                    gl_FragColor = color;
                }
            `
        };
        
        this.shaders.set('heatHaze', heatHazeShader);
    }
    
    /**
     * Motion blur shader
     */
    createMotionBlurShader() {
        const motionBlurShader = {
            uniforms: {
                tDiffuse: { value: null },
                velocity: { value: new THREE.Vector2(0, 0) },
                samples: { value: 8 }
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform sampler2D tDiffuse;
                uniform vec2 velocity;
                uniform int samples;
                
                varying vec2 vUv;
                
                void main() {
                    vec4 color = vec4(0.0);
                    vec2 blurVector = velocity / float(samples);
                    
                    for (int i = 0; i < 8; i++) {
                        color += texture2D(tDiffuse, vUv + blurVector * float(i));
                    }
                    
                    color /= float(samples);
                    gl_FragColor = color;
                }
            `
        };
        
        this.shaders.set('motionBlur', motionBlurShader);
    }
    
    /**
     * Get shader by name
     */
    getShader(name) {
        return this.shaders.get(name);
    }
    
    /**
     * Create material from shader
     */
    createShaderMaterial(name, customUniforms = {}) {
        const shader = this.shaders.get(name);
        if (!shader) {
            console.warn(`Shader not found: ${name}`);
            return new THREE.MeshStandardMaterial();
        }
        
        const uniforms = { ...shader.uniforms, ...customUniforms };
        
        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: shader.transparent || false,
            blending: shader.blending || THREE.NormalBlending,
            depthWrite: shader.depthWrite !== undefined ? shader.depthWrite : true,
            side: shader.side || THREE.FrontSide
        });
    }
    
    /**
     * Update shader uniforms
     */
    update(deltaTime) {
        // Update time-based uniforms
        for (const [name, shader] of this.shaders) {
            if (shader.uniforms.time) {
                shader.uniforms.time.value += deltaTime;
            }
        }
    }
}