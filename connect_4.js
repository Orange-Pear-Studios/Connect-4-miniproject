

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

let board = newBoard();
let current = "X";
let mode = "pvp";          
let starter = "player";   
let gameOver = false;
let locked = false;

const boardWrapEl = document.getElementById("boardWrap");
const boardEl = document.getElementById("board");
const dropRowEl = document.getElementById("dropRow");
const fallDiscEl = document.getElementById("fallDisc");

const statusEl = document.getElementById("status");
const modeEl = document.getElementById("mode");
const starterWrapEl = document.getElementById("starterWrap");
const starterEl = document.getElementById("starter");
const restartEl = document.getElementById("restart");


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

function findLandingRowOn(b, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r][col] === null) return r;
  }
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
  modeEl.addEventListener("change", () => {
    mode = modeEl.value;
    starterWrapEl.style.display = (mode === "cpu" || mode === "debug") ? "" : "none";
    resetGame();
  });

  starterEl.addEventListener("change", () => {
    starter = starterEl.value;
    resetGame();
  });

  restartEl.addEventListener("click", resetGame);
}

function resetGame() {
  board = newBoard();
  gameOver = false;
  locked = false;

  if (mode === "pvp") {
    current = "X";
  } else {
    
    current = (starter === "player") ? "X" : "O";
  }

  renderBoard();
  updateDropRowEnabled();
  setStatus();

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
  statusEl.textContent = (current === "X") ? "CPU (X)" : "CPU (O)";
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

async function playMove(col, token) {
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

    if (mode === "cpu") {
      statusEl.textContent = (token === "X") ? "Player wins!" : "Computer wins!";
    } else {
      statusEl.textContent = `${token} wins!`;
    }
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

function handleHumanMove(col) {
  if (!isHumanTurn()) return;
  playMove(col, current);
}

function maybeAutoMove() {
  if (gameOver || locked) return;

  const auto =
    (mode === "cpu" && current === "O") ||
    (mode === "debug");

  if (!auto) return;

  setTimeout(() => {
    if (gameOver || locked) return;
    const col = chooseCpuMove(current);
    playMove(col, current);
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
  =
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

  =
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


