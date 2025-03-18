// Game Configuration
const config = {
    boardSize: 10,
    startingHealth: 20,
    damageRange: [1, 4],
    enemyDamageRange: [1, 3],
    potionHealRange: [3, 6],
    goldRange: [1, 5],
    maxEnemies: 8,
    maxItems: 5,
    maxPotions: 3
};

// Game State
const gameState = {
    player: {
        x: 1,
        y: 1,
        health: config.startingHealth,
        maxHealth: config.startingHealth,
        level: 1,
        gold: 0
    },
    dungeon: [],
    entities: [],
    gameOver: false
};

// DOM Elements
const gameBoard = document.getElementById('game-board');
const healthValue = document.getElementById('health-value');
const levelValue = document.getElementById('level-value');
const goldValue = document.getElementById('gold-value');
const gameMessage = document.getElementById('game-message');
const newGameButton = document.getElementById('new-game-button');
const attackButton = document.getElementById('attack-button');
const moveButtons = {
    up: document.getElementById('move-up'),
    right: document.getElementById('move-right'),
    down: document.getElementById('move-down'),
    left: document.getElementById('move-left')
};

// Entity Types
const ENTITY_TYPES = {
    WALL: 'wall',
    FLOOR: 'floor',
    EXIT: 'exit',
    PLAYER: 'player',
    MONSTER: 'monster',
    GOLD: 'gold',
    POTION: 'health-potion'
};

// Directions
const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    RIGHT: { x: 1, y: 0 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 }
};

// Asset paths - these would be images in your GitHub repository
const ASSETS = {
    [ENTITY_TYPES.PLAYER]: 'assets/player.png',
    [ENTITY_TYPES.MONSTER]: 'assets/monster.png',
    [ENTITY_TYPES.GOLD]: 'assets/gold.png',
    [ENTITY_TYPES.POTION]: 'assets/potion.png',
    [ENTITY_TYPES.EXIT]: 'assets/exit.png',
    [ENTITY_TYPES.WALL]: 'assets/wall.png',
    [ENTITY_TYPES.FLOOR]: 'assets/floor.png',
};

// Initialize Game
function initGame() {
    // Reset game state
    gameState.player.health = config.startingHealth;
    gameState.player.maxHealth = config.startingHealth;
    gameState.player.gold = 0;
    gameState.player.level = 1;
    gameState.gameOver = false;
    
    // Generate dungeon
    generateDungeon();
    
    // Update UI
    updateStats();
    renderGameBoard();
    displayMessage('Welcome to the dungeon! Use arrow keys to move.');
}

// Generate a random dungeon layout
function generateDungeon() {
    // Create empty dungeon
    gameState.dungeon = Array(config.boardSize).fill().map(() => 
        Array(config.boardSize).fill(ENTITY_TYPES.WALL)
    );
    
    // Clear entities
    gameState.entities = [];
    
    // Create rooms and corridors using a simple maze algorithm
    generateMaze(1, 1);
    
    // Place player
    gameState.player.x = 1;
    gameState.player.y = 1;
    gameState.dungeon[1][1] = ENTITY_TYPES.FLOOR;
    
    // Place exit at a far corner
    const exitX = config.boardSize - 2;
    const exitY = config.boardSize - 2;
    gameState.dungeon[exitY][exitX] = ENTITY_TYPES.EXIT;
    
    // Place enemies
    placeEntities(ENTITY_TYPES.MONSTER, config.maxEnemies);
    
    // Place gold
    placeEntities(ENTITY_TYPES.GOLD, config.maxItems);
    
    // Place potions
    placeEntities(ENTITY_TYPES.POTION, config.maxPotions);
}

