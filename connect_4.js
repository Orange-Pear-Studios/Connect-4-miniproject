import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyBS0M-XM4IXxriFneqvk5tdcO257k-MTI8",
  authDomain: "connect-4-42b0c.firebaseapp.com",
  projectId: "connect-4-42b0c",
  storageBucket: "connect-4-42b0c.firebasestorage.app",
  messagingSenderId: "997792673401",
  appId: "1:997792673401:web:63d6d4aede8ca3acca6ea8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInAnonymously(auth);
const currentUser = auth.currentUser;
console.log("Signed in:", currentUser.uid);


const ROWS = 6;
const COLS = 7;

const DEPTH = 8;
const POSITION_WEIGHTS = [
  [3, 4, 5, 7, 5, 4, 3],
  [3, 4, 5, 7, 5, 4, 3],
  [3, 4, 5, 7, 5, 4, 3],
  [3, 4, 5, 7, 5, 4, 3],
  [3, 4, 5, 7, 5, 4, 3],
  [3, 4, 5, 7, 5, 4, 3],
];


const boardWrapEl = document.getElementById("boardWrap");
const boardEl = document.getElementById("board");
const dropRowEl = document.getElementById("dropRow");
const fallDiscEl = document.getElementById("fallDisc");

const statusEl = document.getElementById("status");
const modeEl = document.getElementById("mode");
const starterWrapEl = document.getElementById("starterWrap");
const starterEl = document.getElementById("starter");
const restartEl = document.getElementById("restart");

const partyPanelEl = document.getElementById("partyPanel");
const tagEl = document.getElementById("tag");
const createRoomEl = document.getElementById("createRoom");
const roomCodeEl = document.getElementById("roomCode");
const joinRoomEl = document.getElementById("joinRoom");
const leaveRoomEl = document.getElementById("leaveRoom");
const roomInfoEl = document.getElementById("roomInfo");
const meInfoEl = document.getElementById("meInfo");
const playersInfoEl = document.getElementById("playersInfo");


let board = newBoard();       
let current = "X";            
let mode = "pvp";            
let starter = "player";       
let gameOver = false;
let locked = false;



let roomId = null;           
let mySymbol = null;         
let roomUnsub = null;         
let lastSeenMoveId = 0;       

buildDropRow();
buildBoardDOM();
wireUI();
resetGame();


function newBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}
function cloneBoard(b) {
  return b.map(row => row.slice());
}
function flattenBoard(b2d) {
  const flat = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) flat.push(b2d[r][c]);
  return flat;
}
function unflattenBoard(flat) {
  const b2d = newBoard();
  for (let i = 0; i < 42; i++) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    b2d[r][c] = flat[i] ?? null;
  }
  return b2d;
}
function findLandingRowOn(b, col) {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r][col] === null) return r;
  return -1;
}
function applyMoveOn(b, col, token) {
  const r = findLandingRowOn(b, col);
  if (r < 0) return null;
  b[r][col] = token;
  return r;
}
function isDrawOn(b) {
  return b[0].every(v => v !== null);
}
function getMovesOn(b) {
  const order = [3, 2, 4, 1, 5, 0, 6];
  return order.filter(c => b[0][c] === null);
}


function buildBoardDOM() {
  boardEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);

      const disc = document.createElement("div");
      disc.className = "disc";
      cell.appendChild(disc);

      boardEl.appendChild(cell);
    }
  }
}

function buildDropRow() {
  dropRowEl.innerHTML = "";
  for (let c = 0; c < COLS; c++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "▼";
    btn.setAttribute("aria-label", `Drop in column ${c + 1}`);
    btn.addEventListener("click", () => handleHumanMove(c));
    dropRowEl.appendChild(btn);
  }
}


