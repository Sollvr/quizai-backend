import { generateLobbyCode } from '../utils/codeGenerator.js';
import { Lobby } from '../models/Lobby.js';
import supabase from '../config/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

export async function handleCreateLobby(socket, io, lobbies, data) {
  try {
    const code = generateLobbyCode();
    const lobbyId = uuidv4();
    
    const lobby = new Lobby(socket.id, {
      code,
      id: lobbyId,
      ...data,
    });

    // Convert game mode to integer based on type
    const gameModeMap = {
      'synchronized': 1,
      'independent': 2
    };

    // Store lobby in Supabase with correct data types
    const { error } = await supabase.from('lobbies').insert({
      id: lobbyId,
      code: code,
      host_id: socket.id,
      max_players: parseInt(data.maxPlayers) || 8,
      game_mode: gameModeMap[data.gameMode] || 1,
      time_limit: parseInt(data.timeLimit) || 30,
      question_count: parseInt(data.questionCount) || 10,
      topic: data.topic,
      status: 'waiting'
    });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Add host to lobby
    lobby.addPlayer(socket.id, data.username);
    
    // Store host in players table
    const { error: playerError } = await supabase.from('players').insert({
      id: uuidv4(),
      lobby_id: lobbyId,
      username: data.username,
      is_host: true,
      score: 0,
      current_question: 0,
      connected: true
    });

    if (playerError) {
      console.error('Supabase player error:', playerError);
      throw playerError;
    }
    
    // Store in memory
    lobbies.set(code, lobby);
    
    // Join socket room
    socket.join(code);
    
    // Notify client
    socket.emit('lobby-created', {
      code,
      lobbyId,
      players: Array.from(lobby.players.values())
    });
  } catch (error) {
    console.error('Create lobby error:', error);
    socket.emit('error', { message: error.message });
  }
}

export async function handleJoinLobby(socket, io, lobbies, data) {
  const { code, username } = data;
  const lobby = lobbies.get(code);

  try {
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Get lobby ID from Supabase
    const { data: lobbyData, error: lobbyError } = await supabase
      .from('lobbies')
      .select('id')
      .eq('code', code)
      .single();

    if (lobbyError || !lobbyData) {
      throw new Error('Lobby not found in database');
    }

    lobby.addPlayer(socket.id, username);
    
    // Store player in database
    const { error } = await supabase.from('players').insert({
      id: uuidv4(),
      lobby_id: lobbyData.id,
      username: username,
      is_host: false,
      score: 0,
      current_question: 0,
      connected: true
    });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    socket.join(code);
    
    // Notify all players in lobby
    io.to(code).emit('player-joined', {
      players: Array.from(lobby.players.values())
    });

    socket.emit('lobby-joined', {
      code,
      lobbyId: lobbyData.id,
      players: Array.from(lobby.players.values()),
      settings: {
        gameMode: lobby.gameMode,
        timeLimit: lobby.timeLimit,
        questionCount: lobby.questionCount,
        topic: lobby.topic
      }
    });
  } catch (error) {
    console.error('Join lobby error:', error);
    socket.emit('error', { message: error.message });
  }
} 