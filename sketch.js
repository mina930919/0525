let handPose;
let video;
let hands = [];
let options = { flipped: true };

let items = [];
let bombs = [];
let paddleRightX;
let paddleWidth = 100; // 接盤寬度改為100
let paddleHeight = 20;
let score = 0;

let emojis = ['📱', '💻', '🖥️', '⌨️', '🖱️'];
let badEmojis = ['📺', '📷', '🎥', '🖨️', '📹']; // 壞的 emoji 改成指定五種

let life = 3;
let heartTrace = [];
let maxTraceLength = 100;
let heartCooldown = 0;
let minSpacing = 50;

// 額外變數：題目彈窗狀態
let showQuiz = false;
let quizAnswered = false;
let quizCorrect = false;
let quizQuestion = "";
let quizOptions = [];
let quizAnswer = 0; // 正確答案索引

// 題庫（可自行擴充）
const quizList = [
  {
    q: "使用科技輔助學習可以提升學習成效？",
    options: ["是", "否"],
    answer: 0
  },
  {
    q: "網路上的所有資訊都一定正確？",
    options: ["是", "否"],
    answer: 1
  },
  {
    q: "善用線上學習平台可以自主學習？",
    options: ["是", "否"],
    answer: 0
  },
  {
    q: "虛擬實境(VR)與擴增實境(AR)屬於沉浸式科技的一種，能用來模擬真實或抽象的學習情境。",
    options: ["是", "否"],
    answer: 0
  },
  {
    q: "大數據與學習分析是近年教育科技的重要發展方向之一。",
    options: ["是", "否"],
    answer: 0
  },
  {
    q: "教育科技的評估僅需考量學習成效，無需關注使用者感受與系統穩定性。",
    options: ["是", "否"],
    answer: 1
  }
];

let quizUsed = []; // 記錄已出過的題目索引

function preload() {
  handPose = ml5.handPose(options);
}

function setup() {
  createCanvas(640, 480);
  textAlign(CENTER, CENTER);
  textSize(32);
  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();
  handPose.detectStart(video, gotHands);

  setInterval(() => {
    addNewItem(badEmojis, -5, 5);
  }, 1700); // 2.5秒產生一次壞emoji

  setInterval(() => {
    addNewItem(emojis, 10, 5);
  }, 1700);

  setInterval(() => {
    let x = getNonOverlappingX(items.concat(bombs));
    bombs.push({
      x: x,
      y: 0,
      symbol: '💣',
      speed: 12 // 炸彈掉落速度加快
    });
  }, 2500);
}

function draw() {
  background(0);
  image(video, 0, 0, width, height);

  // 顯示生命值
  fill(255);
  textSize(24);
  textAlign(RIGHT, TOP);
  let lifeDisplay = '❤️'.repeat(life);
  text(lifeDisplay, width - 10, 10);

  // 右手控制 paddle
  let leftIndex = null;

  for (let hand of hands) {
    let type = hand.handedness?.toLowerCase();
    let index = hand.keypoints[8];
    if (index && index.x !== undefined) {
      if (type === 'right') {
        // 限制 paddle 只在畫面內移動，不會被拉回中央
        paddleRightX = constrain(index.x, paddleWidth / 2, width - paddleWidth / 2);
      } else if (type === 'left') {
        leftIndex = index;
      }
    }
  }

  // 左手食指軌跡記錄與判斷（只剩愛心）
  if (leftIndex) {
    heartTrace.push({ x: leftIndex.x, y: leftIndex.y });
    if (heartTrace.length > maxTraceLength) {
      heartTrace.shift();
    }

    noFill();
    stroke(255, 100, 200);
    strokeWeight(6);
    beginShape();
    for (let pt of heartTrace) {
      vertex(pt.x, pt.y);
    }
    endShape();
    strokeWeight(1);

    // 偵測愛心形狀，彈出題目
    if (isHeartShape(heartTrace) && heartCooldown <= 0 && !showQuiz) {
      showRandomQuiz();
      heartCooldown = 60; // 防止連續觸發
    }
  } else {
    heartTrace = [];
  }

  // 畫 paddle
  fill(0, 200, 255);
  rectMode(CENTER);
  rect(paddleRightX, height - 30, paddleWidth, paddleHeight);

  // 掉落 emoji 處理
  for (let i = items.length - 1; i >= 0; i--) {
    let it = items[i];
    it.y += it.speed;
    text(it.symbol, it.x, it.y);

    let hit = (
      it.y >= height - 30 - paddleHeight / 2 &&
      it.y <= height - 30 + paddleHeight / 2 &&
      it.x > paddleRightX - paddleWidth / 2 &&
      it.x < paddleRightX + paddleWidth / 2
    );

    if (hit) {
      score += it.score;
      items.splice(i, 1);
    } else if (it.y > height + 30) {
      items.splice(i, 1);
    }
  }

  // 處理炸彈
  for (let i = bombs.length - 1; i >= 0; i--) {
    let b = bombs[i];
    b.y += b.speed;
    text(b.symbol, b.x, b.y);

    let hit = (
      b.y >= height - 30 - paddleHeight / 2 &&
      b.y <= height - 30 + paddleHeight / 2 &&
      b.x > paddleRightX - paddleWidth / 2 &&
      b.x < paddleRightX + paddleWidth / 2
    );

    if (hit) {
      life--;
      bombs.splice(i, 1);
    } else if (b.y > height + 30) {
      bombs.splice(i, 1);
    }
  }

  // 遊戲結束（生命歸零、分數<0 或 分數超過100）
  if (life <= 0 || score < 0) {
    fill(255, 0, 0);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("GAME OVER", width / 2, height / 2);
    fill(255);
    textSize(32);
    text("Score: " + score, width / 2, height / 2 + 60);
    noLoop();
    return;
  } else if (score > 100) {
    fill(0, 200, 0);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("YOU WIN!", width / 2, height / 2);
    fill(255);
    textSize(32);
    text("Score: " + score, width / 2, height / 2 + 60);
    noLoop();
    return;
  }

  // 顯示題目彈窗
  if (showQuiz) {
    drawQuizBox();
    return; // 暫停遊戲畫面
  }

  // 心形 cooldown
  if (heartCooldown > 0) {
    heartCooldown--;
    if (heartCooldown === 0) {
      heartTrace = [];
    }
  }

  // 顯示分數
  fill(255);
  textSize(24);
  textAlign(LEFT, TOP);
  text("Score: " + score, 10, 10);
}

