/**
 * Asset Loader
 * Manages loading of 3D models, textures, and audio files
 */

import * as THREE from '/static/js/lib/three-custom.js';
import { GLTFLoader, DRACOLoader, RGBELoader } from '/static/js/lib/three-custom.js';

export class AssetLoader {
    constructor() {
        this.loaders = {};
        this.cache = new Map();
        this.loadingQueue = [];
        this.totalAssets = 0;
        this.loadedAssets = 0;
        
        this.initializeLoaders();
    }
    
    /**
     * Initialize all loaders
     */
    initializeLoaders() {
        // GLTF/GLB loader with Draco compression
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.setDecoderConfig({ type: 'js' });
        
        this.loaders.gltf = new GLTFLoader();
        this.loaders.gltf.setDRACOLoader(dracoLoader);
        
        // Texture loader
        this.loaders.texture = new THREE.TextureLoader();
        
        // Cube texture loader
        this.loaders.cubeTexture = new THREE.CubeTextureLoader();
        
        // HDR loader
        this.loaders.hdr = new RGBELoader();
        this.loaders.hdr.setDataType(THREE.HalfFloatType);
        
        // Audio loader
        this.loaders.audio = new THREE.AudioLoader();
        
        // File loader (for generic files)
        this.loaders.file = new THREE.FileLoader();
        
        // Image loader
        this.loaders.image = new THREE.ImageLoader();
    }
    
    /**
     * Load all assets from manifest
     */
    async loadAll(manifest) {
        this.totalAssets = 0;
        this.loadedAssets = 0;
        
        // Count total assets
        for (const category of Object.values(manifest)) {
            this.totalAssets += category.length;
        }
        
        // Load models
        if (manifest.models) {
            for (const model of manifest.models) {
                this.loadingQueue.push(
                    this.loadModel(model.name, model.url)
                );
            }
        }
        
        // Load textures
        if (manifest.textures) {
            for (const texture of manifest.textures) {
                this.loadingQueue.push(
                    this.loadTexture(texture.name, texture.url)
                );
            }
        }
        
        // Load audio
        if (manifest.audio) {
            for (const audio of manifest.audio) {
                this.loadingQueue.push(
                    this.loadAudio(audio.name, audio.url)
                );
            }
        }
        
        // Process queue
        await Promise.all(this.loadingQueue);
        
        console.log(`✅ Loaded ${this.loadedAssets}/${this.totalAssets} assets`);
    }
    
    /**
     * Load a 3D model (GLTF/GLB)
     */
    async loadModel(name, url) {
        return new Promise((resolve, reject) => {
            this.loaders.gltf.load(
                url,
                (gltf) => {
                    // Process model
                    this.processModel(gltf.scene, name);
                    
                    // Cache the model
                    this.cache.set(`model_${name}`, gltf);
                    
                    this.loadedAssets++;
                    this.onProgress(name, this.loadedAssets / this.totalAssets);
                    resolve(gltf);
                },
                (progress) => {
                    // Individual model progress
                    if (progress.total > 0) {
                        const percent = progress.loaded / progress.total;
                        this.onAssetProgress(name, percent);
                    }
                },
                (error) => {
                    console.error(`Failed to load model ${name}:`, error);
                    // Create fallback geometry
                    const fallback = this.createFallbackModel(name);
                    this.cache.set(`model_${name}`, { scene: fallback });
                    this.loadedAssets++;
                    resolve({ scene: fallback });
                }
            );
        });
    }
    
