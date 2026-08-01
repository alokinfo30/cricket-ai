/**
 * Heads-Up Display (HUD)
 * Complete game interface overlay
 */

export class HUD {
    constructor() {
        this.elements = {};
        this.animations = [];
        this.isVisible = true;
    }
    
    /**
     * Initialize HUD
     */
    initialize() {
        this.cacheElements();
        this.setupEventListeners();
        this.initializeScoreboard();
        this.initializePlayerCards();
        this.initializeCommentary();
        console.log('📺 HUD initialized');
    }
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Score overlay
            team1Name: document.getElementById('team1-name'),
            team1Runs: document.getElementById('team1-runs'),
            team1Wickets: document.getElementById('team1-wickets'),
            team1Overs: document.getElementById('team1-overs'),
            team2Name: document.getElementById('team2-name'),
            team2Runs: document.getElementById('team2-runs'),
            team2Wickets: document.getElementById('team2-wickets'),
            team2Overs: document.getElementById('team2-overs'),
            
            // Match info
            targetDisplay: document.getElementById('target-display'),
            requiredRate: document.getElementById('required-rate'),
            currentRate: document.getElementById('current-rate'),
            partnership: document.getElementById('partnership'),
            lastBallResult: document.getElementById('last-ball-result'),
            
            // Player cards
            batsmanName: document.getElementById('batsman-name'),
            batsmanRuns: document.getElementById('batsman-runs'),
            batsmanBalls: document.getElementById('batsman-balls'),
            batsmanSR: document.getElementById('batsman-sr'),
            bowlerName: document.getElementById('bowler-name'),
            bowlerOvers: document.getElementById('bowler-overs'),
            bowlerMaidens: document.getElementById('bowler-maidens'),
            bowlerRuns: document.getElementById('bowler-runs'),
            bowlerWickets: document.getElementById('bowler-wickets'),
            bowlerEcon: document.getElementById('bowler-econ'),
            
            // Commentary
            commentaryLog: document.getElementById('commentary-log'),
            
            // Chat
            chatMessages: document.getElementById('chat-messages'),
            chatInput: document.getElementById('chat-input'),
            
            // Ball result
            ballResult: document.getElementById('ball-result'),
            resultAnimation: document.getElementById('result-animation'),
            resultText: document.getElementById('result-text'),
            
            // Captain
            captainMessage: document.getElementById('captain-message'),
            
            // Speed display
            speedDisplay: document.getElementById('speed-display'),
            deliverySpeed: document.getElementById('delivery-speed'),
            
            // Performance
            fpsCounter: document.getElementById('fps-counter'),
            pingCounter: document.getElementById('ping-counter'),
            
