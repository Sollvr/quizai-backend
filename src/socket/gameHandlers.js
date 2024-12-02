import { Game } from '../models/Game.js';
import supabase from '../config/supabaseClient.js';

export async function handleStartGame(socket, io, lobbies, code) {
  const lobby = lobbies.get(code);
  
  if (!lobby || !lobby.isHost(socket.id)) {
    socket.emit('error', { message: 'Unauthorized or invalid lobby' });
    return;
  }

  try {
    // Create new game instance
    const game = new Game(lobby);
    
    // Update lobby status in database
    await supabase
      .from('lobbies')
      .update({ status: 'in_progress', started_at: new Date() })
      .eq('code', code);

    // Store game instance
    lobbies.set(code, game);

    // Start first round
    const question = game.startRound();
    
    // Notify all players
    io.to(code).emit('game-started', {
      question,
      timeLimit: game.timeLimit,
      totalQuestions: game.questions.length
    });
  } catch (error) {
    socket.emit('error', { message: error.message });
  }
}

export async function handleSubmitAnswer(socket, io, lobbies, data) {
  const { code, answer } = data;
  const game = lobbies.get(code);

  if (!game || game.status !== 'in_progress') {
    socket.emit('error', { message: 'Invalid game state' });
    return;
  }

  try {
    // Process answer
    const result = game.submitAnswer(socket.id, answer);
    
    // Store answer in database
    await supabase.from('answers').insert({
      player_id: socket.id,
      question_id: game.getCurrentQuestion().id,
      answer_text: answer,
      is_correct: result.isCorrect,
      points_awarded: result.points,
      time_taken: game.answers.get(socket.id).timeElapsed
    });

    // Send result to player
    socket.emit('answer-result', result);

    // Update all players with new leaderboard
    io.to(code).emit('leaderboard-update', {
      leaderboard: game.getLeaderboard()
    });

    // Check if round is complete
    if (game.isRoundComplete()) {
      // Send round results to all players
      io.to(code).emit('round-complete', {
        results: game.getRoundResults(),
        leaderboard: game.getLeaderboard()
      });

      // Check if there are more questions
      if (game.canAdvance()) {
        // Wait for 5 seconds before starting next round
        setTimeout(() => {
          game.advanceQuestion();
          const question = game.startRound();
          io.to(code).emit('next-question', {
            question,
            questionNumber: game.currentQuestionIndex + 1
          });
        }, 5000);
      } else {
        // Game is complete
        game.status = 'completed';
        await supabase
          .from('lobbies')
          .update({ 
            status: 'completed',
            completed_at: new Date()
          })
          .eq('code', code);

        io.to(code).emit('game-complete', {
          finalLeaderboard: game.getLeaderboard()
        });
      }
    }
  } catch (error) {
    socket.emit('error', { message: error.message });
  }
} 