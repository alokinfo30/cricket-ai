// Global state
let playerId = null;
let gameId = null;
let teamId = null;
let playerName = null;
let ws = null;

// Generate unique player ID
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Join matchmaking
async function joinGame() {
    playerName = document.getElementById('player-name').value.trim();
    const role = document.getElementById('role-select').value;
    
    if (!playerName) {
        alert('Please enter your name');
        return;
    }
    
    playerId = generatePlayerId();
    document.getElementById('matchmaking-status').innerHTML = 
        '<div class="spinner"></div> Searching for opponents...';
    
    try {
        const response = await fetch('/matchmaking/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_name: playerName,
                preferred_role: role,
                session_id: playerId
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'matched' || data.status === 'joined') {
            gameId = data.game_id;
            teamId = data.team_id;
            connectToGame();
        } else if (data.status === 'waiting') {
            document.getElementById('matchmaking-status').innerHTML = 
                `<p>${data.message}</p><div class="spinner"></div>`;
            
            // Poll for match
            setTimeout(() => checkMatchStatus(), 3000);
        }
    } catch (error) {
        document.getElementById('matchmaking-status').innerHTML = 
            '<p class="error">Failed to find match. Please try again.</p>';
        console.error('Matchmaking error:', error);
    }
}

// Check matchmaking status
async function checkMatchStatus() {
    // In real implementation, this would use WebSocket
    // For now, we retry joining
    await joinGame();
}

// Connect to game via WebSocket
function connectToGame() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${gameId}/${playerId}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to game');
        showScreen('game-screen');
        loadGameState();
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleGameMessage(message);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('Disconnected from game');
        showScreen('login-screen');
    };
}

// Handle incoming game messages
function handleGameMessage(message) {
    switch (message.type) {
        case 'ball_update':
            updateScoreboard(message.game_state);
            addCommentary(message.event.commentary);
            break;
        case 'over_summary':
            addCommentary(`--- Over ${message.over_number}: ${message.runs} runs, ${message.wickets} wickets ---`);
            break;
        case 'tactical_update':
            document.getElementById('captain-message').innerHTML = 
                `<strong>Captain:</strong> ${message.decision.message_to_user}`;
            break;
        case 'chat':
            addChatMessage(message.sender_id, message.message);
            break;
        case 'game_state':
            updateFullGameState(message.state);
            break;
        case 'player_joined':
        case 'player_left':
            updatePlayerCount();
            break;
    }
}

// Update scoreboard display
function updateScoreboard(gameState) {
    if (!gameState) return;
    
    document.getElementById('team1-name').textContent = gameState.team1?.name || 'Team 1';
    document.getElementById('team2-name').textContent = gameState.team2?.name || 'Team 2';
    
    const innings1 = gameState.innings1_score || { runs: 0, wickets: 0, overs: 0 };
    const innings2 = gameState.innings2_score || { runs: 0, wickets: 0, overs: 0 };
    
    document.getElementById('team1-runs').textContent = `${innings1.runs}/${innings1.wickets}`;
    document.getElementById('team1-overs').textContent = `${innings1.overs} overs`;
    
    document.getElementById('team2-runs').textContent = `${innings2.runs}/${innings2.wickets}`;
    document.getElementById('team2-overs').textContent = `${innings2.overs} overs`;
    
    if (gameState.target) {
        document.getElementById('target-info').textContent = 
            `Target: ${gameState.target}`;
    }
}

// Add commentary message
function addCommentary(text) {
    const log = document.getElementById('commentary-log');
    const entry = document.createElement('p');
    entry.textContent = text;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// Add chat message
function addChatMessage(senderId, message) {
    const messages = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-message';
    msg.textContent = `${senderId}: ${message}`;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

// Send command to AI captain
function sendCommand() {
    const command = document.getElementById('command-input').value.trim();
    if (!command || !ws) return;
    
    ws.send(JSON.stringify({
        type: 'command',
        command: command
    }));
    
    document.getElementById('command-input').value = '';
}

// Simulate an over
function simulateOver() {
    if (!ws) return;
    
    ws.send(JSON.stringify({
        type: 'simulate_over'
    }));
}

// Send chat message
function sendChat() {
    const message = document.getElementById('chat-input').value.trim();
    if (!message || !ws) return;
    
    ws.send(JSON.stringify({
        type: 'chat',
        message: message
    }));
    
    document.getElementById('chat-input').value = '';
}

// Load full game state
async function loadGameState() {
    try {
        const response = await fetch(`/game/${gameId}/state`);
        const data = await response.json();
        updateFullGameState(data.game_state);
    } catch (error) {
        console.error('Error loading game state:', error);
    }
}

// Update full game state
function updateFullGameState(gameState) {
    updateScoreboard(gameState);
    
    // Update player lists
    updatePlayerList(gameState.team1?.players || [], 'team1-players');
    updatePlayerList(gameState.team2?.players || [], 'team2-players');
    
    if (gameState.status === 'finished') {
        showResult(gameState);
    }
}

// Update player list display
function updatePlayerList(players, containerId) {
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.querySelector('.game-info')?.appendChild(container);
    }
    
    container.innerHTML = players.map(p => 
        `<div class="player ${p.type}">
            ${p.name} (${p.role})
            ${p.type === 'ai' ? '🤖' : '👤'}
        </div>`
    ).join('');
}

// Show match result
function showResult(gameState) {
    document.getElementById('result-text').textContent = 
        gameState.result === 'team1_win' ? 
        `${gameState.team1.name} Wins!` :
        `${gameState.team2.name} Wins!`;
    
    showScreen('result-screen');
}

// Screen navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Ready up
function readyUp() {
    if (!ws) return;
    ws.send(JSON.stringify({ type: 'ready' }));
}

// Play again
function playAgain() {
    ws?.close();
    gameId = null;
    playerId = null;
    showScreen('login-screen');
}

// Update player count
function updatePlayerCount() {
    // Update connected player count display
}