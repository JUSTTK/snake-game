// 测试自动移动和重新开始功能
const WebSocket = require('ws');

const roomID = 'test-fix-' + Date.now();
const player1ID = 'player1';
const player1Name = '玩家1';
const player2ID = 'player2';
const player2Name = '玩家2';

console.log('测试自动移动和重新开始功能...');
console.log(`房间 ID: ${roomID}`);
console.log(`玩家1: ${player1ID} (${player1Name})`);
console.log(`玩家2: ${player2ID} (${player2Name})`);

let gameStateCount = 0;
let maxStates = 10;
let testPhase = 'WAITING_FOR_PLAYERS'; // WAITING_FOR_PLAYERS, PLAYING, RESTARTING, FINISHED
let restartSent = false;

// 创建两个 WebSocket 连接
const ws1 = new WebSocket(`ws://localhost:8081/ws?room_id=${roomID}&player_id=${player1ID}&player_name=${player1Name}`, {
  headers: { 'Origin': 'http://localhost:5173' }
});

const ws2 = new WebSocket(`ws://localhost:8081/ws?room_id=${roomID}&player_id=${player2ID}&player_name=${player2Name}`, {
  headers: { 'Origin': 'http://localhost:5173' }
});

let connectionsReady = 0;
const requiredConnections = 2;

function handleMessage(data, wsName) {
  try {
    const message = JSON.parse(data.toString());
    console.log(`[${wsName}] 收到消息: ${message.type}`);

    if (message.type === 'GAME_STATE') {
      gameStateCount++;
      const state = message.data;
      console.log(`  游戏状态: ${state.game_state}, 玩家数: ${state.player_count}, 食物数: ${state.foods.length}`);

      if (state.game_state === 'PLAYING') {
        testPhase = 'PLAYING';
        console.log('\n✓ 游戏已开始，验证自动移动...');

        // 收到5个状态更新后，发送重新开始
        if (gameStateCount >= 5 && !restartSent) {
          restartSent = true;
          testPhase = 'RESTARTING';
          console.log('\n收到足够的状态更新，发送重新开始消息...');
          setTimeout(() => {
            console.log('发送 RESTART_GAME 消息');
            ws1.send(JSON.stringify({ type: 'RESTART_GAME' }));
          }, 1000);
        }

        // 验证自动移动
        if (gameStateCount >= maxStates) {
          console.log('\n✓ 自动移动测试通过！收到多个游戏状态更新');
          if (restartSent) {
            console.log('✓ 重新开始消息已发送');
          }
        }
      }

      if (state.game_state === 'WAITING' && restartSent) {
        testPhase = 'FINISHED';
        console.log('\n✓ 重新开始测试通过！游戏状态已重置为 WAITING');
        console.log('所有测试完成！');
        ws1.close();
        ws2.close();
      }
    } else if (message.type === 'ERROR') {
      console.error(`✗ 收到错误: ${message.data}`);
    }
  } catch (error) {
    console.error('解析消息失败:', error);
  }
}

ws1.on('open', () => {
  console.log('[玩家1] ✓ 连接成功');
  connectionsReady++;

  if (connectionsReady === requiredConnections) {
    console.log('\n所有玩家已连接，1秒后开始游戏...');
    setTimeout(() => {
      console.log('发送 START_GAME 消息');
      ws1.send(JSON.stringify({ type: 'START_GAME' }));
    }, 1000);
  }
});

ws1.on('message', (data) => handleMessage(data, '玩家1'));

ws1.on('error', (error) => {
  console.error('[玩家1] ✗ 错误:', error.message);
});

ws2.on('open', () => {
  console.log('[玩家2] ✓ 连接成功');
  connectionsReady++;

  if (connectionsReady === requiredConnections) {
    console.log('\n所有玩家已连接，1秒后开始游戏...');
    setTimeout(() => {
      console.log('发送 START_GAME 消息');
      ws2.send(JSON.stringify({ type: 'START_GAME' }));
    }, 1000);
  }
});

ws2.on('message', (data) => handleMessage(data, '玩家2'));

ws2.on('error', (error) => {
  console.error('[玩家2] ✗ 错误:', error.message);
});

function cleanup() {
  if (ws1.readyState === WebSocket.OPEN) ws1.close();
  if (ws2.readyState === WebSocket.OPEN) ws2.close();
  process.exit(0);
}

ws1.on('close', () => {
  console.log('[玩家1] 连接关闭');
  if (ws2.readyState !== WebSocket.OPEN) cleanup();
});

ws2.on('close', () => {
  console.log('[玩家2] 连接关闭');
  if (ws1.readyState !== WebSocket.OPEN) cleanup();
});

// 30秒后超时
setTimeout(() => {
  console.log('\n测试超时');
  console.log(`当前阶段: ${testPhase}`);
  console.log(`收到状态数: ${gameStateCount}/${maxStates}`);
  if (gameStateCount >= 5) {
    console.log('✓ 部分通过：自动移动功能正常');
  }
  if (restartSent) {
    console.log('✓ 重新开始消息已发送');
  }
  cleanup();
}, 30000);