function wireUI() {
  modeEl.addEventListener("change", async () => {
    mode = modeEl.value;

    starterWrapEl.style.display = (mode === "cpu") ? "" : "none";
    partyPanelEl.classList.toggle("active", mode === "party");

    
    if (mode !== "party") {
      await leaveRoom();
    }

    resetGame();
  });

  starterEl.addEventListener("change", () => {
    starter = starterEl.value;
    resetGame();
  });

  restartEl.addEventListener("click", async () => {
    if (mode === "party" && roomId) {
      
     
      setStatus("Party mode: create a new room to restart.");
      return;
    }
    resetGame();
  });

  createRoomEl.addEventListener("click", async () => {
    if (mode !== "party") {
      modeEl.value = "party";
      mode = "party";
      partyPanelEl.style.display = "";
      starterWrapEl.style.display = "none";
    }
    await createRoom();
  });

  joinRoomEl.addEventListener("click", async () => {
    if (mode !== "party") {
      modeEl.value = "party";
      mode = "party";
      partyPanelEl.style.display = "";
      starterWrapEl.style.display = "none";
    }
    const code = (roomCodeEl.value || "").trim().toUpperCase();
    if (!code) {
      setStatus("Type a room code to join.");
      return;
    }
    await joinRoom(code);
  });

  leaveRoomEl.addEventListener("click", async () => {
    await leaveRoom();
    setStatus("Left room.");
  });
}


function resetGame() {
  board = newBoard();
  gameOver = false;
  locked = false;

  if (mode === "pvp") {
    current = "X";
  } else if (mode === "cpu") {
    current = (starter === "player") ? "X" : "O";
  } else {
    
    current = "X";
  }

  renderBoard();
  updateDropRowEnabled();
  setStatus(mode === "party" ? "Party mode: create or join a room." : null);

  maybeAutoMove();
}


function cellElAt(r, c) {
  return boardEl.children[r * COLS + c];
}

function renderBoard() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellElAt(r, c);
      cell.classList.remove("x", "o");
      const v = board[r][c];
      if (v === "X") cell.classList.add("x");
      if (v === "O") cell.classList.add("o");
    }
  }
}

function isHumanTurn() {
  if (mode === "pvp") return true;
  if (mode === "cpu") return current === "X";
  if (mode === "party") {
    
    if (!roomId || !mySymbol) return false;
    return current === mySymbol;
  }
  return false;
}

function updateDropRowEnabled() {
  const btns = [...dropRowEl.querySelectorAll("button")];
  for (let c = 0; c < COLS; c++) {
    btns[c].disabled =
      locked || gameOver || (board[0][c] !== null) || !isHumanTurn();
  }
}

function setStatus(textOverride = null) {
  if (textOverride) {
    statusEl.textContent = textOverride;
    return;
  }
  if (gameOver) return;

  if (mode === "pvp") {
    statusEl.textContent = `${current}'s turn`;
    return;
  }
  if (mode === "cpu") {
    statusEl.textContent = (current === "X") ? "Player's turn" : "Computer's turn";
    return;
  }
 
  if (!roomId) {
    statusEl.textContent = "Party mode: create or join a room.";
    return;
  }
  if (!mySymbol) {
    statusEl.textContent = `Room ${roomId}: waiting to join...`;
    return;
  }
  statusEl.textContent =
    (current === mySymbol)
      ? `Your turn (${mySymbol})`
      : `Opponent's turn (${current})`;
}

function switchTurn() {
  current = (current === "X") ? "O" : "X";
  setStatus();
  updateDropRowEnabled();
  maybeAutoMove();
}


function checkWin(b, token) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (b[r][c] === token && b[r][c + 1] === token && b[r][c + 2] === token && b[r][c + 3] === token) return true;
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      if (b[r][c] === token && b[r + 1][c] === token && b[r + 2][c] === token && b[r + 3][c] === token) return true;
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (b[r][c] === token && b[r + 1][c + 1] === token && b[r + 2][c + 2] === token && b[r + 3][c + 3] === token) return true;
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (b[r][c] === token && b[r - 1][c + 1] === token && b[r - 2][c + 2] === token && b[r - 3][c + 3] === token) return true;
    }
  }
  return false;
}


function getCenterInWrap(el) {
  const wrapRect = boardWrapEl.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: (r.left - wrapRect.left) + r.width / 2,
    y: (r.top - wrapRect.top) + r.height / 2,
    h: r.height
  };
}

