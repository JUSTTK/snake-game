interface WebSocketMessage {
  type: string;
  data?: any;
}

export class GameAPI {
  private ws: WebSocket | null = null;
  private gameStateCallback: ((message: WebSocketMessage) => void) | null = null;
  private errorCallback: ((message: WebSocketMessage) => void) | null = null;

  connect(roomID: string, playerID: string, playerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 使用后端直接地址连接，而不是前端代理
      const wsURL = `ws://localhost:8081/ws?room_id=${roomID}&player_id=${playerID}&player_name=${playerName}`;
      console.log('Connecting to:', wsURL);
      this.ws = new WebSocket(wsURL);

      this.ws.onopen = () => {
        console.log('Connected to server');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

      // 设置消息处理器
      this.ws.onmessage = (event) => {
        try {
          let data;
          if (event.data instanceof Blob) {
            // 如果是Blob对象，需要先读取
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
                console.error('Error parsing Blob data:', error);
              }
            };
            reader.readAsText(event.data);
            return;
          } else {
            data = event.data;
          }

          const message: WebSocketMessage = JSON.parse(data);
          if (this.gameStateCallback && message.type === 'GAME_STATE') {
            this.gameStateCallback(message);
          }
          if (this.errorCallback && message.type === 'ERROR') {
            this.errorCallback(message);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendMessage(type: string, data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, data };
      this.ws.send(JSON.stringify(message));
    }
  }

  onGameState(callback: (message: WebSocketMessage) => void) {
    this.gameStateCallback = callback;
  }

  onError(callback: (message: WebSocketMessage) => void) {
    this.errorCallback = callback;
  }
}

export const gameAPI = new GameAPI();