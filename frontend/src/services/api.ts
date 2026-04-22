interface WebSocketMessage {
  type: string;
  data?: any;
}

export class GameAPI {
  private ws: WebSocket | null = null;
  private gameStateCallback: ((message: WebSocketMessage) => void) | null = null;
  private errorCallback: ((message: WebSocketMessage) => void) | null = null;
  private connectionStateCallback: ((connected: boolean) => void) | null = null;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: number | null = null;
  private shouldReconnect = false;

  private currentRoomID = '';
  private currentPlayerID = '';
  private currentPlayerName = '';

  private heartbeatInterval: number | null = null;
  private heartbeatTimeout: number | null = null;
  private heartbeatIntervalTime = 30000;
  private heartbeatTimeoutTime = 35000;

  connect(roomID: string, playerID: string, playerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentRoomID = roomID;
      this.currentPlayerID = playerID;
      this.currentPlayerName = playerName;
      this.shouldReconnect = true;

      const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws';
      const wsURL = `${wsBaseUrl}?room_id=${roomID}&player_id=${playerID}&player_name=${playerName}`;
      console.log('正在连接 WebSocket:', wsURL);
      this.ws = new WebSocket(wsURL);

      this.ws.onopen = () => {
        console.log('WebSocket 已连接');
        this.reconnectAttempts = 0;
        this.notifyConnectionState(true);
        this.startHeartbeat();
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket 已关闭:', event.code, event.reason);
        this.stopHeartbeat();
        this.notifyConnectionState(false);

        if (this.shouldReconnect && event.code !== 1000) {
          this.attemptReconnect();
        }
      };

      this.ws.onmessage = (event) => {
        this.resetHeartbeatTimeout();

        try {
          let rawData;
          if (event.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const message: WebSocketMessage = JSON.parse(reader.result as string);
                if (this.gameStateCallback && message.type === 'GAME_STATE') {
                  this.gameStateCallback(message);
                }
                if (this.errorCallback && message.type === 'ERROR') {
                  this.errorCallback(message);
                }
              } catch (error) {
                console.error('解析 Blob 消息失败:', error);
              }
            };
            reader.readAsText(event.data);
            return;
          } else {
            rawData = event.data;
          }

          const message: WebSocketMessage = JSON.parse(rawData);
          if (this.gameStateCallback && message.type === 'GAME_STATE') {
            this.gameStateCallback(message);
          }
          if (this.errorCallback && message.type === 'ERROR') {
            this.errorCallback(message);
          }
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      };
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('重连次数已达上限');
      this.shouldReconnect = false;
      if (this.errorCallback) {
        this.errorCallback({
          type: 'ERROR',
          data: '连接失败，请刷新页面后重试。',
        });
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(
      `将在 ${delay}ms 后进行第 ${this.reconnectAttempts}/${this.maxReconnectAttempts} 次重连`
    );

    this.reconnectTimer = window.setTimeout(() => {
      console.log('正在尝试重新连接...');
      this.connect(this.currentRoomID, this.currentPlayerID, this.currentPlayerName)
        .then(() => {
          console.log('重新连接成功');
        })
        .catch((error) => {
          console.error('重新连接失败:', error);
          this.attemptReconnect();
        });
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage('PING');
      }
    }, this.heartbeatIntervalTime);

    this.resetHeartbeatTimeout();
  }

  private resetHeartbeatTimeout() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }

    this.heartbeatTimeout = window.setTimeout(() => {
      console.warn('心跳超时，连接可能已经中断');
      if (this.ws) {
        this.ws.close();
      }
    }, this.heartbeatTimeoutTime);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private notifyConnectionState(connected: boolean) {
    if (this.connectionStateCallback) {
      this.connectionStateCallback(connected);
    }
  }

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, '用户主动断开连接');
      this.ws = null;
    }

    this.notifyConnectionState(false);
  }

  sendMessage(type: string, data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, data };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('发送消息失败：WebSocket 尚未连接');
    }
  }

  onGameState(callback: (message: WebSocketMessage) => void) {
    this.gameStateCallback = callback;
  }

  onError(callback: (message: WebSocketMessage) => void) {
    this.errorCallback = callback;
  }

  onConnectionStateChange(callback: (connected: boolean) => void) {
    this.connectionStateCallback = callback;
  }
}

export const gameAPI = new GameAPI();