function animateFall(row, col, token) {
  const targetCell = cellElAt(row, col);
  const target = getCenterInWrap(targetCell);

  fallDiscEl.className = `fall-disc ${token.toLowerCase()}`;
  fallDiscEl.style.opacity = "1";

  const startY = -target.h;
  const duration = Math.min(520, 220 + row * 70);
  const t0 = performance.now();

  return new Promise((resolve) => {
    function step(t) {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const y = startY + (target.y - startY) * e;

      fallDiscEl.style.transform =
        `translate(${target.x}px, ${y}px) translate(-50%, -50%)`;

      if (p < 1) requestAnimationFrame(step);
      else {
        fallDiscEl.style.opacity = "0";
        resolve();
      }
    }

    fallDiscEl.style.transform =
      `translate(${target.x}px, ${startY}px) translate(-50%, -50%)`;

    requestAnimationFrame(step);
  });
}


async function playMoveLocal(col, token) {
  if (locked || gameOver) return false;

  const row = findLandingRowOn(board, col);
  if (row < 0) return false;

  locked = true;
  updateDropRowEnabled();

  await animateFall(row, col, token);

  board[row][col] = token;
  renderBoard();

  if (checkWin(board, token)) {
    gameOver = true;
    locked = false;
    updateDropRowEnabled();

    if (mode === "cpu") statusEl.textContent = (token === "X") ? "Player wins!" : "Computer wins!";
    else statusEl.textContent = `${token} wins!`;
    return true;
  }

  if (isDrawOn(board)) {
    gameOver = true;
    locked = false;
    updateDropRowEnabled();
    statusEl.textContent = "Draw!";
    return true;
  }

  locked = false;
  switchTurn();
  return true;
}


async function playMoveParty(col) {
  if (!roomId || !mySymbol) return;
  if (locked || gameOver) return;
  if (current !== mySymbol) return; 

  const roomRef = doc(db, "rooms", roomId);

  locked = true;
  updateDropRowEnabled();

  try {
   
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) throw new Error("Room not found.");

      const data = snap.data();
      if (data.winner) throw new Error("Game already ended.");

      const serverCurrent = data.current ?? "X";
      if (serverCurrent !== mySymbol) throw new Error("Not your turn.");

      const flat = Array.isArray(data.board) ? data.board.slice(0, 42) : Array(42).fill(null);
      const b2d = unflattenBoard(flat);

      const row = findLandingRowOn(b2d, col);
      if (row < 0) throw new Error("Column full.");

      
      b2d[row][col] = mySymbol;

      
      let winner = null;
      let next = (mySymbol === "X") ? "O" : "X";

      if (checkWin(b2d, mySymbol)) {
        winner = mySymbol;
        next = serverCurrent; 
      } else if (isDrawOn(b2d)) {
        winner = "draw";
        next = serverCurrent;
      }

      const moveId = (data.moveId ?? 0) + 1;

      tx.update(roomRef, {
        board: flattenBoard(b2d),
        current: next,
        winner: winner,
        lastMove: { col, row, token: mySymbol },
        moveId,
        updatedAt: serverTimestamp()
      });
    });

    
  } catch (err) {
    setStatus(String(err.message || err));
  } finally {
    locked = false;
    updateDropRowEnabled();
  }
}


function handleHumanMove(col) {
  if (!isHumanTurn()) return;

  if (mode === "party") {
    playMoveParty(col);
    return;
  }

  playMoveLocal(col, current);
}


function maybeAutoMove() {
  if (gameOver || locked) return;

  const auto = (mode === "cpu" && current === "O");
  if (!auto) return;

  setTimeout(() => {
    if (gameOver || locked) return;
    const col = chooseCpuMove(current);
    playMoveLocal(col, current);
  }, 180);
}


function scoreWindow(window4, comp) {
  const opp = (comp === "X") ? "O" : "X";
  let s = 0;

  const compCount = window4.filter(v => v === comp).length;
  const oppCount = window4.filter(v => v === opp).length;
  const emptyCount = window4.filter(v => v === null).length;

  if (compCount === 4) s += 1000000;
  else if (compCount === 3 && emptyCount === 1) s += 100;
  else if (compCount === 2 && emptyCount === 2) s += 10;

  if (oppCount === 3 && emptyCount === 1) s -= 100;
  else if (oppCount === 2 && emptyCount === 2) s -= 10;

  return s;
}