// Generate a simple maze using recursive backtracking
function generateMaze(x, y) {
    // Mark current cell as floor
    gameState.dungeon[y][x] = ENTITY_TYPES.FLOOR;
    
    // Define the directions to try (randomized)
    const directions = Object.values(DIRECTIONS);
    shuffleArray(directions);
    
    // Try each direction
    for (const dir of directions) {
        // Calculate the coordinates of the cell 2 steps away
        const newX = x + dir.x * 2;
        const newY = y + dir.y * 2;
        
        // Check if the new position is valid
        if (isValidPosition(newX, newY) && gameState.dungeon[newY][newX] === ENTITY_TYPES.WALL) {
            // Mark the cell between as floor (creating a passage)
            gameState.dungeon[y + dir.y][x + dir.x] = ENTITY_TYPES.FLOOR;
            
            // Recursively continue the maze from the new position
            generateMaze(newX, newY);
        }
    }
}

// Place entities randomly in valid positions
function placeEntities(entityType, count) {
    let placed = 0;
    
    while (placed < count && placed < 100) { // Prevent infinite loop
        const x = Math.floor(Math.random() * (config.boardSize - 2)) + 1;
        const y = Math.floor(Math.random() * (config.boardSize - 2)) + 1;
        
        // Check if the position is a valid floor and not occupied
        if (gameState.dungeon[y][x] === ENTITY_TYPES.FLOOR && 
            !isEntityAt(x, y) && 
            (Math.abs(x - gameState.player.x) > 2 || Math.abs(y - gameState.player.y) > 2)) {
            
            // Add the entity
            gameState.entities.push({
                type: entityType,
                x: x,
                y: y,
                health: entityType === ENTITY_TYPES.MONSTER ? 
                    Math.floor(Math.random() * 3) + 3 : null
            });
            
            placed++;
        }
    }
}

// Check if position is within the dungeon bounds
function isValidPosition(x, y) {
    return x >= 0 && x < config.boardSize && y >= 0 && y < config.boardSize;
}

// Check if an entity exists at a specific position
function isEntityAt(x, y) {
    return gameState.entities.some(entity => entity.x === x && entity.y === y);
}

// Get entity at a specific position
function getEntityAt(x, y) {
    return gameState.entities.find(entity => entity.x === x && entity.y === y);
}

// Move the player in a direction
function movePlayer(direction) {
    // Check if game is over
    if (gameState.gameOver) return;
    
    // Calculate new position
    const newX = gameState.player.x + direction.x;
    const newY = gameState.player.y + direction.y;
    
    // Check if the new position is valid
    if (!isValidPosition(newX, newY)) return;
    
    // Check what's in the new position
    const cellType = gameState.dungeon[newY][newX];
    
    // Handle different cell types
    if (cellType === ENTITY_TYPES.WALL) {
        // Can't move into walls
        return;
    } else if (cellType === ENTITY_TYPES.EXIT) {
        // Player reached the exit - go to next level
        nextLevel();
        return;
    }
    
    // Check for entities
    const entity = getEntityAt(newX, newY);
    
    if (entity) {
        handleEntityInteraction(entity);
        return;
    }
    
    // Move player
    gameState.player.x = newX;
    gameState.player.y = newY;
    
    // Render the updated board
    renderGameBoard();
    
    // Process enemy turns
    processEnemyTurns();
}

// Handle player interaction with entities
function handleEntityInteraction(entity) {
    switch (entity.type) {
        case ENTITY_TYPES.MONSTER:
            // Attack the monster
            attackEntity(entity);
            break;
        case ENTITY_TYPES.GOLD:
            // Collect gold
            collectGold(entity);
            break;
        case ENTITY_TYPES.POTION:
            // Use health potion
            usePotion(entity);
            break;
    }
}

// Attack an entity
function attackEntity(entity) {
    // Calculate damage
    const damage = Math.floor(Math.random() * 
        (config.damageRange[1] - config.damageRange[0] + 1)) + config.damageRange[0];
    
    entity.health -= damage;
    
    // Display message
    displayMessage(`You attack the monster for ${damage} damage!`);
    
    // Check if entity is defeated
    if (entity.health <= 0) {
        // Remove the entity
        const index = gameState.entities.indexOf(entity);
        if (index > -1) {
            gameState.entities.splice(index, 1);
        }
        
        displayMessage('You defeated the monster!');
    } else {
        // Monster counterattacks
        const monsterDamage = Math.floor(Math.random() * 
            (config.enemyDamageRange[1] - config.enemyDamageRange[0] + 1)) + config.enemyDamageRange[0];
        
        gameState.player.health -= monsterDamage;
        
        // Apply damage animation to player
        const playerCell = document.querySelector('.player');
        if (playerCell) {
            playerCell.classList.add('damage');
            setTimeout(() => {
                playerCell.classList.remove('damage');
            }, 500);
        }
        
        displayMessage(`Monster counterattacks for ${monsterDamage} damage!`);
        
        // Check if player is defeated
        if (gameState.player.health <= 0) {
            gameOver();
        }
    }
    
    // Update stats and render
    updateStats();
    renderGameBoard();
}

