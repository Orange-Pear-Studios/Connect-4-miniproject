


const ROWS = 6;
const COLS = 7;

const DEPTH = 8;


const base = 220;     
const extra = 55;     

const POSITION_WEIGHTS = Array.from({ length: ROWS }, () => [3, 4, 5, 7, 5, 4, 3]);


let board = newBoard();
let current = "X";
let mode = "pvp";         
let gameOver = false;
let locked = false;


let starter = "player";
let cpuToken = "O";


const boardWrapEl = document.getElementById("boardWrap");
const boardEl = document.getElementById("board");
const dropRowEl = document.getElementById("dropRow");
const statusEl = document.getElementById("status");
const modeEl = document.getElementById("mode");
const restartEl = document.getElementById("restart");
const starterWrap = document.getElementById("starterWrap");
const starterEl = document.getElementById("starter");
const fallDiscEl = document.getElementById("fallDisc");


function newBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(" "));
}
function copyBoard(b) {
  return b.map(row => row.slice());
}
function landingRow(b, col) {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r][col] === " ") return r;
  return -1;
}
function drop(b, col, piece) {
  const nb = copyBoard(b);
  for (let r = ROWS - 1; r >= 0; r--) {
    if (nb[r][col] === " ") { nb[r][col] = piece; break; }
  }
  return nb;
}
function getMoves(b) {
  const order = [3, 2, 4, 1, 5, 0, 6];
  return order.filter(c => b[0][c] === " ");
}
function checkDraw(b) {
  return !b[0].includes(" ");
}
function checkWin(b, token) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 3; c++)
    if (b[r][c]===token && b[r][c+1]===token && b[r][c+2]===token && b[r][c+3]===token) return true;

  for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS; c++)
    if (b[r][c]===token && b[r+1][c]===token && b[r+2][c]===token && b[r+3][c]===token) return true;

  for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS - 3; c++)
    if (b[r][c]===token && b[r+1][c+1]===token && b[r+2][c+2]===token && b[r+3][c+3]===token) return true;

  for (let r = 0; r < ROWS - 3; r++) for (let c = 3; c < COLS; c++)
    if (b[r][c]===token && b[r+1][c-1]===token && b[r+2][c-2]===token && b[r+3][c-3]===token) return true;

  return false;
}


function isCpuTurn() {
  return mode === "cpu" && current === cpuToken;
}
function playerToken() {
  
  return (mode === "cpu") ? (cpuToken === "X" ? "O" : "X") : null;
}
function turnLabel() {
  if (mode === "cpu") {
    return isCpuTurn() ? "Computer's turn" : "Player's turn";
  }
  return `${current}'s turn`;
}
function winMessageFor(piece) {
  if (mode === "cpu") {
    return piece === cpuToken ? "Computer wins!" : "Player wins!";
  }
  return `${piece} wins!`;
}


