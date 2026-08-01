/**
 * Player 3D Model
 * Complete player model with customization
 */

import * as THREE from '/static/js/lib/three-custom.js';

export class PlayerModel {
    constructor(options = {}) {
        this.options = {
            height: 1.8,
            build: 'athletic',
            skinColor: '#E0AC69',
            hairStyle: 'short',
            hairColor: '#000000',
            jerseyColor: '#1a237e',
            jerseyNumber: 7,
            role: 'batsman',
            ...options
        };
        
        this.model = new THREE.Group();
        this.bones = {};
        this.animations = {};
        
        this.buildModel();
    }
    
    /**
     * Build complete player model
     */
    buildModel() {
        this.createBody();
        this.createHead();
        this.createArms();
        this.createLegs();
        this.createJersey();
        this.createEquipment();
        
        return this.model;
    }
    
    /**
     * Create body
     */
    createBody() {
        const bodyGroup = new THREE.Group();
        bodyGroup.name = 'body';
        
        // Torso
        const torsoGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: this.options.skinColor,
            roughness: 0.6
        });
        
        this.torso = new THREE.Mesh(torsoGeometry, skinMaterial);
        this.torso.position.y = 0.9;
        this.torso.castShadow = true;
        bodyGroup.add(this.torso);
        
        // Neck
        const neckGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
        const neck = new THREE.Mesh(neckGeometry, skinMaterial);
        neck.position.y = 1.45;
        neck.castShadow = true;
        bodyGroup.add(neck);
        
        this.model.add(bodyGroup);
    }
    
    /**
     * Create head with facial features
     */
    createHead() {
        const headGroup = new THREE.Group();
        headGroup.name = 'head';
        headGroup.position.y = 1.6;
        
        // Skull
        const skullGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: this.options.skinColor,
            roughness: 0.5
        });
        
        const skull = new THREE.Mesh(skullGeometry, skinMaterial);
        skull.castShadow = true;
        headGroup.add(skull);
        
        // Face
        const faceGeometry = new THREE.SphereGeometry(0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const face = new THREE.Mesh(faceGeometry, skinMaterial);
        face.position.z = 0.05;
        face.castShadow = true;
        headGroup.add(face);
        
        // Eyes
        this.createEye(headGroup, -0.05);
        this.createEye(headGroup, 0.05);
        
        // Nose
        const noseGeometry = new THREE.ConeGeometry(0.02, 0.04, 4);
        const nose = new THREE.Mesh(noseGeometry, skinMaterial);
        nose.position.set(0, -0.02, 0.15);
        nose.rotation.x = Math.PI / 2;
        headGroup.add(nose);
        
        // Mouth
        const mouthGeometry = new THREE.TorusGeometry(0.03, 0.005, 4, 8, Math.PI);
        const mouthMaterial = new THREE.MeshStandardMaterial({
            color: '#cc4444',
            roughness: 0.3
        });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, -0.06, 0.14);
        headGroup.add(mouth);
        
        // Hair
        this.createHair(headGroup);
        
        // Helmet (for batsman)
        if (this.options.role === 'batsman' || this.options.role === 'wicket-keeper') {
            this.createHelmet(headGroup);
        }
        
        // Cap (for bowler/fielder)
        if (this.options.role === 'bowler' || this.options.role === 'all-rounder') {
            this.createCap(headGroup);
        }
        
        this.model.add(headGroup);
    }
    
    /**
     * Create eye
     */
    createEye(headGroup, xOffset) {
        const eyeWhiteGeometry = new THREE.SphereGeometry(0.025, 8, 8);
        const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.1
        });
        const eyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        eyeWhite.position.set(xOffset, 0.04, 0.14);
        headGroup.add(eyeWhite);
        
        const pupilGeometry = new THREE.SphereGeometry(0.012, 6, 6);
        const pupilMaterial = new THREE.MeshStandardMaterial({
            color: '#000000',
            roughness: 0.05
        });
        const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        pupil.position.set(xOffset, 0.04, 0.16);
        headGroup.add(pupil);
        
        // Eyebrow
        const eyebrowGeometry = new THREE.BoxGeometry(0.04, 0.005, 0.01);
        const eyebrowMaterial = new THREE.MeshStandardMaterial({
            color: this.options.hairColor,
            roughness: 0.8
        });
        const eyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
        eyebrow.position.set(xOffset, 0.06, 0.14);
        headGroup.add(eyebrow);
    }
    
    /**
     * Create hair
     */
    createHair(headGroup) {
        const hairGroup = new THREE.Group();
        
        if (this.options.hairStyle === 'short') {
            const hairGeometry = new THREE.SphereGeometry(0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const hairMaterial = new THREE.MeshStandardMaterial({
                color: this.options.hairColor,
                roughness: 0.8
            });
            const hair = new THREE.Mesh(hairGeometry, hairMaterial);
            hair.position.y = 0.05;
            hair.castShadow = true;
            hairGroup.add(hair);
        } else if (this.options.hairStyle === 'medium') {
            const hairGeometry = new THREE.SphereGeometry(0.17, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.5);
            const hair = new THREE.Mesh(hairGeometry, new THREE.MeshStandardMaterial({
                color: this.options.hairColor,
                roughness: 0.8
            }));
            hair.position.y = 0.03;
            hair.castShadow = true;
            hairGroup.add(hair);
        }
        
        headGroup.add(hairGroup);
    }
    
    /**
     * Create batting helmet
     */
    createHelmet(headGroup) {
        const helmetGroup = new THREE.Group();
        helmetGroup.position.y = 0.02;
        
        // Helmet shell
        const shellGeometry = new THREE.SphereGeometry(0.17, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const shellMaterial = new THREE.MeshStandardMaterial({
            color: this.options.jerseyColor,
            roughness: 0.3,
            metalness: 0.5
        });
        const shell = new THREE.Mesh(shellGeometry, shellMaterial);
        shell.castShadow = true;
        helmetGroup.add(shell);
        
        // Grill
        const grillGroup = new THREE.Group();
        grillGroup.position.set(0, -0.05, 0.08);
        
        for (let i = 0; i < 5; i++) {
            const barGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4);
            const barMaterial = new THREE.MeshStandardMaterial({
                color: '#cccccc',
                roughness: 0.3,
                metalness: 0.8
            });
            const bar = new THREE.Mesh(barGeometry, barMaterial);
            bar.position.set((i - 2) * 0.04, 0, 0);
            bar.rotation.x = Math.PI / 2;
            grillGroup.add(bar);
        }
        
        helmetGroup.add(grillGroup);
        headGroup.add(helmetGroup);
    }
    
    /**
     * Create cap
     */
    createCap(headGroup) {
        const capGroup = new THREE.Group();
        capGroup.position.y = 0.05;
        
        // Cap base
        const capBaseGeometry = new THREE.CylinderGeometry(0.16, 0.17, 0.08, 16);
        const capMaterial = new THREE.MeshStandardMaterial({
            color: this.options.jerseyColor,
            roughness: 0.6
        });
        const capBase = new THREE.Mesh(capBaseGeometry, capMaterial);
        capBase.castShadow = true;
        capGroup.add(capBase);
        
        // Cap brim
        const brimGeometry = new THREE.BoxGeometry(0.25, 0.02, 0.15);
        const brim = new THREE.Mesh(brimGeometry, capMaterial);
        brim.position.set(0, -0.03, 0.1);
        brim.rotation.x = -0.3;
        capGroup.add(brim);
        
        headGroup.add(capGroup);
    }
    
    /**
     * Create arms
     */
    createArms() {
        const armsGroup = new THREE.Group();
        armsGroup.position.y = 1.2;
        
        const armGeometry = new THREE.CapsuleGeometry(0.07, 0.6, 4, 8);
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: this.options.skinColor,
            roughness: 0.6
        });
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
        leftArm.position.set(-0.4, 0.1, 0);
        leftArm.rotation.z = 0.3;
        leftArm.castShadow = true;
        armsGroup.add(leftArm);
        
        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
        rightArm.position.set(0.4, 0.1, 0);
        rightArm.rotation.z = -0.3;
        rightArm.castShadow = true;
        armsGroup.add(rightArm);
        
        // Hands
        const handGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        
        const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
        leftHand.position.set(-0.4, 0.45, 0);
        armsGroup.add(leftHand);
        
        const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
        rightHand.position.set(0.4, 0.45, 0);
        armsGroup.add(rightHand);
        
        this.model.add(armsGroup);
    }
    
    /**
     * Create legs
     */
    createLegs() {
        const legsGroup = new THREE.Group();
        legsGroup.position.y = 0.3;
        
        const legGeometry = new THREE.CapsuleGeometry(0.1, 0.7, 4, 8);
        
        // Pants material
        const pantsMaterial = new THREE.MeshStandardMaterial({
            color: '#1a1a2e',
            roughness: 0.7
        });
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        leftLeg.position.set(-0.15, 0, 0);
        leftLeg.castShadow = true;
        legsGroup.add(leftLeg);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        rightLeg.position.set(0.15, 0, 0);
        rightLeg.castShadow = true;
        legsGroup.add(rightLeg);
        
        // Shoes
        const shoeGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.2);
        const shoeMaterial = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.4
        });
        
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.15, -0.35, 0.05);
        leftShoe.castShadow = true;
        legsGroup.add(leftShoe);
        
        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.15, -0.35, 0.05);
        rightShoe.castShadow = true;
        legsGroup.add(rightShoe);
        
        this.model.add(legsGroup);
    }
    
    /**
     * Create jersey/clothing
     */
    createJersey() {
        // Jersey body
        const jerseyGeometry = new THREE.CapsuleGeometry(0.32, 0.7, 4, 8);
        const jerseyMaterial = new THREE.MeshStandardMaterial({
            color: this.options.jerseyColor,
            roughness: 0.5,
            metalness: 0.1
        });
        
        const jersey = new THREE.Mesh(jerseyGeometry, jerseyMaterial);
        jersey.position.y = 0.9;
        jersey.castShadow = true;
        this.model.add(jersey);
        
        // Jersey number
        this.createJerseyNumber();
    }
    
    /**
     * Create jersey number
     */
    createJerseyNumber() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.options.jerseyNumber.toString(), 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const numberMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        const numberGeometry = new THREE.PlaneGeometry(0.2, 0.2);
        const number = new THREE.Mesh(numberGeometry, numberMaterial);
        number.position.set(0, 0.9, -0.33);
        this.model.add(number);
    }
    
    /**
     * Create equipment based on role
     */
    createEquipment() {
        if (this.options.role === 'batsman' || this.options.role === 'wicket-keeper') {
            this.createBat();
            this.createGloves();
            this.createPads();
        }
        
        if (this.options.role === 'wicket-keeper') {
            this.createWicketKeepingGloves();
        }
    }
    
    /**
     * Create cricket bat
     */
    createBat() {
        const batGroup = new THREE.Group();
        batGroup.position.set(0.4, 0.5, -0.1);
        batGroup.rotation.z = -0.5;
        
        // Bat handle
        const handleGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: '#8B4513',
            roughness: 0.7
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = 0.2;
        batGroup.add(handle);
        
        // Bat blade
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(-0.04, 0);
        bladeShape.lineTo(0.04, 0);
        bladeShape.lineTo(0.06, 0.7);
        bladeShape.lineTo(-0.06, 0.7);
        bladeShape.closePath();
        
        const extrudeSettings = { steps: 1, depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 };
        const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: '#F5DEB3',
            roughness: 0.3
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(-0.04, 0, -0.015);
        blade.rotation.x = Math.PI;
        blade.castShadow = true;
        batGroup.add(blade);
        
        this.model.add(batGroup);
    }
    
    /**
     * Create batting gloves
     */
    createGloves() {
        const gloveGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.06);
        const gloveMaterial = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.4
        });
        
        const leftGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
        leftGlove.position.set(-0.4, 0.45, 0);
        this.model.add(leftGlove);
        
        const rightGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
        rightGlove.position.set(0.4, 0.45, 0);
        this.model.add(rightGlove);
    }
    
    /**
     * Create batting pads
     */
    createPads() {
        const padGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.08);
        const padMaterial = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.5
        });
        
        const leftPad = new THREE.Mesh(padGeometry, padMaterial);
        leftPad.position.set(-0.15, 0.3, 0.15);
        this.model.add(leftPad);
        
        const rightPad = new THREE.Mesh(padGeometry, padMaterial);
        rightPad.position.set(0.15, 0.3, 0.15);
        this.model.add(rightPad);
    }
    
    /**
     * Create wicket-keeping gloves
     */
    createWicketKeepingGloves() {
        const gloveGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const gloveMaterial = new THREE.MeshStandardMaterial({
            color: '#444444',
            roughness: 0.3
        });
        
        const leftGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
        leftGlove.position.set(-0.4, 0.45, 0);
        leftGlove.scale.set(1.5, 1, 1);
        this.model.add(leftGlove);
        
        const rightGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
        rightGlove.position.set(0.4, 0.45, 0);
        rightGlove.scale.set(1.5, 1, 1);
        this.model.add(rightGlove);
    }
    
    /**
     * Get the model
     */
    getModel() {
        return this.model;
    }
    
    /**
     * Set animation pose
     */
    setPose(pose) {
        // Apply pose to body parts
        if (pose.torso) {
            this.torso.rotation.copy(pose.torso);
        }
    }
}