// Collect gold
function collectGold(entity) {
    // Get random amount of gold
    const goldAmount = Math.floor(Math.random() * 
        (config.goldRange[1] - config.goldRange[0] + 1)) + config.goldRange[0];
    
    gameState.player.gold += goldAmount;
    
    // Remove the gold
    const index = gameState.entities.indexOf(entity);
    if (index > -1) {
        gameState.entities.splice(index, 1);
    }
    
    // Apply collect animation
    const goldCell = document.querySelector(`.cell[data-x="${entity.x}"][data-y="${entity.y}"]`);
    if (goldCell) {
        goldCell.classList.add('collect');
        setTimeout(() => {
            goldCell.classList.remove('collect');
        }, 300);
    }
    
    displayMessage(`You found ${goldAmount} gold!`);
    
    // Update stats and render
    updateStats();
    renderGameBoard();
}

// Use health potion
function usePotion(entity) {
    // Calculate heal amount
    const healAmount = Math.floor(Math.random() * 
        (config.potionHealRange[1] - config.potionHealRange[0] + 1)) + config.potionHealRange[0];
    
    // Heal player
    gameState.player.health = Math.min(gameState.player.health + healAmount, gameState.player.maxHealth);
    
    // Remove the potion
    const index = gameState.entities.indexOf(entity);
    if (index > -1) {
        gameState.entities.splice(index, 1);
    }
    
    // Apply heal animation
    const potionCell = document.querySelector(`.cell[data-x="${entity.x}"][data-y="${entity.y}"]`);
    if (potionCell) {
        potionCell.classList.add('heal');
        setTimeout(() => {
            potionCell.classList.remove('heal');
        }, 500);
    }
    
    displayMessage(`You drink a potion and heal for ${healAmount} health!`);
    
    // Update stats and render
    updateStats();
    renderGameBoard();
}

// Process enemy turns
function processEnemyTurns() {
    // Each monster takes a turn
    for (const entity of gameState.entities) {
        if (entity.type === ENTITY_TYPES.MONSTER) {
            // Simple AI - move towards player if nearby
            const distance = Math.abs(entity.x - gameState.player.x) + Math.abs(entity.y - gameState.player.y);
            
            if (distance <= 5) {
                // Move towards player
                const dx = Math.sign(gameState.player.x - entity.x);
                const dy = Math.sign(gameState.player.y - entity.y);
                
                // Determine whether to move horizontally or vertically
                const moveHorizontal = Math.random() > 0.5;
                
                // Try to move
                let newX = entity.x;
                let newY = entity.y;
                
                if (moveHorizontal && dx !== 0) {
                    newX += dx;
                } else if (dy !== 0) {
                    newY += dy;
                }
                
                // Check if new position is valid
                if (isValidPosition(newX, newY) && 
                    gameState.dungeon[newY][newX] === ENTITY_TYPES.FLOOR && 
                    !isEntityAt(newX, newY) &&
                    !(newX === gameState.player.x && newY === gameState.player.y)) {
                    
                    entity.x = newX;
                    entity.y = newY;
                }
            }
        }
    }
    
    // Render the updated board
    renderGameBoard();
}

// Go to next level
function nextLevel() {
    // Increase level
    gameState.player.level++;
    
    // Increase max health
    gameState.player.maxHealth += 5;
    gameState.player.health = gameState.player.maxHealth;
    
    // Generate new dungeon
    generateDungeon();
    
    // Update UI
    updateStats();
    renderGameBoard();
    displayMessage(`You found the exit! Welcome to level ${gameState.player.level}.`);
}

