/**
 * Animation System
 * Complete animation system for player movements
 */

import * as THREE from '/static/js/lib/three-custom.js';

export class AnimationSystem {
    constructor() {
        this.animations = new Map();
        this.activeAnimations = new Map();
        this.mixer = null;
        this.clock = new THREE.Clock();
    }
    
    /**
     * Initialize animation system
     */
    initialize() {
        this.createAnimations();
        console.log('🏃 Animation system initialized');
    }
    
    /**
     * Create all animation definitions
     */
    createAnimations() {
        // Batting animations
        this.createBattingAnimations();
        
        // Bowling animations
        this.createBowlingAnimations();
        
        // Fielding animations
        this.createFieldingAnimations();
        
        // Celebration animations
        this.createCelebrationAnimations();
    }
    
    /**
     * Create batting shot animations
     */
    createBattingAnimations() {
        // Cover drive
        this.animations.set('cover_drive', {
            duration: 0.8,
            keyframes: [
                { time: 0.0, pose: this.createIdlePose() },
                { time: 0.3, pose: this.createBackliftPose() },
                { time: 0.6, pose: this.createDrivePose() },
                { time: 0.8, pose: this.createFollowThroughPose() }
            ]
        });
        
        // Pull shot
        this.animations.set('pull_shot', {
            duration: 0.7,
            keyframes: [
                { time: 0.0, pose: this.createIdlePose() },
                { time: 0.2, pose: this.createPullBackPose() },
                { time: 0.5, pose: this.createPullContactPose() },
                { time: 0.7, pose: this.createPullFinishPose() }
            ]
        });
        
        // Lofted shot
        this.animations.set('lofted_shot', {
            duration: 0.9,
            keyframes: [
                { time: 0.0, pose: this.createIdlePose() },
                { time: 0.3, pose: this.createLoftBackliftPose() },
                { time: 0.6, pose: this.createLoftContactPose() },
                { time: 0.9, pose: this.createLoftFinishPose() }
            ]
        });
        
        // Defensive shot
        this.animations.set('defensive', {
            duration: 0.5,
            keyframes: [
                { time: 0.0, pose: this.createIdlePose() },
                { time: 0.2, pose: this.createDefensivePose() },
                { time: 0.5, pose: this.createIdlePose() }
            ]
        });
        
        // Slog sweep
        this.animations.set('slog_sweep', {
            duration: 0.85,
            keyframes: [
                { time: 0.0, pose: this.createIdlePose() },
                { time: 0.3, pose: this.createSlogBackliftPose() },
                { time: 0.6, pose: this.createSlogContactPose() },
                { time: 0.85, pose: this.createSlogFinishPose() }
            ]
        });
    }
    
    /**
     * Create bowling animations
     */
    createBowlingAnimations() {
        // Fast bowling
        this.animations.set('fast_bowling', {
            duration: 1.2,
            keyframes: [
                { time: 0.0, pose: this.createBowlerStartPose() },
                { time: 0.4, pose: this.createBowlerGatherPose() },
                { time: 0.7, pose: this.createBowlerDeliveryPose() },
                { time: 1.0, pose: this.createBowlerReleasePose() },
                { time: 1.2, pose: this.createBowlerFollowThroughPose() }
            ]
        });
        
        // Spin bowling
        this.animations.set('spin_bowling', {
            duration: 1.0,
            keyframes: [
                { time: 0.0, pose: this.createBowlerStartPose() },
                { time: 0.3, pose: this.createSpinnerGatherPose() },
                { time: 0.6, pose: this.createSpinnerDeliveryPose() },
                { time: 0.8, pose: this.createSpinnerReleasePose() },
                { time: 1.0, pose: this.createSpinnerFinishPose() }
            ]
        });
    }
    
