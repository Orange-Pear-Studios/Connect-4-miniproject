// connect_4.js — FULL (responsive-safe falling + modes)

const ROWS = 6;
const COLS = 7;

// ===== State =====
let board = newBoard();
let current = "X";
let mode = "pvp";          // "pvp" | "cpu" | "debug"
let starter = "player";    // "player" | "cpu"
let gameOver = false;
let locked = false;

// ===== DOM =====
const boardWrapEl = document.getElementById("boardWrap");
const boardEl = document.getElementById("board");
const dropRowEl = document.getElementById("dropRow");
const fallDiscEl = document.getElementById("fallDisc");

const statusEl = document.getElementById("status");
const modeEl = document.getElementById("mode");
const starterWrapEl = document.getElementById("starterWrap");
const starterEl = document.getElementById("starter");
const restartEl = document.getElementById("restart");

// ===== Init =====
buildDropRow();
buildBoardDOM();
wireUI();
resetGame();

// ===== Helpers =====
function newBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
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

  // Decide who starts for each mode
  if (mode === "pvp") {
    current = "X";
  } else if (mode === "cpu") {
    // Player is always X, Computer is O
    current = (starter === "player") ? "X" : "O";
  } else {
    // debug: CPU vs CPU
    current = (starter === "player") ? "X" : "O"; // reuse dropdown labels
  }

  renderBoard();
  updateDropRowEnabled();
  setStatus();

  // if CPU starts, play immediately
  maybeAutoMove();
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

function cellElAt(r, c) {
  return boardEl.children[r * COLS + c];
}

function updateDropRowEnabled() {
  const btns = [...dropRowEl.querySelectorAll("button")];
  for (let c = 0; c < COLS; c++) {
    btns[c].disabled = locked || gameOver || (board[0][c] !== null) || !isHumanTurn();
  }
}

function isHumanTurn() {
  if (mode === "pvp") return true;
  if (mode === "cpu") return current === "X"; // player is X
  return false; // debug has no human
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

  // debug
  statusEl.textContent = (current === "X") ? "CPU (X)" : "CPU (O)";
}

function switchTurn() {
  current = (current === "X") ? "O" : "X";
  setStatus();
  updateDropRowEnabled();
  maybeAutoMove();
}

function findLandingRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

function checkWin(b, token) {
  // horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (b[r][c] === token && b[r][c + 1] === token && b[r][c + 2] === token && b[r][c + 3] === token) return true;
    }
  }
  // vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      if (b[r][c] === token && b[r + 1][c] === token && b[r + 2][c] === token && b[r + 3][c] === token) return true;
    }
  }
  // diag down-right
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (b[r][c] === token && b[r + 1][c + 1] === token && b[r + 2][c + 2] === token && b[r + 3][c + 3] === token) return true;
    }
  }
  // diag up-right
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (b[r][c] === token && b[r - 1][c + 1] === token && b[r - 2][c + 2] === token && b[r - 3][c + 3] === token) return true;
    }
  }
  return false;
}

function isDraw() {
  return board[0].every(v => v !== null);
}

// ===== Falling animation (no hardcoded sizes) =====
function getCenterInWrap(el) {
  const wrapRect = boardWrapEl.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: (r.left - wrapRect.left) + r.width / 2,
    y: (r.top  - wrapRect.top)  + r.height / 2,
    h: r.height
  };
}

function animateFall(row, col, token) {
  const targetCell = cellElAt(row, col);
  const target = getCenterInWrap(targetCell);

  fallDiscEl.className = `fall-disc ${token.toLowerCase()}`;
  fallDiscEl.style.opacity = "1";

  const startY = -target.h; // start above board
  const duration = Math.min(520, 220 + row * 70);
  const t0 = performance.now();

  return new Promise((resolve) => {
    function step(t) {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic

      const y = startY + (target.y - startY) * e;

      fallDiscEl.style.transform =
        `translate(${target.x}px, ${y}px) translate(-50%, -50%)`;

      if (p < 1) requestAnimationFrame(step);
      else {
        fallDiscEl.style.opacity = "0";
        resolve();
      }
    }

    // set initial transform immediately
    fallDiscEl.style.transform =
      `translate(${target.x}px, ${startY}px) translate(-50%, -50%)`;

    requestAnimationFrame(step);
  });
}

// ===== Game flow =====
async function playMove(col, token) {
  if (locked || gameOver) return false;

  const row = findLandingRow(col);
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
    } else if (mode === "debug") {
      statusEl.textContent = `${token} wins!`;
    } else {
      statusEl.textContent = `${token} wins!`;
    }
    return true;
  }

  if (isDraw()) {
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
    (mode === "debug"); // both sides are CPU in debug

  if (!auto) return;

  // small delay feels more natural
  setTimeout(() => {
    if (gameOver || locked) return;
    const col = chooseCpuMove(current);
    playMove(col, current);
  }, 180);
}

// ===== Simple CPU =====
function validColumns() {
  const cols = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === null) cols.push(c);
  }
  return cols;
}

function tryWinningMove(token) {
  const cols = validColumns();
  for (const c of cols) {
    const r = findLandingRow(c);
    if (r < 0) continue;
    board[r][c] = token;
    const win = checkWin(board, token);
    board[r][c] = null;
    if (win) return c;
  }
  return null;
}

function chooseCpuMove(token) {
  const opp = (token === "X") ? "O" : "X";

  // 1) win now
  const winCol = tryWinningMove(token);
  if (winCol !== null) return winCol;

  // 2) block opponent win
  const blockCol = tryWinningMove(opp);
  if (blockCol !== null) return blockCol;

  // 3) prefer center-ish columns
  const pref = [3, 2, 4, 1, 5, 0, 6];
  const cols = validColumns();
  for (const c of pref) {
    if (cols.includes(c)) return c;
  }

  // fallback
  return cols[Math.floor(Math.random() * cols.length)];
}
