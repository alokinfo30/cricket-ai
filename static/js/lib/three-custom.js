/**
 * Custom Three.js Bundle with required modules
 * Includes: Core, Loaders, Controls, Post-processing
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/SSAOPass.js';
import { TAARenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/TAARenderPass.js';

// Export everything
export {
    THREE as default,
    OrbitControls,
    GLTFLoader,
    DRACOLoader,
    RGBELoader,
    EffectComposer,
    RenderPass,
    UnrealBloomPass,
    ShaderPass,
    SSAOPass,
    TAARenderPass
};

// Extend THREE with custom utilities
THREE.CustomShaderLib = {
    /**
     * Custom grass vertex shader
     */
    grassVertex: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        
        uniform float uTime;
        uniform float uWindStrength;
        
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            
            // Wind animation
            float wind = sin(worldPos.x * 2.0 + uTime) * cos(worldPos.z * 2.0 + uTime) * uWindStrength;
            worldPos.x += wind * 0.3;
            worldPos.z += wind * 0.2;
            
            vWorldPosition = worldPos.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            vUv = uv;
            
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    
    /**
     * Custom grass fragment shader with noise
     */
    grassFragment: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        
        uniform vec3 uGrassColor1;
        uniform vec3 uGrassColor2;
        uniform float uTime;
        
        // Simplex 2D noise
        vec3 permute(vec3 x) {
            return mod(((x*34.0)+1.0)*x, 289.0);
        }
        
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
            // Generate noise pattern
            float noise = snoise(vWorldPosition.xz * 0.15 + uTime * 0.05);
            float stripe = sin(vWorldPosition.z * 3.0) * 0.08;
            
            // Mix colors based on noise
            vec3 grassColor = mix(uGrassColor1, uGrassColor2, noise * 0.5 + 0.5 + stripe);
            
            // Add lighting
            float lighting = dot(vNormal, normalize(vec3(0.5, 1.0, 0.3)));
            grassColor *= 0.5 + lighting * 0.5;
            
            gl_FragColor = vec4(grassColor, 1.0);
        }
    `,
    
    /**
     * Sky gradient shader
     */
    skyVertex: /* glsl */ `
        varying vec3 vWorldPosition;
        
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    
    skyFragment: /* glsl */ `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform float uOffset;
        uniform float uExponent;
        
        varying vec3 vWorldPosition;
        
        void main() {
            float h = normalize(vWorldPosition + uOffset).y;
            gl_FragColor = vec4(
                mix(uBottomColor, uTopColor, max(pow(max(h, 0.0), uExponent), 0.0)),
                1.0
            );
        }
    `,
    
    /**
     * Ball trail shader
     */
    ballTrailVertex: /* glsl */ `
        attribute float aAlpha;
        varying float vAlpha;
        
        void main() {
            vAlpha = aAlpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    
    ballTrailFragment: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        
        void main() {
            gl_FragColor = vec4(uColor, vAlpha);
        }
    `
};

// Extend Math utils
THREE.MathUtils.clamp = function(value, min, max) {
    return Math.max(min, Math.min(max, value));
};

THREE.MathUtils.lerp = function(start, end, t) {
    return start + (end - start) * t;
};

THREE.MathUtils.smoothstep = function(edge0, edge1, x) {
    const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
};

// Add CapsuleGeometry if not present
if (!THREE.CapsuleGeometry) {
    THREE.CapsuleGeometry = class CapsuleGeometry extends THREE.LatheGeometry {
        constructor(radius = 1, length = 1, capSegments = 4, radialSegments = 8) {
            const points = [];
            
            // Bottom hemisphere
            for (let i = 0; i <= capSegments; i++) {
                const angle = (Math.PI / 2) + (i / capSegments) * (Math.PI / 2);
                points.push(new THREE.Vector2(
                    Math.cos(angle) * radius,
                    -length / 2 - Math.sin(angle) * radius + radius
                ));
            }
            
            // Cylinder part
            points.push(new THREE.Vector2(radius, -length / 2));
            points.push(new THREE.Vector2(radius, length / 2));
            
            // Top hemisphere
            for (let i = 0; i <= capSegments; i++) {
                const angle = (i / capSegments) * (Math.PI / 2);
                points.push(new THREE.Vector2(
                    Math.cos(angle) * radius,
                    length / 2 + Math.sin(angle) * radius - radius
                ));
            }
            
            super(points, radialSegments);
            this.type = 'CapsuleGeometry';
        }
    };
}

console.log('✅ Three.js custom bundle loaded');