            // Stats
            statRR: document.getElementById('stat-rr'),
            statBoundaries: document.getElementById('stat-boundaries'),
            statLastWicket: document.getElementById('stat-last-wicket')
        };
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Chat
        const sendChatBtn = document.getElementById('send-chat');
        if (sendChatBtn) {
            sendChatBtn.addEventListener('click', () => this.sendChat());
        }
        
        if (this.elements.chatInput) {
            this.elements.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChat();
            });
        }
        
        // Window resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    /**
     * Initialize scoreboard
     */
    initializeScoreboard() {
        this.updateScore({
            team1: { name: 'IND', runs: 0, wickets: 0, overs: '0.0' },
            team2: { name: 'AUS', runs: 0, wickets: 0, overs: '0.0' }
        });
    }
    
    /**
     * Initialize player cards
     */
    initializePlayerCards() {
        this.updateBatsman({
            name: 'Waiting...',
            runs: 0,
            balls: 0,
            strikeRate: 0
        });
        
        this.updateBowler({
            name: 'Waiting...',
            overs: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            economy: 0
        });
    }
    
    /**
     * Initialize commentary
     */
    initializeCommentary() {
        this.addCommentary('Welcome to the stadium! The match is about to begin...', 'system');
    }
    
    /**
     * Update full score display
     */
    updateScore(data) {
        if (data.team1) {
            this.elements.team1Name.textContent = data.team1.name;
            this.elements.team1Runs.textContent = data.team1.runs;
            this.elements.team1Wickets.textContent = `/${data.team1.wickets}`;
            this.elements.team1Overs.textContent = `${data.team1.overs} ov`;
        }
        
        if (data.team2) {
            this.elements.team2Name.textContent = data.team2.name;
            this.elements.team2Runs.textContent = data.team2.runs;
            this.elements.team2Wickets.textContent = `/${data.team2.wickets}`;
            this.elements.team2Overs.textContent = `${data.team2.overs} ov`;
        }
        
        if (data.target) {
            this.elements.targetDisplay.textContent = `Target: ${data.target}`;
            this.elements.targetDisplay.style.display = 'block';
        }
    }
    
    /**
     * Update match info
     */
    updateMatchInfo(data) {
        if (data.requiredRate !== undefined) {
            this.elements.requiredRate.textContent = `RRR: ${data.requiredRate.toFixed(1)}`;
        }
        
        if (data.currentRate !== undefined) {
            this.elements.currentRate.textContent = `CRR: ${data.currentRate.toFixed(1)}`;
        }
        
        if (data.partnership) {
            this.elements.partnership.textContent = 
                `P'ship: ${data.partnership.runs} (${data.partnership.balls})`;
        }
        
        if (data.lastBall) {
            this.showLastBall(data.lastBall);
        }
    }
    
    /**
     * Update batsman info
     */
    updateBatsman(data) {
        if (!data) return;
        
        this.elements.batsmanName.textContent = data.name || '---';
        this.elements.batsmanRuns.textContent = data.runs || 0;
        this.elements.batsmanBalls.textContent = data.balls || 0;
        this.elements.batsmanSR.textContent = `SR: ${data.strikeRate || 0}`;
        
        // Animate update
        this.pulseElement('batsman-card');
    }
    
    /**
     * Update bowler info
     */
    updateBowler(data) {
        if (!data) return;
        
        this.elements.bowlerName.textContent = data.name || '---';
        this.elements.bowlerOvers.textContent = data.overs || 0;
        this.elements.bowlerMaidens.textContent = data.maidens || 0;
        this.elements.bowlerRuns.textContent = data.runs || 0;
        this.elements.bowlerWickets.textContent = data.wickets || 0;
        this.elements.bowlerEcon.textContent = `Eco: ${data.economy || 0}`;
        
        this.pulseElement('bowler-card');
    }
    
    /**
     * Add commentary message
     */
    addCommentary(text, type = 'normal') {
        const log = this.elements.commentaryLog;
        if (!log) return;
        
        const entry = document.createElement('p');
        entry.className = `commentary-entry commentary-${type}`;
        entry.textContent = text;
        
        // Add timestamp
        const time = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        entry.setAttribute('data-time', time);
        
        // Insert at top
        log.insertBefore(entry, log.firstChild);
        
        // Animate entry
        entry.style.animation = 'slideIn 0.3s ease';
        
        // Remove old entries
        while (log.children.length > 50) {
            log.removeChild(log.lastChild);
        }
    }
    
    /**
     * Add chat message
     */
    addChatMessage(sender, message) {
        const container = this.elements.chatMessages;
        if (!container) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message';
        msgDiv.innerHTML = `
            <span class="chat-sender">${sender}:</span>
            <span class="chat-text">${message}</span>
        `;
        
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    /**
     * Send chat message
     */
    sendChat() {
        const input = this.elements.chatInput;
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        // Emit event for network handler
        const event = new CustomEvent('chat-send', {
            detail: { message }
        });
        window.dispatchEvent(event);
        
        input.value = '';
    }
    
    /**
     * Show ball result
     */
    showBallResult(text, emoji, duration = 2000) {
        const resultDiv = this.elements.ballResult;
        const animDiv = this.elements.resultAnimation;
        const textDiv = this.elements.resultText;
        
        if (!resultDiv || !animDiv || !textDiv) return;
        
        animDiv.textContent = emoji || '⚪';
        textDiv.textContent = text || '';
        
        resultDiv.classList.remove('hidden');
        resultDiv.style.animation = 'none';
        resultDiv.offsetHeight; // Trigger reflow
        resultDiv.style.animation = 'resultPop 0.5s ease';
        
        setTimeout(() => {
            resultDiv.classList.add('hidden');
        }, duration);
    }
    
    /**
     * Show last ball info
     */
    showLastBall(ballData) {
        const element = this.elements.lastBallResult;
        if (!element) return;
        
        let text = '';
        let className = '';
        
        if (ballData.wicket) {
            text = 'WICKET!';
            className = 'ball-wicket';
        } else if (ballData.runs === 6) {
            text = 'SIX!';
            className = 'ball-six';
        } else if (ballData.runs === 4) {
            text = 'FOUR!';
            className = 'ball-four';
        } else if (ballData.runs === 0) {
            text = 'Dot ball';
            className = 'ball-dot';
        } else if (ballData.extras) {
            text = `${ballData.extras} extra(s)`;
            className = 'ball-extra';
        } else {
            text = `${ballData.runs} run(s)`;
            className = 'ball-run';
        }
        
        element.textContent = text;
        element.className = `last-ball ${className}`;
        
        // Clear after delay
        setTimeout(() => {
            element.textContent = '';
            element.className = 'last-ball';
        }, 3000);
    }
    
    /**
     * Show delivery speed
     */
    showDeliverySpeed(speed) {
        const display = this.elements.speedDisplay;
        const speedEl = this.elements.deliverySpeed;
        
        if (!display || !speedEl) return;
        
        speedEl.textContent = Math.round(speed);
        display.classList.remove('hidden');
        display.style.animation = 'none';
        display.offsetHeight;
        display.style.animation = 'fadeInUp 0.3s ease';
        
        setTimeout(() => {
            display.classList.add('hidden');
        }, 2000);
    }
    
    /**
     * Update captain message
     */
    updateCaptainMessage(message) {
        const element = this.elements.captainMessage;
        if (!element) return;
        
        element.textContent = message;
        element.style.animation = 'none';
        element.offsetHeight;
        element.style.animation = 'fadeIn 0.5s ease';
    }
    
    /**
     * Update FPS counter
     */
    updateFPS(fps) {
        const counter = this.elements.fpsCounter;
        if (!counter) return;
        
        counter.textContent = `${Math.round(fps)} FPS`;
        
        // Color code based on performance
        if (fps >= 55) {
            counter.style.color = '#4caf50';
        } else if (fps >= 30) {
            counter.style.color = '#ff9800';
        } else {
            counter.style.color = '#f44336';
        }
    }
    
    /**
     * Update ping counter
     */
    updatePing(ping) {
        const counter = this.elements.pingCounter;
        if (!counter) return;
        
        counter.textContent = `${Math.round(ping)} ms`;
    }
    
    /**
     * Update quick stats
     */
    updateQuickStats(stats) {
        if (stats.runRate !== undefined) {
            this.elements.statRR.textContent = stats.runRate.toFixed(1);
        }
        if (stats.boundaries !== undefined) {
            this.elements.statBoundaries.textContent = stats.boundaries;
        }
        if (stats.lastWicket) {
            this.elements.statLastWicket.textContent = stats.lastWicket;
        }
    }
    
    /**
     * Show game event notification
     */
    showNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <strong>${title}</strong>
            <p>${message}</p>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    /**
     * Pulse element animation
     */
    pulseElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.style.animation = 'none';
        element.offsetHeight;
        element.style.animation = 'pulse 0.3s ease';
    }
    
    /**
     * Toggle HUD visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        const opacity = this.isVisible ? '1' : '0';
        
        document.querySelectorAll('#score-overlay, #player-info-cards, #side-panel')
            .forEach(el => {
                el.style.opacity = opacity;
                el.style.transition = 'opacity 0.3s ease';
            });
    }
    
    /**
     * Handle window resize
     */
    onResize() {
        // Adjust HUD elements for responsive layout
        const width = window.innerWidth;
        
        if (width < 768) {
            document.body.classList.add('mobile-layout');
        } else {
            document.body.classList.remove('mobile-layout');
        }
    }
    
    /**
     * Show win/loss screen
     */
    showMatchResult(result) {
        const overlay = document.createElement('div');
        overlay.className = 'match-result-overlay';
        overlay.innerHTML = `
            <div class="result-content">
                <h1 class="result-title">${result.winner} Wins!</h1>
                <p class="result-subtitle">${result.description}</p>
                <div class="result-scores">
                    <div class="result-team">
                        <h3>${result.team1.name}</h3>
                        <p>${result.team1.runs}/${result.team1.wickets}</p>
                        <p>${result.team1.overs} overs</p>
                    </div>
                    <div class="result-vs">VS</div>
                    <div class="result-team">
                        <h3>${result.team2.name}</h3>
                        <p>${result.team2.runs}/${result.team2.wickets}</p>
                        <p>${result.team2.overs} overs</p>
                    </div>
                </div>
                <button class="play-again-btn" onclick="location.reload()">
                    Play Again
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.classList.add('show'), 100);
    }
    
    /**
     * Update method called each frame
     */
    update(deltaTime) {
        // Update any ongoing animations
        this.animations = this.animations.filter(anim => {
            anim.progress += deltaTime / anim.duration;
            if (anim.progress >= 1) {
                anim.onComplete?.();
                return false;
            }
            anim.onUpdate?.(anim.progress);
            return true;
        });
    }
}