function countThreats(b, token) {
  let ct = 0;
  for (let col = 0; col < COLS; col++) {
    if (b[0][col] !== null) continue;
    const temp = cloneBoard(b);
    applyMoveOn(temp, col, token);
    if (checkWin(temp, token)) ct++;
  }
  return ct;
}

function heuristic(b, comp) {
  const opp = (comp === "X") ? "O" : "X";
  let s = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const w = [b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]];
      s += scoreWindow(w, comp);
    }
  }

  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      const w = [b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]];
      s += scoreWindow(w, comp);
    }
  }

  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const w = [b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]];
      s += scoreWindow(w, comp);
    }
  }

  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      const w = [b[r][c], b[r + 1][c - 1], b[r + 2][c - 2], b[r + 3][c - 3]];
      s += scoreWindow(w, comp);
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (b[r][c] === comp) s += POSITION_WEIGHTS[r][c];
      else if (b[r][c] === opp) s -= POSITION_WEIGHTS[r][c];
    }
  }

  const mt = countThreats(b, comp);
  const ot = countThreats(b, opp);

  if (mt >= 2) s += 1000000;
  else if (mt === 1) s += 50;

  if (ot >= 2) s -= 1000000;
  else if (ot === 1) s -= 100;

  let compCenter = 0;
  let oppCenter = 0;
  for (let r = 0; r < ROWS; r++) {
    if (b[r][3] === comp) compCenter++;
    else if (b[r][3] === opp) oppCenter++;
  }
  s += compCenter * 6;
  s -= oppCenter * 6;

  return s;
}

function evalBoard(b, comp) {
  const opp = (comp === "X") ? "O" : "X";
  if (checkWin(b, comp)) return 1000000000;
  if (checkWin(b, opp)) return -1000000000;
  if (isDrawOn(b)) return 0;
  return null;
}

