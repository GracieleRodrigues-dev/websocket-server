import { WebSocketServer } from "ws";

const PORT = 4520;
const GRID_SIZE = 10;

const wss = new WebSocketServer({ port: PORT });

let players = {};          
let treasures = [];        
const wsPlayers = new Map(); // Map para associar ws -> playerName


const spawnTreasure = () => {
  if (treasures.length > 0) return; 

  let x, y;
  do {
    x = Math.floor(Math.random() * GRID_SIZE);
    y = Math.floor(Math.random() * GRID_SIZE);
  } while (Object.values(players).some(p => p.x === x && p.y === y));

  treasures.push({ x, y });
};


const broadcastState = () => {
  const state = JSON.stringify({ type: "state", players, treasures });
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(state);
    }
  });
};


const updateScore = (playerName) => {
  if (!players[playerName]) return;
  players[playerName].score += 1;
};


const movePlayer = (playerName, direction) => {
  if (!players[playerName]) return;

  let { x, y } = players[playerName];

  switch (direction) {
    case "up": if (y > 0) y -= 1; break;
    case "down": if (y < GRID_SIZE - 1) y += 1; break;
    case "left": if (x > 0) x -= 1; break;
    case "right": if (x < GRID_SIZE - 1) x += 1; break;
  }

  players[playerName].x = x;
  players[playerName].y = y;

  
  const index = treasures.findIndex(t => t.x === x && t.y === y);
  if (index >= 0) {
    treasures.splice(index, 1);
    updateScore(playerName);
    spawnTreasure(); // cria novo tesouro
  }
};

wss.on("connection", (ws) => {
  console.log("Novo cliente conectado");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "join") {
        const { playerName } = data;

        
        if (players[playerName]) {
          ws.send(JSON.stringify({ type: "error", message: "Nome já existe" }));
          return;
        }

        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);

        
        const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;

        players[playerName] = { x, y, score: 0, color: randomColor };
        wsPlayers.set(ws, playerName);
        console.log(`Jogador ${playerName} entrou no jogo`);

        spawnTreasure(); // garantir que sempre haja pelo menos 1 tesouro
        broadcastState();
      }

      if (data.type === "move") {
        movePlayer(data.playerName, data.direction);
        broadcastState();
      }

    } catch (err) {
      console.error("Erro ao processar mensagem:", err);
    }
  });

  ws.on("close", () => {
    const name = wsPlayers.get(ws);
    if (name) {
      delete players[name];
      wsPlayers.delete(ws);
      console.log(`Jogador ${name} desconectou`);
      broadcastState();
    }
  });
});


spawnTreasure();

console.log(`Servidor WebSocket iniciado em ws://localhost:${PORT}`);