    /**
     * Create fielding animations
     */
    createFieldingAnimations() {
        // Catch
        this.animations.set('catch', {
            duration: 0.8,
            keyframes: [
                { time: 0.0, pose: this.createReadyPose() },
                { time: 0.3, pose: this.createReachPose() },
                { time: 0.6, pose: this.createCatchPose() },
                { time: 0.8, pose: this.createCatchFinishPose() }
            ]
        });
        
        // Throw
        this.animations.set('throw', {
            duration: 0.6,
            keyframes: [
                { time: 0.0, pose: this.createReadyPose() },
                { time: 0.2, pose: this.createThrowBackPose() },
                { time: 0.4, pose: this.createThrowReleasePose() },
                { time: 0.6, pose: this.createThrowFinishPose() }
            ]
        });
        
        // Dive
        this.animations.set('dive', {
            duration: 1.0,
            keyframes: [
                { time: 0.0, pose: this.createReadyPose() },
                { time: 0.3, pose: this.createDiveLaunchPose() },
                { time: 0.6, pose: this.createDiveAirPose() },
                { time: 0.8, pose: this.createDiveLandPose() },
                { time: 1.0, pose: this.createDiveRecoverPose() }
            ]
        });
    }
    
    /**
     * Create celebration animations
     */
    createCelebrationAnimations() {
        // Century celebration
        this.animations.set('century', {
            duration: 2.0,
            keyframes: [
                { time: 0.0, pose: this.createIdlePose() },
                { time: 0.3, pose: this.createBatRaisePose() },
                { time: 0.6, pose: this.createHelmetOffPose() },
                { time: 1.0, pose: this.createArmsUpPose() },
                { time: 1.5, pose: this.createJumpPose() },
                { time: 2.0, pose: this.createBowPose() }
            ]
        });
        
        // Wicket celebration
        this.animations.set('wicket_celebration', {
            duration: 1.5,
            keyframes: [
                { time: 0.0, pose: this.createIdlePose() },
                { time: 0.3, pose: this.createFistPumpPose() },
                { time: 0.6, pose: this.createShoutPose() },
                { time: 0.9, pose: this.createTeamHuddlePose() },
                { time: 1.5, pose: this.createIdlePose() }
            ]
        });
    }
    
    /**
     * Pose creators - Batting
     */
    createIdlePose() {
        return {
            spine: { rotation: new THREE.Euler(0, 0, 0) },
            head: { rotation: new THREE.Euler(0, 0, 0) },
            leftArm: { rotation: new THREE.Euler(0.3, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-0.3, 0, 0) },
            leftLeg: { rotation: new THREE.Euler(0, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0, 0, 0) }
        };
    }
    
    createBackliftPose() {
        return {
            spine: { rotation: new THREE.Euler(-0.1, 0.2, 0) },
            head: { rotation: new THREE.Euler(0, 0.3, 0) },
            leftArm: { rotation: new THREE.Euler(0.5, -0.3, 0.2) },
            rightArm: { rotation: new THREE.Euler(-1.0, 0.5, -0.3) },
            leftLeg: { rotation: new THREE.Euler(0.2, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.1, 0, 0) }
        };
    }
    
    createDrivePose() {
        return {
            spine: { rotation: new THREE.Euler(0.2, 0.4, 0) },
            head: { rotation: new THREE.Euler(-0.1, 0.2, 0) },
            leftArm: { rotation: new THREE.Euler(1.0, -0.5, 0.5) },
            rightArm: { rotation: new THREE.Euler(-1.5, 0.8, -0.3) },
            leftLeg: { rotation: new THREE.Euler(0.5, 0.1, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.2, 0, 0) }
        };
    }
    
    createFollowThroughPose() {
        return {
            spine: { rotation: new THREE.Euler(0.3, 0.6, 0) },
            head: { rotation: new THREE.Euler(-0.2, 0.1, 0) },
            leftArm: { rotation: new THREE.Euler(1.5, -0.8, 0.8) },
            rightArm: { rotation: new THREE.Euler(-2.0, 1.0, -0.2) },
            leftLeg: { rotation: new THREE.Euler(0.3, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.1, 0, 0) }
        };
    }
    
    createPullBackPose() {
        return {
            spine: { rotation: new THREE.Euler(-0.1, -0.3, 0) },
            head: { rotation: new THREE.Euler(0, -0.4, 0) },
            leftArm: { rotation: new THREE.Euler(0.4, 0.2, -0.2) },
            rightArm: { rotation: new THREE.Euler(-0.8, -0.3, 0.3) },
            leftLeg: { rotation: new THREE.Euler(0.1, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.3, 0, 0) }
        };
    }
    
