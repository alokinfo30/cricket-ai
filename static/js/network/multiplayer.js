/**
 * Multiplayer Manager
 * Handles WebSocket connections and real-time game sync
 */

export class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.isConnected = false;
        this.isHost = false;
        this.gameId = null;
        this.playerId = null;
        this.players = new Map();
        
        // Connection settings
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.pingInterval = null;
        this.lastPing = 0;
        this.latency = 0;
        
        // State sync
        this.syncInterval = null;
        this.syncRate = 30; // Hz
        this.sequenceNumber = 0;
        this.pendingActions = [];
        
        // Event handlers
        this.eventHandlers = new Map();
    }
    
    /**
     * Connect to game server
     */
    async connect(gameId, playerId) {
        this.gameId = gameId;
        this.playerId = playerId;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${gameId}/${playerId}`;
        
        try {
            await this.establishConnection(wsUrl);
            this.setupEventHandlers();
            this.startPing();
            this.startSync();
            
            console.log('🔗 Connected to multiplayer game');
        } catch (error) {
            console.error('Failed to connect:', error);
            this.handleConnectionError();
        }
    }
    
    /**
     * Establish WebSocket connection
     */
    async establishConnection(url) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);
            
            this.ws.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                // Send join message
                this.send({
                    type: 'join',
                    playerId: this.playerId,
                    gameId: this.gameId
                });
                
                resolve();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
            
            this.ws.onclose = (event) => {
                this.isConnected = false;
                this.handleDisconnect(event);
            };
            
            // Connection timeout
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        };
        
        // Register game event handlers
        this.registerHandler('player_joined', (data) => this.onPlayerJoined(data));
        this.registerHandler('player_left', (data) => this.onPlayerLeft(data));
        this.registerHandler('game_state', (data) => this.onGameState(data));
        this.registerHandler('ball_update', (data) => this.onBallUpdate(data));
        this.registerHandler('score_update', (data) => this.onScoreUpdate(data));
        this.registerHandler('chat', (data) => this.onChatMessage(data));
        this.registerHandler('sync', (data) => this.onSync(data));
        this.registerHandler('ping', () => this.onPing());
    }
    
    /**
     * Handle incoming message
     */
    handleMessage(message) {
        const handler = this.eventHandlers.get(message.type);
        if (handler) {
            handler(message.data);
        }
    }
    
    /**
     * Register message handler
     */
    registerHandler(type, handler) {
        this.eventHandlers.set(type, handler);
    }
    
    /**
     * Send message to server
     */
    send(data) {
        if (!this.isConnected || !this.ws) return;
        
        data.sequence = ++this.sequenceNumber;
        data.timestamp = Date.now();
        
        try {
            this.ws.send(JSON.stringify(data));
        } catch (error) {
            console.error('Failed to send message:', error);
            this.pendingActions.push(data);
        }
    }
    
    /**
     * Send game action
     */
    sendAction(action) {
        this.send({
            type: 'action',
            playerId: this.playerId,
            action: action
        });
    }
    
    /**
     * Send chat message
     */
    sendChat(message) {
        this.send({
            type: 'chat',
            playerId: this.playerId,
            message: message
        });
    }
    
    /**
     * Start ping measurement
     */
    startPing() {
        this.pingInterval = setInterval(() => {
            this.lastPing = Date.now();
            this.send({ type: 'ping' });
        }, 1000);
    }
    
    /**
     * Handle ping response
     */
    onPing() {
        this.latency = Date.now() - this.lastPing;
        
        // Update HUD
        if (this.game.hud) {
            this.game.hud.updatePing(this.latency);
        }
    }
    
    /**
     * Start state synchronization
     */
    startSync() {
        this.syncInterval = setInterval(() => {
            if (this.isHost) {
                this.syncGameState();
            }
        }, 1000 / this.syncRate);
    }
    
    /**
     * Sync game state to other players
     */
    syncGameState() {
        const state = {
            ball: this.game.ball?.getState(),
            score: this.getScoreState(),
            players: this.getPlayersState()
        };
        
        this.send({
            type: 'sync',
            state: state
        });
    }
    
    /**
     * Get current score state
     */
    getScoreState() {
        return {
            team1: {
                runs: parseInt(document.getElementById('team1-runs')?.textContent || '0'),
                wickets: parseInt(document.getElementById('team1-wickets')?.textContent?.replace('/', '') || '0')
            },
            team2: {
                runs: parseInt(document.getElementById('team2-runs')?.textContent || '0'),
                wickets: parseInt(document.getElementById('team2-wickets')?.textContent?.replace('/', '') || '0')
            }
        };
    }
    
    /**
     * Get players state
     */
    getPlayersState() {
        const state = {};
        this.players.forEach((player, id) => {
            state[id] = {
                position: player.position,
                animation: player.currentAnimation
            };
        });
        return state;
    }
    
    /**
     * Handle player joined
     */
    onPlayerJoined(data) {
        this.players.set(data.playerId, {
            id: data.playerId,
            name: data.name,
            position: data.position,
            currentAnimation: 'idle'
        });
        
        if (this.game.hud) {
            this.game.hud.addCommentary(`${data.name} has joined the game!`, 'system');
        }
        
        console.log(`Player joined: ${data.name}`);
    }
    
    /**
     * Handle player left
     */
    onPlayerLeft(data) {
        this.players.delete(data.playerId);
        
        if (this.game.hud) {
            this.game.hud.addCommentary(`${data.name} has left the game.`, 'system');
        }
    }
    
    /**
     * Handle game state update
     */
    onGameState(data) {
        // Update game state
        if (this.game.gameService) {
            this.game.gameService.setState(data);
        }
        
        // Update HUD
        if (this.game.hud) {
            this.game.hud.updateScore(data.score);
            this.game.hud.updateMatchInfo(data.matchInfo);
        }
    }
    
    /**
     * Handle ball update
     */
    onBallUpdate(data) {
        // Update ball physics
        if (this.game.ball) {
            this.game.ball.setState(data.ballState);
        }
        
        // Show result
        if (this.game.hud && data.result) {
            this.game.hud.showBallResult(data.result.text, data.result.emoji);
            this.game.h