    /**
     * Process loaded model
     */
    processModel(model, name) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Optimize materials
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => this.optimizeMaterial(mat));
                    } else {
                        this.optimizeMaterial(child.material);
                    }
                }
            }
        });
        
        model.name = name;
    }
    
    /**
     * Optimize material for performance
     */
    optimizeMaterial(material) {
        material.precision = 'mediump';
        material.depthWrite = true;
        material.depthTest = true;
        
        // Use simpler shaders for distant objects
        if (material.isMeshStandardMaterial) {
            material.envMapIntensity = 0.5;
            material.roughness = Math.min(material.roughness, 0.9);
        }
    }
    
    /**
     * Create fallback geometry for failed loads
     */
    createFallbackModel(name) {
        const group = new THREE.Group();
        group.name = `fallback_${name}`;
        
        // Simple humanoid shape for players
        if (name.includes('player') || name.includes('batsman') || 
            name.includes('bowler') || name.includes('fielder') || 
            name.includes('umpire')) {
            
            // Body
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.3, 1, 4, 8),
                new THREE.MeshStandardMaterial({ color: 0x4488ff })
            );
            body.position.y = 0.8;
            group.add(body);
            
            // Head
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xffcc99 })
            );
            head.position.y = 1.5;
            group.add(head);
            
            // Arms
            const armGeometry = new THREE.CapsuleGeometry(0.08, 0.6, 4, 8);
            const armMaterial = new THREE.MeshStandardMaterial({ color: 0x4488ff });
            
            const leftArm = new THREE.Mesh(armGeometry, armMaterial);
            leftArm.position.set(-0.4, 1.0, 0);
            leftArm.rotation.z = 0.3;
            group.add(leftArm);
            
            const rightArm = new THREE.Mesh(armGeometry, armMaterial);
            rightArm.position.set(0.4, 1.0, 0);
            rightArm.rotation.z = -0.3;
            group.add(rightArm);
            
            // Legs
            const legGeometry = new THREE.CapsuleGeometry(0.1, 0.7, 4, 8);
            const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333344 });
            
            const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
            leftLeg.position.set(-0.15, 0.15, 0);
            group.add(leftLeg);
            
            const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
            rightLeg.position.set(0.15, 0.15, 0);
            group.add(rightLeg);
        }
        
        return group;
    }
    
    /**
     * Load a texture
     */
    async loadTexture(name, url) {
        return new Promise((resolve, reject) => {
            this.loaders.texture.load(
                url,
                (texture) => {
                    texture.name = name;
                    
                    // Optimize texture
                    this.optimizeTexture(texture);
                    
                    this.cache.set(`texture_${name}`, texture);
                    this.loadedAssets++;
                    this.onProgress(name, this.loadedAssets / this.totalAssets);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error(`Failed to load texture ${name}:`, error);
                    // Create placeholder texture
                    const placeholder = this.createPlaceholderTexture(name);
                    this.cache.set(`texture_${name}`, placeholder);
                    this.loadedAssets++;
                    resolve(placeholder);
                }
            );
        });
    }
    
    /**
     * Optimize texture
     */
    optimizeTexture(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        
        // Limit texture size for performance
        if (texture.image && texture.image.width > 2048) {
            texture.image.width = 2048;
            texture.image.height = 2048 * (texture.image.height / texture.image.width);
        }
    }
    
    /**
     * Create placeholder texture
     */
    createPlaceholderTexture(name) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        
        const ctx = canvas.getContext('2d');
        
        // Checkered pattern
        const size = 32;
        for (let x = 0; x < canvas.width; x += size) {
            for (let y = 0; y < canvas.height; y += size) {
                ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#666666' : '#999999';
                ctx.fillRect(x, y, size, size);
            }
        }
        
        // Add text
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(name, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.name = name;
        this.optimizeTexture(texture);
        
        return texture;
    }
    
    /**
     * Load audio file
     */
    async loadAudio(name, url) {
        return new Promise((resolve, reject) => {
            this.loaders.audio.load(
                url,
                (buffer) => {
                    this.cache.set(`audio_${name}`, buffer);
                    this.loadedAssets++;
                    this.onProgress(name, this.loadedAssets / this.totalAssets);
                    resolve(buffer);
                },
                undefined,
                (error) => {
                    console.error(`Failed to load audio ${name}:`, error);
                    this.loadedAssets++;
                    resolve(null);
                }
            );
        });
    }
    
    /**
     * Get a loaded asset
     */
    get(name) {
        return this.cache.get(name);
    }
    
    /**
     * Get a loaded model
     */
    getModel(name) {
        const gltf = this.cache.get(`model_${name}`);
        return gltf ? gltf.scene.clone() : null;
    }
    
    /**
     * Get a loaded texture
     */
    getTexture(name) {
        return this.cache.get(`texture_${name}`);
    }
    
    /**
     * Get loaded audio buffer
     */
    getAudio(name) {
        return this.cache.get(`audio_${name}`);
    }
    
    /**
     * Check if asset is loaded
     */
    isLoaded(name) {
        return this.cache.has(name);
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.forEach((asset) => {
            if (asset.dispose) {
                asset.dispose();
            }
            if (asset.scene && asset.scene.traverse) {
                asset.scene.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        });
        
        this.cache.clear();
    }
    
    /**
     * Progress callbacks
     */
    onProgress(name, progress) {
        // Override this for loading screen updates
        const event = new CustomEvent('asset-progress', {
            detail: { name, progress }
        });
        window.dispatchEvent(event);
    }
    
    onAssetProgress(name, progress) {
        // Individual asset progress
    }
}