    createPullContactPose() {
        return {
            spine: { rotation: new THREE.Euler(0.1, -0.6, 0) },
            head: { rotation: new THREE.Euler(-0.1, -0.2, 0) },
            leftArm: { rotation: new THREE.Euler(0.8, 0.5, -0.3) },
            rightArm: { rotation: new THREE.Euler(-1.2, -0.5, 0.5) },
            leftLeg: { rotation: new THREE.Euler(0.4, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.5, 0, 0) }
        };
    }
    
    createPullFinishPose() {
        return {
            spine: { rotation: new THREE.Euler(0.2, -0.8, 0) },
            head: { rotation: new THREE.Euler(-0.2, 0, 0) },
            leftArm: { rotation: new THREE.Euler(1.2, 0.8, -0.5) },
            rightArm: { rotation: new THREE.Euler(-1.8, -0.8, 0.8) },
            leftLeg: { rotation: new THREE.Euler(0.2, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.3, 0, 0) }
        };
    }
    
    createLoftBackliftPose() {
        return {
            spine: { rotation: new THREE.Euler(-0.2, 0, 0) },
            head: { rotation: new THREE.Euler(0.1, 0, 0) },
            leftArm: { rotation: new THREE.Euler(0.3, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-1.2, 0, -0.3) },
            leftLeg: { rotation: new THREE.Euler(0.1, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.1, 0, 0) }
        };
    }
    
    createLoftContactPose() {
        return {
            spine: { rotation: new THREE.Euler(0.1, 0.1, 0) },
            head: { rotation: new THREE.Euler(-0.2, 0, 0) },
            leftArm: { rotation: new THREE.Euler(0.8, 0, 0.2) },
            rightArm: { rotation: new THREE.Euler(-2.0, 0.3, -0.2) },
            leftLeg: { rotation: new THREE.Euler(0.4, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.3, 0, 0) }
        };
    }
    
    createLoftFinishPose() {
        return {
            spine: { rotation: new THREE.Euler(0.3, 0.2, 0) },
            head: { rotation: new THREE.Euler(-0.3, -0.1, 0) },
            leftArm: { rotation: new THREE.Euler(1.5, -0.2, 0.5) },
            rightArm: { rotation: new THREE.Euler(-2.5, 0.5, 0) },
            leftLeg: { rotation: new THREE.Euler(0.2, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.1, 0, 0) }
        };
    }
    
    createDefensivePose() {
        return {
            spine: { rotation: new THREE.Euler(0, 0, 0) },
            head: { rotation: new THREE.Euler(-0.1, 0, 0) },
            leftArm: { rotation: new THREE.Euler(0.5, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-0.5, 0, 0) },
            leftLeg: { rotation: new THREE.Euler(0.1, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0, 0, 0) }
        };
    }
    
    createSlogBackliftPose() {
        return {
            spine: { rotation: new THREE.Euler(-0.1, 0, 0) },
            head: { rotation: new THREE.Euler(0, 0, 0) },
            leftArm: { rotation: new THREE.Euler(0.4, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-1.0, 0, -0.5) },
            leftLeg: { rotation: new THREE.Euler(0.2, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.2, 0, 0) }
        };
    }
    
    createSlogContactPose() {
        return {
            spine: { rotation: new THREE.Euler(0.1, -0.3, 0) },
            head: { rotation: new THREE.Euler(-0.2, -0.1, 0) },
            leftArm: { rotation: new THREE.Euler(1.0, -0.2, 0.3) },
            rightArm: { rotation: new THREE.Euler(-2.0, -0.5, -0.3) },
            leftLeg: { rotation: new THREE.Euler(0.5, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.4, 0, 0) }
        };
    }
    
    createSlogFinishPose() {
        return {
            spine: { rotation: new THREE.Euler(0.2, -0.6, 0) },
            head: { rotation: new THREE.Euler(-0.3, 0.1, 0) },
            leftArm: { rotation: new THREE.Euler(1.5, -0.4, 0.5) },
            rightArm: { rotation: new THREE.Euler(-2.5, -0.8, 0) },
            leftLeg: { rotation: new THREE.Euler(0.3, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.2, 0, 0) }
        };
    }
    
