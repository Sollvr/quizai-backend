export class Lobby {
  public code: string;
  private hostId: string;
  private players: Map<string, string>; // socketId -> username
  private readonly MAX_PLAYERS = 8;

  constructor(code: string, hostId: string, hostUsername: string) {
    this.code = code;
    this.hostId = hostId;
    this.players = new Map();
    this.players.set(hostId, hostUsername);
  }

  public addPlayer(socketId: string, username: string): boolean {
    if (this.isFull() || this.hasPlayer(username)) {
      return false;
    }
    this.players.set(socketId, username);
    return true;
  }

  public removePlayer(socketId: string): void {
    this.players.delete(socketId);
  }

  public getPlayers(): { id: string; username: string }[] {
    return Array.from(this.players.entries()).map(([id, username]) => ({
      id,
      username,
      isHost: id === this.hostId
    }));
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public isFull(): boolean {
    return this.players.size >= this.MAX_PLAYERS;
  }

  public hasPlayer(username: string): boolean {
    return Array.from(this.players.values()).includes(username);
  }

  public isHost(socketId: string): boolean {
    return socketId === this.hostId;
  }
}