function gotHands(results) {
  hands = results;
}

function addNewItem(emojiList, score, speed) {
  let x = getNonOverlappingX(items.concat(bombs));
  let symbol = random(emojiList);
  items.push({
    x: x,
    y: 0,
    symbol: symbol,
    speed: speed,
    score: score
  });
}

function getNonOverlappingX(existing) {
  let attempts = 0;
  while (attempts < 100) {
    let x = random(30, width - 30);
    let tooClose = existing.some(it => abs(it.x - x) < minSpacing);
    if (!tooClose) return x;
    attempts++;
  }
  return random(30, width - 30); // fallback
}

function isHeartShape(trace) {
  if (trace.length < 30) return false;

  // 1. 判斷是否封閉
  let d = dist(trace[0].x, trace[0].y, trace[trace.length - 1].x, trace[trace.length - 1].y);
  if (d > 50) return false; // 首尾距離要夠近

  // 2. 判斷左右對稱
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let pt of trace) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  let midX = (minX + maxX) / 2;
  let leftCount = 0, rightCount = 0;
  let bottomY = maxY;
  for (let pt of trace) {
    if (pt.y > bottomY - 40) continue; // 忽略底部尖角
    if (pt.x < midX) leftCount++;
    else rightCount++;
  }
  let symmetry = abs(leftCount - rightCount) / (leftCount + rightCount);
  if (symmetry > 0.3) return false; // 左右點數差太多，不像愛心

  // 3. 判斷大小
  if ((maxY - minY) < 50 || (maxX - minX) < 50) return false;

  // 4. 檢查最後幾個點是否停留
  let stay = true;
  let n = 8;
  let last = trace.length - 1;
  for (let i = last - n + 1; i < last; i++) {
    if (i > 0) {
      let dd = dist(trace[i].x, trace[i].y, trace[i + 1].x, trace[i + 1].y);
      if (dd > 5) {
        stay = false;
        break;
      }
    }
  }
  if (!stay) return false;

  return true;
}

// 顯示題目彈窗
function drawQuizBox() {
  fill(255, 255, 255, 230);
  rectMode(CENTER);
  rect(width / 2, height / 2, 400, 220, 20);

  fill(0);
  textSize(22);
  textAlign(CENTER, TOP);
  text("答對才能獲得一顆愛心！", width / 2, height / 2 - 90);

  textSize(20);
  text(quizQuestion, width / 2, height / 2 - 50);

  // 選項
  for (let i = 0; i < quizOptions.length; i++) {
    let y = height / 2 + i * 40;
    fill(quizAnswered && i === quizAnswer ? (quizCorrect ? 'green' : 'red') : '#eee');
    rect(width / 2, y, 220, 32, 8);
    fill(0);
    text(quizOptions[i], width / 2, y - 10);
  }

  // 顯示結果
  if (quizAnswered) {
    fill(quizCorrect ? 'green' : 'red');
    textSize(20);
    text(quizCorrect ? "答對！已獲得愛心" : "答錯，請再接再厲", width / 2, height / 2 + 90);
    textSize(16);
    fill(0);
    text("按任意鍵繼續", width / 2, height / 2 + 120);
  }
}

// 隨機出題
function showRandomQuiz() {
  // 找出還沒出過的題目索引
  let unused = [];
  for (let i = 0; i < quizList.length; i++) {
    if (!quizUsed.includes(i)) unused.push(i);
  }
  let idx;
  if (unused.length > 0) {
    idx = random(unused);
    quizUsed.push(idx);
  } else {
    idx = floor(random(quizList.length)); // 全部都出過就隨機
  }
  let q = quizList[idx];
  quizQuestion = q.q;
  quizOptions = q.options;
  quizAnswer = q.answer;
  showQuiz = true;
  quizAnswered = false;
  quizCorrect = false;
}

// 處理滑鼠點擊選項
function mousePressed() {
  if (showQuiz && !quizAnswered) {
    for (let i = 0; i < quizOptions.length; i++) {
      let y = height / 2 + i * 40;
      if (
        mouseX > width / 2 - 110 && mouseX < width / 2 + 110 &&
        mouseY > y - 16 && mouseY < y + 16
      ) {
        quizAnswered = true;
        quizCorrect = (i === quizAnswer);
        if (quizCorrect) {
          life = min(life + 1, 3);
        }
      }
    }
  }
}

// 按任意鍵關閉題目彈窗
function keyPressed() {
  if (showQuiz && quizAnswered) {
    showQuiz = false;
    heartTrace = [];
  }
}