    /**
     * Pose creators - Bowling
     */
    createBowlerStartPose() {
        return {
            spine: { rotation: new THREE.Euler(0.1, 0, 0) },
            head: { rotation: new THREE.Euler(0, 0, 0) },
            leftArm: { rotation: new THREE.Euler(0, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-0.5, -0.3, 0) },
            leftLeg: { rotation: new THREE.Euler(-0.3, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0.5, 0, 0) }
        };
    }
    
    createBowlerGatherPose() {
        return {
            spine: { rotation: new THREE.Euler(0.3, 0.2, 0) },
            head: { rotation: new THREE.Euler(-0.1, 0, 0) },
            leftArm: { rotation: new THREE.Euler(1.5, 0.5, 0) },
            rightArm: { rotation: new THREE.Euler(-1.0, -0.8, 0.3) },
            leftLeg: { rotation: new THREE.Euler(-0.8, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(1.0, 0, 0) }
        };
    }
    
    createBowlerDeliveryPose() {
        return {
            spine: { rotation: new THREE.Euler(0.5, 0.3, 0) },
            head: { rotation: new THREE.Euler(-0.2, 0, 0) },
            leftArm: { rotation: new THREE.Euler(2.0, 0.8, -0.2) },
            rightArm: { rotation: new THREE.Euler(-2.5, -1.0, 0.5) },
            leftLeg: { rotation: new THREE.Euler(-1.0, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(1.5, 0, 0) }
        };
    }
    
    createBowlerReleasePose() {
        return {
            spine: { rotation: new THREE.Euler(0.4, 0.2, 0) },
            head: { rotation: new THREE.Euler(-0.3, 0.1, 0) },
            leftArm: { rotation: new THREE.Euler(1.8, 0.5, -0.1) },
            rightArm: { rotation: new THREE.Euler(-3.0, -1.2, 0.3) },
            leftLeg: { rotation: new THREE.Euler(-0.5, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(1.8, 0, 0) }
        };
    }
    
    createBowlerFollowThroughPose() {
        return {
            spine: { rotation: new THREE.Euler(0.2, 0.1, 0) },
            head: { rotation: new THREE.Euler(-0.1, 0, 0) },
            leftArm: { rotation: new THREE.Euler(1.0, 0.3, 0) },
            rightArm: { rotation: new THREE.Euler(-1.5, -0.5, 0.1) },
            leftLeg: { rotation: new THREE.Euler(-0.2, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0.5, 0, 0) }
        };
    }
    
    createSpinnerGatherPose() {
        return {
            spine: { rotation: new THREE.Euler(0.1, 0.3, 0) },
            head: { rotation: new THREE.Euler(0, 0.2, 0) },
            leftArm: { rotation: new THREE.Euler(0.8, -0.2, 0.3) },
            rightArm: { rotation: new THREE.Euler(-0.5, -0.5, -0.2) },
            leftLeg: { rotation: new THREE.Euler(-0.3, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0.5, 0, 0) }
        };
    }
    
    createSpinnerDeliveryPose() {
        return {
            spine: { rotation: new THREE.Euler(0.2, 0.5, 0) },
            head: { rotation: new THREE.Euler(-0.1, 0.3, 0) },
            leftArm: { rotation: new THREE.Euler(1.2, -0.5, 0.5) },
            rightArm: { rotation: new THREE.Euler(-1.0, -1.0, -0.5) },
            leftLeg: { rotation: new THREE.Euler(-0.5, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0.8, 0, 0) }
        };
    }
    
    createSpinnerReleasePose() {
        return {
            spine: { rotation: new THREE.Euler(0.15, 0.4, 0) },
            head: { rotation: new THREE.Euler(-0.15, 0.2, 0) },
            leftArm: { rotation: new THREE.Euler(1.0, -0.3, 0.4) },
            rightArm: { rotation: new THREE.Euler(-1.5, -1.2, -0.3) },
            leftLeg: { rotation: new THREE.Euler(-0.3, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(1.0, 0, 0) }
        };
    }
    
    createSpinnerFinishPose() {
        return {
            spine: { rotation: new THREE.Euler(0.05, 0.2, 0) },
            head: { rotation: new THREE.Euler(-0.05, 0.1, 0) },
            leftArm: { rotation: new THREE.Euler(0.5, -0.1, 0.2) },
            rightArm: { rotation: new THREE.Euler(-0.8, -0.5, -0.1) },
            leftLeg: { rotation: new THREE.Euler(-0.1, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0.3, 0, 0) }
        };
    }
    
    /**
     * Pose creators - Fielding
     */
    createReadyPose() {
        return {
            spine: { rotation: new THREE.Euler(0.2, 0, 0) },
            head: { rotation: new THREE.Euler(0, 0, 0) },
            leftArm: { rotation: new THREE.Euler(0.5, 0.2, 0) },
            rightArm: { rotation: new THREE.Euler(0.5, -0.2, 0) },
            leftLeg: { rotation: new THREE.Euler(0.3, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.1, 0, 0) }
        };
    }
    
    createReachPose() {
        return {
            spine: { rotation: new THREE.Euler(0.3, 0.2, 0) },
            head: { rotation: new THREE.Euler(-0.1, 0.3, 0) },
            leftArm: { rotation: new THREE.Euler(1.5, 0.8, 0) },
            rightArm: { rotation: new THREE.Euler(1.0, -0.5, 0) },
            leftLeg: { rotation: new THREE.Euler(0.5, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.3, 0, 0) }
        };
    }
    
    createCatchPose() {
        return {
            spine: { rotation: new THREE.Euler(0.2, 0.3, 0) },
            head: { rotation: new THREE.Euler(-0.2, 0.4, 0) },
            leftArm: { rotation: new THREE.Euler(2.0, 1.0, -0.2) },
            rightArm: { rotation: new THREE.Euler(2.0, -1.0, 0.2) },
            leftLeg: { rotation: new THREE.Euler(0.3, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.2, 0, 0) }
        };
    }
    
    createCatchFinishPose() {
        return {
            spine: { rotation: new THREE.Euler(0.1, 0.1, 0) },
            head: { rotation: new THREE.Euler(-0.1, 0.1, 0) },
            leftArm: { rotation: new THREE.Euler(1.0, 0.3, 0) },
            rightArm: { rotation: new THREE.Euler(1.0, -0.3, 0) },
            leftLeg: { rotation: new THREE.Euler(0.1, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0, 0, 0) }
        };
    }
    
    createThrowBackPose() {
        return {
            spine: { rotation: new THREE.Euler(0.1, -0.3, 0) },
            head: { rotation: new THREE.Euler(0, -0.2, 0) },
            leftArm: { rotation: new THREE.Euler(0.5, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-1.5, -0.8, -0.5) },
            leftLeg: { rotation: new THREE.Euler(0.2, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.3, 0, 0) }
        };
    }
    
    createThrowReleasePose() {
        return {
            spine: { rotation: new THREE.Euler(0.2, -0.5, 0) },
            head: { rotation: new THREE.Euler(-0.1, -0.3, 0) },
            leftArm: { rotation: new THREE.Euler(1.0, 0.2, 0) },
            rightArm: { rotation: new THREE.Euler(-2.5, -1.2, -0.3) },
            leftLeg: { rotation: new THREE.Euler(0.4, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.5, 0, 0) }
        };
    }
    
    createThrowFinishPose() {
        return {
            spine: { rotation: new THREE.Euler(0.1, -0.2, 0) },
            head: { rotation: new THREE.Euler(0, -0.1, 0) },
            leftArm: { rotation: new THREE.Euler(0.8, 0.1, 0) },
            rightArm: { rotation: new THREE.Euler(-1.0, -0.5, -0.1) },
            leftLeg: { rotation: new THREE.Euler(0.2, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.2, 0, 0) }
        };
    }
    
    createDiveLaunchPose() {
        return {
            spine: { rotation: new THREE.Euler(0.5, 0.2, 0) },
            head: { rotation: new THREE.Euler(-0.2, 0.1, 0) },
            leftArm: { rotation: new THREE.Euler(2.0, 0.5, 0) },
            rightArm: { rotation: new THREE.Euler(2.0, -0.5, 0) },
            leftLeg: { rotation: new THREE.Euler(1.0, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-1.0, 0, 0) }
        };
    }
    
    createDiveAirPose() {
        return {
            spine: { rotation: new THREE.Euler(0.8, 0.1, 0) },
            head: { rotation: new THREE.Euler(-0.3, 0, 0) },
            leftArm: { rotation: new THREE.Euler(2.5, 0.8, -0.2) },
            rightArm: { rotation: new THREE.Euler(2.5, -0.8, 0.2) },
            leftLeg: { rotation: new THREE.Euler(0.8, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.5, 0, 0) }
        };
    }
    
    createDiveLandPose() {
        return {
            spine: { rotation: new THREE.Euler(0.3, 0, 0) },
            head: { rotation: new THREE.Euler(-0.1, 0, 0) },
            leftArm: { rotation: new THREE.Euler(1.5, 0.3, 0) },
            rightArm: { rotation: new THREE.Euler(1.5, -0.3, 0) },
            leftLeg: { rotation: new THREE.Euler(0.2, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0, 0, 0) }
        };
    }
    
    createDiveRecoverPose() {
        return this.createReadyPose();
    }
    
    /**
     * Celebration poses
     */
    createBatRaisePose() {
        return {
            spine: { rotation: new THREE.Euler(-0.1, 0, 0) },
            head: { rotation: new THREE.Euler(0.2, 0, 0) },
            leftArm: { rotation: new THREE.Euler(0.5, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-2.5, 0, 0) },
            leftLeg: { rotation: new THREE.Euler(0, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0, 0, 0) }
        };
    }
    
    createHelmetOffPose() {
        return {
            spine: { rotation: new THREE.Euler(0, 0, 0) },
            head: { rotation: new THREE.Euler(0.1, 0, 0) },
            leftArm: { rotation: new THREE.Euler(1.5, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-1.5, 0.3, 0) },
            leftLeg: { rotation: new THREE.Euler(0, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0, 0, 0) }
        };
    }
    
    createArmsUpPose() {
        return {
            spine: { rotation: new THREE.Euler(-0.1, 0, 0) },
            head: { rotation: new THREE.Euler(0.3, 0, 0) },
            leftArm: { rotation: new THREE.Euler(2.8, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-2.8, 0, 0) },
            leftLeg: { rotation: new THREE.Euler(0, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0, 0, 0) }
        };
    }
    
    createJumpPose() {
        return {
            spine: { rotation: new THREE.Euler(0, 0, 0) },
            head: { rotation: new THREE.Euler(0.2, 0, 0) },
            leftArm: { rotation: new THREE.Euler(2.5, 0.2, 0) },
            rightArm: { rotation: new THREE.Euler(-2.5, -0.2, 0) },
            leftLeg: { rotation: new THREE.Euler(-0.5, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0.5, 0, 0) }
        };
    }
    
    createBowPose() {
        return {
            spine: { rotation: new THREE.Euler(0.8, 0, 0) },
            head: { rotation: new THREE.Euler(-0.5, 0, 0) },
            leftArm: { rotation: new THREE.Euler(1.5, 0, 0) },
            rightArm: { rotation: new THREE.Euler(-1.5, 0, 0) },
            leftLeg: { rotation: new THREE.Euler(0, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0, 0, 0) }
        };
    }
    
    createFistPumpPose() {
        return {
            spine: { rotation: new THREE.Euler(-0.2, 0, 0) },
            head: { rotation: new THREE.Euler(0.2, 0, 0) },
            leftArm: { rotation: new THREE.Euler(1.0, -0.2, 0) },
            rightArm: { rotation: new THREE.Euler(-2.5, 0.3, 0) },
            leftLeg: { rotation: new THREE.Euler(0, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.2, 0, 0) }
        };
    }
    
    createShoutPose() {
        return {
            spine: { rotation: new THREE.Euler(-0.1, 0, 0) },
            head: { rotation: new THREE.Euler(0.4, 0, 0) },
            leftArm: { rotation: new THREE.Euler(1.5, -0.5, 0) },
            rightArm: { rotation: new THREE.Euler(-1.5, 0.5, 0) },
            leftLeg: { rotation: new THREE.Euler(0.2, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(-0.2, 0, 0) }
        };
    }
    
    createTeamHuddlePose() {
        return {
            spine: { rotation: new THREE.Euler(0.1, 0, 0) },
            head: { rotation: new THREE.Euler(0, 0, 0) },
            leftArm: { rotation: new THREE.Euler(0.8, -0.3, 0) },
            rightArm: { rotation: new THREE.Euler(-0.8, 0.3, 0) },
            leftLeg: { rotation: new THREE.Euler(0, 0, 0) },
            rightLeg: { rotation: new THREE.Euler(0, 0, 0) }
        };
    }
    
    /**
     * Play animation on a player model
     */
    playAnimation(playerModel, animationName, options = {}) {
        const animation = this.animations.get(animationName);
        if (!animation) {
            console.warn(`Animation not found: ${animationName}`);
            return;
        }
        
        const animInstance = {
            animation: animation,
            startTime: performance.now(),
            speed: options.speed || 1.0,
            loop: options.loop || false,
            onComplete: options.onComplete || null
        };
        
        this.activeAnimations.set(playerModel.id, animInstance);
    }
    
    /**
     * Update animations
     */
    update(deltaTime) {
        const now = performance.now();
        
        this.activeAnimations.forEach((animInstance, playerId) => {
            const elapsed = (now - animInstance.startTime) * animInstance.speed / 1000;
            const animation = animInstance.animation;
            
            // Calculate current time in animation
            let currentTime = elapsed;
            
            if (animInstance.loop) {
                currentTime = elapsed % animation.duration;
            } else if (elapsed > animation.duration) {
                // Animation complete
                this.activeAnimations.delete(playerId);
                
                if (animInstance.onComplete) {
                    animInstance.onComplete();
                }
                return;
            }
            
            // Find current keyframes
            const keyframes = animation.keyframes;
            let fromKey = keyframes[0];
            let toKey = keyframes[keyframes.length - 1];
            
            for (let i = 0; i < keyframes.length - 1; i++) {
                if (currentTime >= keyframes[i].time && currentTime <= keyframes[i + 1].time) {
                    fromKey = keyframes[i];
                    toKey = keyframes[i + 1];
                    break;
                }
            }
            
            // Calculate interpolation factor
            const duration = toKey.time - fromKey.time;
            const t = duration > 0 ? (currentTime - fromKey.time) / duration : 0;
            
            // Interpolate pose
            const interpolatedPose = this.interpolatePose(fromKey.pose, toKey.pose, t);
            
            // Apply pose to player model
            this.applyPose(playerId, interpolatedPose);
        });
    }
    
    /**
     * Interpolate between two poses
     */
    interpolatePose(fromPose, toPose, t) {
        const result = {};
        
        for (const bone in fromPose) {
            if (toPose[bone]) {
                result[bone] = {
                    rotation: new THREE.Euler(
                        THREE.MathUtils.lerp(fromPose[bone].rotation.x, toPose[bone].rotation.x, t),
                        THREE.MathUtils.lerp(fromPose[bone].rotation.y, toPose[bone].rotation.y, t),
                        THREE.MathUtils.lerp(fromPose[bone].rotation.z, toPose[bone].rotation.z, t)
                    )
                };
            }
        }
        
        return result;
    }
    
    /**
     * Apply pose to player model
     */
    applyPose(playerId, pose) {
        // This would be connected to the actual 3D model bones
        // For now, emit an event that the player manager can handle
        const event = new CustomEvent('animation-update', {
            detail: { playerId, pose }
        });
        window.dispatchEvent(event);
    }
    
    /**
     * Stop animation for a player
     */
    stopAnimation(playerId) {
        this.activeAnimations.delete(playerId);
    }
    
    /**
     * Stop all animations
     */
    stopAllAnimations() {
        this.activeAnimations.clear();
    }
}