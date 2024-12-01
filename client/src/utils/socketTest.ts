import { io, Socket } from 'socket.io-client';

export class SocketTester {
  private socket: Socket;
  
  constructor() {
    this.socket = io('http://localhost:5000', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      withCredentials: true,
      forceNew: true,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    this.socket.on('connect_timeout', () => {
      console.error('Connection timeout');
    });

    // Game-specific event handlers
    this.socket.on('lobby-created', (data) => {
      console.log('Lobby created:', data);
    });

    this.socket.on('player-joined', (data) => {
      console.log('Player joined:', data);
    });
  }

  public connect(): void {
    this.socket.connect();
  }

  public disconnect(): void {
    this.socket.disconnect();
  }

  public async testPing(): Promise<void> {
    try {
      const response = await this.socket.emitWithAck('ping');
      console.log('Ping response:', response);
      return response;
    } catch (error) {
      console.error('Ping error:', error);
      throw error;
    }
  }

  public async createLobby(username: string): Promise<void> {
    this.socket.emit('create-lobby', { username });
  }
}

// Test runner function
export async function runSocketTests() {
  const tester = new SocketTester();
  
  console.log('Starting Socket.IO connection tests...');
  
  // Test connection
  tester.connect();
  
  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test ping/pong
  await tester.testPing();
  
  // Test lobby creation
  await tester.createLobby('TestUser');
  
  // Keep connection open for a while to observe events
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Cleanup
  tester.disconnect();
}