// Game over
function gameOver() {
    gameState.gameOver = true;
    displayMessage(`Game Over! You reached level ${gameState.player.level} and collected ${gameState.player.gold} gold.`);
}

// Update player stats display
function updateStats() {
    healthValue.textContent = `${gameState.player.health}/${gameState.player.maxHealth}`;
    levelValue.textContent = gameState.player.level;
    goldValue.textContent = gameState.player.gold;
}

// Display a message
function displayMessage(message) {
    gameMessage.textContent = message;
}

// Render the game board
function renderGameBoard() {
    // Clear the board
    gameBoard.innerHTML = '';
    
    // Set grid size
    gameBoard.style.gridTemplateColumns = `repeat(${config.boardSize}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${config.boardSize}, 1fr)`;
    
    // Create cells
    for (let y = 0; y < config.boardSize; y++) {
        for (let x = 0; x < config.boardSize; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            // Determine cell content
            const cellType = gameState.dungeon[y][x];
            cell.classList.add(cellType);
            
            // Add cell image based on type
            if (ASSETS[cellType]) {
                const img = document.createElement('img');
                img.src = ASSETS[cellType];
                img.alt = cellType;
                cell.appendChild(img);
            }
            
            // Add to board
            gameBoard.appendChild(cell);
        }
    }
    
    // Render entities
    for (const entity of gameState.entities) {
        const cell = document.querySelector(`.cell[data-x="${entity.x}"][data-y="${entity.y}"]`);
        if (cell) {
            cell.classList.add(entity.type);
            
            // Replace image with entity image
            cell.innerHTML = '';
            const img = document.createElement('img');
            img.src = ASSETS[entity.type];
            img.alt = entity.type;
            cell.appendChild(img);
        }
    }
    
    // Render player
    const playerCell = document.querySelector(`.cell[data-x="${gameState.player.x}"][data-y="${gameState.player.y}"]`);
    if (playerCell) {
        playerCell.classList.add('player');
        
        // Replace image with player image
        playerCell.innerHTML = '';
        const img = document.createElement('img');
        img.src = ASSETS[ENTITY_TYPES.PLAYER];
        img.alt = 'player';
        playerCell.appendChild(img);
    }
}

// Event Listeners
document.addEventListener('keydown', handleKeyDown);
newGameButton.addEventListener('click', initGame);
attackButton.addEventListener('click', attackNearbyMonster);

// Movement buttons
moveButtons.up.addEventListener('click', () => movePlayer(DIRECTIONS.UP));
moveButtons.right.addEventListener('click', () => movePlayer(DIRECTIONS.RIGHT));
moveButtons.down.addEventListener('click', () => movePlayer(DIRECTIONS.DOWN));
moveButtons.left.addEventListener('click', () => movePlayer(DIRECTIONS.LEFT));

// Handle keyboard movement
function handleKeyDown(event) {
    // Prevent default to avoid scrolling
    if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', ' '].includes(event.key)) {
        event.preventDefault();
    }
    
    // Check which key was pressed
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            movePlayer(DIRECTIONS.UP);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            movePlayer(DIRECTIONS.RIGHT);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            movePlayer(DIRECTIONS.DOWN);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            movePlayer(DIRECTIONS.LEFT);
            break;
        case ' ':
            attackNearbyMonster();
            break;
    }
}

// Attack any monster adjacent to the player
function attackNearbyMonster() {
    // Check all adjacent cells for monsters
    for (const dir of Object.values(DIRECTIONS)) {
        const x = gameState.player.x + dir.x;
        const y = gameState.player.y + dir.y;
        
        // Find if there's a monster here
        const entity = getEntityAt(x, y);
        if (entity && entity.type === ENTITY_TYPES.MONSTER) {
            attackEntity(entity);
            return;
        }
    }
    
    // No monster found
    displayMessage('There are no monsters nearby to attack!');
}

// Helper function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Initialize the game on load
window.addEventListener('load', initGame);