function scoreWindow(w, comp) {
  const opp = comp === "X" ? "O" : "X";
  let s = 0;

  const compCt = w.filter(x => x === comp).length;
  const oppCt  = w.filter(x => x === opp).length;
  const emptyCt = w.filter(x => x === " ").length;

  if (compCt === 4) s += 10000;
  else if (compCt === 3 && emptyCt === 1) s += 100;
  else if (compCt === 2 && emptyCt === 2) s += 10;

  if (oppCt === 3 && emptyCt === 1) s -= 120;
  else if (oppCt === 2 && emptyCt === 2) s -= 15;

  return s;
}
function countThreats(b, t) {
  let ct = 0;
  for (let col = 0; col < COLS; col++) {
    if (b[0][col] !== " ") continue;
    const temp = drop(b, col, t);
    if (checkWin(temp, t)) ct++;
  }
  return ct;
}
function heuristic(b, comp) {
  const opp = comp === "X" ? "O" : "X";
  let s = 0;

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 3; c++)
    s += scoreWindow([b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]], comp);

  for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS; c++)
    s += scoreWindow([b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]], comp);

  for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS - 3; c++)
    s += scoreWindow([b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]], comp);

  for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS - 3; c++)
    s += scoreWindow([b[r+3][c], b[r+2][c+1], b[r+1][c+2], b[r][c+3]], comp);

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (b[r][c] === comp) s += POSITION_WEIGHTS[r][c];
    else if (b[r][c] === opp) s -= POSITION_WEIGHTS[r][c];
  }

  const mt = countThreats(b, comp);
  const ot = countThreats(b, opp);
  if (mt >= 2) s += 500000;
  else if (mt === 1) s += 50;

  if (ot >= 2) s -= 500000;
  else if (ot === 1) s -= 60;

  const center = Array.from({ length: ROWS }, (_, r) => b[r][3]);
  s += center.filter(x => x === comp).length * 6;
  s -= center.filter(x => x === opp).length * 6;

  return s;
}
function evalBoard(b, comp) {
  const opp = comp === "X" ? "O" : "X";
  if (checkWin(b, comp)) return  1_000_000_000;
  if (checkWin(b, opp))  return -1_000_000_000;
  if (checkDraw(b))      return 0;
  return null;
}
function minimax(b, depth, maximizing, comp, alpha, beta) {
  const st = evalBoard(b, comp);
  if (st !== null) return st;
  if (depth === 0) return heuristic(b, comp);

  if (maximizing) {
    let best = -1e12;
    for (const col of getMoves(b)) {
      const sc = minimax(drop(b, col, comp), depth - 1, false, comp, alpha, beta);
      if (sc > best) best = sc;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    const opp = comp === "X" ? "O" : "X";
    let best = 1e12;
    for (const col of getMoves(b)) {
      const sc = minimax(drop(b, col, opp), depth - 1, true, comp, alpha, beta);
      if (sc < best) best = sc;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}
function bestMove(b, comp) {
  const moves = getMoves(b);
  if (moves.length === 0) return null;

  let best = -1e12;
  let mv = moves[0];
  for (const col of moves) {
    const sc = minimax(drop(b, col, comp), DEPTH - 1, false, comp, -1e12, 1e12);
    if (sc > best) { best = sc; mv = col; }
  }
  return mv;
}


function render() {
  
  dropRowEl.innerHTML = "";
  for (let c = 0; c < COLS; c++) {
    const btn = document.createElement("button");
    btn.textContent = "▼";
    btn.disabled =
      gameOver ||
      locked ||
      mode === "debug" ||
      isCpuTurn() ||
      board[0][c] !== " ";
    btn.addEventListener("click", () => handleMove(c));
    dropRowEl.appendChild(btn);
  }


  boardEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const v = board[r][c];
      if (v !== " ") {
        cell.classList.add(v.toLowerCase());
        const disc = document.createElement("div");
        disc.className = "disc";
        cell.appendChild(disc);
      }
      boardEl.appendChild(cell);
    }
  }

  if (!gameOver) {
    if (locked && isCpuTurn()) statusEl.textContent = "Computer thinking…";
    else statusEl.textContent = turnLabel();
  }
}

function endGame(msg) {
  gameOver = true;
  locked = false;
  hideFallDisc();
  statusEl.textContent = msg;
  render();
}


function showFallDisc(piece) {
  fallDiscEl.className = `fall-disc ${piece.toLowerCase()}`;
  fallDiscEl.style.opacity = "1";
}
function hideFallDisc() {
  fallDiscEl.style.opacity = "0";
  fallDiscEl.style.transform = "translate(0px, 0px)";
}

function animateFall(col, toRow, piece, onDone) {
  
  const cells = boardEl.querySelectorAll(".cell");
  if (!cells.length) { onDone(); return; }

  const targetCell = cells[toRow * COLS + col];
  const topCell    = cells[0 * COLS + col];

  const wrapRect = boardWrapEl.getBoundingClientRect();
  const topRect  = topCell.getBoundingClientRect();
  const endRect  = targetCell.getBoundingClientRect();


  const size = 48;


  const colCenterX = (topRect.left + topRect.width / 2) - wrapRect.left - size / 2;


  const startY = (topRect.top - wrapRect.top) - size - 8;


  const endY = (endRect.top + endRect.height / 2) - wrapRect.top - size / 2;

  showFallDisc(piece);


  fallDiscEl.style.left = `${colCenterX}px`;
  fallDiscEl.style.top  = `${startY}px`;
  fallDiscEl.style.transform = `translate(0px, 0px)`;

  const duration = base + toRow * extra;
  const startTime = performance.now();

  function easeOut(t) {
   
    return 1 - Math.pow(1 - t, 3);
  }

  function frame(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const y = (endY - startY) * easeOut(t);
    fallDiscEl.style.transform = `translate(0px, ${y}px)`;

    if (t < 1) requestAnimationFrame(frame);
    else {
      hideFallDisc();
      onDone();
    }
  }

  requestAnimationFrame(frame);
}


function commitMove(col, piece) {
  board = drop(board, col, piece);
}

function afterMoveCheck(piece) {
  if (checkWin(board, piece)) return endGame(winMessageFor(piece));
  if (checkDraw(board)) return endGame("Draw!");
  current = current === "X" ? "O" : "X";
  render();
  return null;
}


function handleMove(col) {
  if (gameOver || locked) return;
  if (board[0][col] !== " ") return;
  if (isCpuTurn()) return;

  const r = landingRow(board, col);
  if (r < 0) return;

  locked = true;
  render(); 

  animateFall(col, r, current, () => {
    commitMove(col, current);
    locked = false;
    render();

    const ended = afterMoveCheck(current);
    if (ended) return;

    maybeCpuMove();
  });
}

function maybeCpuMove() {
  if (gameOver || locked) return;
  if (!isCpuTurn()) return;

  locked = true;
  render();

  setTimeout(() => {
    if (gameOver) return;

    const m = bestMove(board, cpuToken);
    if (m === null) return endGame("Draw!");

    const r = landingRow(board, m);

    animateFall(m, r, cpuToken, () => {
      commitMove(m, cpuToken);
      locked = false;
      render();

      const ended = afterMoveCheck(cpuToken);
      if (ended) return;
    });
  }, 50);
}


function cpuVsCpuTick() {
  if (gameOver || locked || mode !== "debug") return;

  locked = true;
  render();

  setTimeout(() => {
    const m = bestMove(board, current);
    if (m === null) return endGame("Draw!");

    const r = landingRow(board, m);
    const piece = current;

    animateFall(m, r, piece, () => {
      commitMove(m, piece);
      locked = false;
      render();

      if (checkWin(board, piece)) return endGame(winMessageFor(piece));
      if (checkDraw(board)) return endGame("Draw!");

      current = current === "X" ? "O" : "X";
      setTimeout(cpuVsCpuTick, 80);
    });
  }, 50);
}


modeEl.addEventListener("change", () => {
  mode = modeEl.value;
  if (starterWrap) starterWrap.style.display = (mode === "cpu") ? "inline-block" : "none";
  restart();
});

if (starterEl) {
  starterEl.addEventListener("change", () => {
    starter = starterEl.value;
    restart();
  });
}

restartEl.addEventListener("click", restart);


function restart() {
  board = newBoard();
  gameOver = false;
  locked = false;

  current = "X";

  if (mode === "cpu") cpuToken = (starter === "cpu") ? "X" : "O";
  else cpuToken = "O";

  statusEl.textContent = "";
  hideFallDisc();
  render();

  if (mode === "debug") cpuVsCpuTick();
  maybeCpuMove();
}


mode = modeEl.value;
starter = starterEl ? starterEl.value : "player";
if (starterWrap) starterWrap.style.display = (mode === "cpu") ? "inline-block" : "none";
restart();