function minimax(b, depth, maximizing, comp, alpha, beta) {
  const st = evalBoard(b, comp);
  if (st !== null) return st;
  if (depth === 0) return heuristic(b, comp);

  if (maximizing) {
    let best = -1e12;
    for (const col of getMovesOn(b)) {
      const b2 = cloneBoard(b);
      applyMoveOn(b2, col, comp);
      const sc = minimax(b2, depth - 1, false, comp, alpha, beta);
      if (sc > best) best = sc;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    const opp = (comp === "X") ? "O" : "X";
    let best = 1e12;
    for (const col of getMovesOn(b)) {
      const b2 = cloneBoard(b);
      applyMoveOn(b2, col, opp);
      const sc = minimax(b2, depth - 1, true, comp, alpha, beta);
      if (sc < best) best = sc;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

function bestMove(b, comp) {
  let best = -1e12;
  let mv = null;

  for (const col of getMovesOn(b)) {
    const b2 = cloneBoard(b);
    applyMoveOn(b2, col, comp);
    const sc = minimax(b2, DEPTH - 1, false, comp, -1e12, 1e12);
    if (sc > best) {
      best = sc;
      mv = col;
    }
  }
  if (mv === null) {
    const moves = getMovesOn(b);
    return moves.length ? moves[0] : 0;
  }
  return mv;
}

function chooseCpuMove(token) {
  return bestMove(board, token);
}


function makeRoomCode6() {
  
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function safeTag() {
  const t = (tagEl.value || "").trim();
  if (!t) return "Player";
  return t.slice(0, 16);
}

async function createRoom() {
  await leaveRoom(); 

  const code = makeRoomCode6();
  const roomRef = doc(db, "rooms", code);

  const hostTag = safeTag();
  setPartyControlsDisabled(true);
  await setDoc(roomRef, {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    board: Array(42).fill(null),
    current: "X",
    winner: null,
    moveId: 0,
    lastMove: null,

    players: {
      X: { uid: currentUser.uid, tag: hostTag },
      O: null
    }
    
  });

  roomId = code;
  mySymbol = "X";
  lastSeenMoveId = 0;

  roomCodeEl.value = code;
  listenToRoom(code);

  setStatus(`Room ${code} created. Share code with your friend.`);
}

async function joinRoom(code) {
  await leaveRoom(); 

  const roomRef = doc(db, "rooms", code);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    setStatus("Room not found.");
    return;
  }

  const data = snap.data();
  const myTag = safeTag();

 
  if (data.players?.X?.uid === currentUser.uid) {
    roomId = code;
    mySymbol = "X";
    lastSeenMoveId = data.moveId ?? 0;
    listenToRoom(code);
    setStatus(`Rejoined room ${code} as X.`);
    return;
  }
  if (data.players?.O?.uid === currentUser.uid) {
    roomId = code;
    mySymbol = "O";
    lastSeenMoveId = data.moveId ?? 0;
    listenToRoom(code);
    setStatus(`Rejoined room ${code} as O.`);
    return;
  }

  
  if (!data.players?.X) {
    await updateDoc(roomRef, {
      "players.X": { uid: currentUser.uid, tag: myTag },
      updatedAt: serverTimestamp()
    });
    roomId = code;
    mySymbol = "X";
  } else if (!data.players?.O) {
    await updateDoc(roomRef, {
      "players.O": { uid: currentUser.uid, tag: myTag },
      updatedAt: serverTimestamp()
    });
    roomId = code;
    mySymbol = "O";
  } else {
    setStatus("Room is full (already has 2 players).");
    return;
  }

  lastSeenMoveId = data.moveId ?? 0;
  listenToRoom(code);
  setStatus(`Joined room ${code} as ${mySymbol}.`);
}

function listenToRoom(code) {
  if (roomUnsub) roomUnsub();

  const roomRef = doc(db, "rooms", code);

  roomUnsub = onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) {
      setStatus("Room was deleted or no longer exists.");
      leaveRoom();
      return;
    }
    const data = snap.data();

    
    roomInfoEl.textContent = code;
    meInfoEl.textContent = mySymbol ? `${mySymbol} (${safeTag()})` : "—";

    const px = data.players?.X ? `${data.players.X.tag} (X)` : "— (X)";
    const po = data.players?.O ? `${data.players.O.tag} (O)` : "— (O)";
    playersInfoEl.textContent = `${px} vs ${po}`;

   
    const flat = Array.isArray(data.board) ? data.board.slice(0, 42) : Array(42).fill(null);
    board = unflattenBoard(flat);
    current = data.current ?? "X";

    const winner = data.winner ?? null;
    gameOver = Boolean(winner);
    locked = false;

    renderBoard();
    updateDropRowEnabled();

    
    if (winner === "draw") {
      setStatus("Draw!");
    } else if (winner === "X" || winner === "O") {
      setStatus(`${winner} wins!`);
    } else {
      
      if (!data.players?.O || !data.players?.X) {
        setStatus(`Room ${code}: waiting for 2nd player...`);
      } else {
        setStatus(null);
      }
    }

    
    const moveId = data.moveId ?? 0;
    if (moveId !== lastSeenMoveId) lastSeenMoveId = moveId;
  });
}

async function leaveRoom() {
  if (roomUnsub) {
    roomUnsub();
    roomUnsub = null;
  }

  roomId = null;
  mySymbol = null;
  lastSeenMoveId = 0;

  roomInfoEl.textContent = "—";
  meInfoEl.textContent = "—";
  playersInfoEl.textContent = "—";

  
  board = newBoard();
  current = "X";
  gameOver = false;
  locked = false;
  renderBoard();
  updateDropRowEnabled();
  setPartyControlsDisabled(false);
}


starterWrapEl.style.display = (mode === "cpu") ? "" : "none";

setStatus("Ready.");
function setPartyControlsDisabled(disabled) {
  joinRoomEl.disabled = disabled;
  createRoomEl.disabled = disabled;
  roomCodeEl.disabled = disabled;

}
