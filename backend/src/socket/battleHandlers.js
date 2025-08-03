import Room from '../models/Room.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { executeCode } from '../utils/codeExecutor.js';

const battleHandlers = (socket, io) => {

  // Submit code during battle
  socket.on('battle:submit', async (data) => {
    try {
      const { roomId, code, language } = data;
      const userId = socket.userId;
      const user = socket.user;

      const room = await Room.findOne({ roomId })
        .populate('problem', 'testCases timeLimit memoryLimit');

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isParticipant(userId)) {
        return socket.emit('error', { message: 'Not authorized for this room' });
      }

      if (room.status !== 'in_progress') {
        return socket.emit('error', { message: 'Battle is not in progress' });
      }

      // Check if battle time is up
      const timeElapsed = (Date.now() - room.battle.startedAt) / 1000 / 60; // minutes
      if (timeElapsed > room.settings.timeLimit) {
        return socket.emit('error', { message: 'Battle time is up' });
      }

      // Execute code against test cases
      socket.emit('submission:processing', { 
        message: 'Testing your code...' 
      });

      const testResults = await executeCode(
        code, 
        language, 
        room.problem.testCases,
        {
          timeLimit: room.problem.timeLimit,
          memoryLimit: room.problem.memoryLimit
        }
      );

      // Calculate score
      const passedTests = testResults.filter(result => result.passed).length;
      const totalTests = testResults.length;
      const score = Math.round((passedTests / totalTests) * 100);

      // Find participant and update submission
      const participant = room.participants.find(p => 
        p.user.toString() === userId.toString()
      );

      if (participant) {
        // Update participant's submission
        participant.lastSubmission = {
          code,
          language,
          submittedAt: new Date(),
          testResults,
          score,
          status: 'completed'
        };

        // Update current code
        participant.currentCode = code;
        
        await room.save();
      }

      // Emit submission result to user
      socket.emit('submission:result', {
        score,
        passedTests,
        totalTests,
        testResults: testResults.map(result => ({
          passed: result.passed,
          executionTime: result.executionTime,
          // Don't send full test case details for security
          input: result.input ? result.input.substring(0, 100) : '',
          expectedOutput: result.expectedOutput ? result.expectedOutput.substring(0, 100) : '',
          actualOutput: result.actualOutput ? result.actualOutput.substring(0, 100) : '',
          error: result.error
        }))
      });

      // Broadcast submission to other participants
      socket.to(`room:${roomId}`).emit('battle:submission', {
        userId,
        username: user.username,
        score,
        passedTests,
        totalTests,
        submittedAt: new Date()
      });

      // Check if this is a perfect solution
      if (score === 100) {
        // End battle if someone gets 100% and it's been at least 1 minute
        const battleTimeMinutes = (Date.now() - room.battle.startedAt) / 1000 / 60;
        if (battleTimeMinutes >= 1) {
          setTimeout(() => endBattle(roomId, io), 10000); // 10 second grace period
        }
      }

    } catch (error) {
      console.error('Battle submit error:', error);
      socket.emit('error', { 
        message: 'Code submission failed',
        details: error.message 
      });
    }
  });

  // Force end battle (admin/host only)
  socket.on('battle:force-end', async (data) => {
    try {
      const { roomId } = data;
      const userId = socket.userId;

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isHost(userId)) {
        return socket.emit('error', { message: 'Only host can force end battle' });
      }

      await endBattle(roomId, io);

    } catch (error) {
      console.error('Force end battle error:', error);
      socket.emit('error', { 
        message: 'Failed to end battle',
        details: error.message 
      });
    }
  });

  // Get battle status
  socket.on('battle:status', async (data) => {
    try {
      const { roomId } = data;
      const userId = socket.userId;

      const room = await Room.findOne({ roomId })
        .populate('participants.user', 'username avatar')
        .populate('problem', 'title difficulty timeLimit');

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isParticipant(userId) && !room.spectators.includes(userId)) {
        return socket.emit('error', { message: 'Not authorized to view this battle' });
      }

      // Calculate time remaining
      let timeRemaining = 0;
      if (room.status === 'in_progress' && room.battle.startedAt) {
        const timeElapsed = (Date.now() - room.battle.startedAt) / 1000 / 60; // minutes
        timeRemaining = Math.max(0, room.settings.timeLimit - timeElapsed);
      }

      // Get participant scores
      const participants = room.participants.map(p => ({
        user: p.user,
        score: p.lastSubmission ? p.lastSubmission.score : 0,
        submissionCount: p.lastSubmission ? 1 : 0,
        lastSubmittedAt: p.lastSubmission ? p.lastSubmission.submittedAt : null
      }));

      socket.emit('battle:status', {
        status: room.status,
        timeRemaining,
        participants,
        problem: room.problem ? {
          title: room.problem.title,
          difficulty: room.problem.difficulty
        } : null,
        startedAt: room.battle.startedAt,
        settings: room.settings
      });

    } catch (error) {
      console.error('Get battle status error:', error);
      socket.emit('error', { 
        message: 'Failed to get battle status',
        details: error.message 
      });
    }
  });

  // Join as spectator
  socket.on('battle:spectate', async (data) => {
    try {
      const { roomId } = data;
      const userId = socket.userId;

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.settings.allowSpectators) {
        return socket.emit('error', { message: 'Spectators not allowed in this room' });
      }

      if (room.isParticipant(userId)) {
        return socket.emit('error', { message: 'You are already a participant' });
      }

      // Add as spectator
      if (!room.spectators.includes(userId)) {
        room.spectators.push(userId);
        await room.save();
      }

      // Join socket room
      socket.join(`room:${roomId}`);

      socket.emit('battle:spectating', {
        message: 'Now spectating this battle',
        roomId
      });

      // Broadcast new spectator
      socket.to(`room:${roomId}`).emit('battle:spectator-joined', {
        userId,
        username: socket.user.username
      });

    } catch (error) {
      console.error('Battle spectate error:', error);
      socket.emit('error', { 
        message: 'Failed to join as spectator',
        details: error.message 
      });
    }
  });

  // Get live code (for spectators)
  socket.on('battle:get-live-code', async (data) => {
    try {
      const { roomId, targetUserId } = data;
      const userId = socket.userId;

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      // Check if user can view live code (spectator or participant)
      if (!room.isParticipant(userId) && !room.spectators.includes(userId)) {
        return socket.emit('error', { message: 'Not authorized to view live code' });
      }

      // Find target participant
      const participant = room.participants.find(p => 
        p.user.toString() === targetUserId
      );

      if (!participant) {
        return socket.emit('error', { message: 'Participant not found' });
      }

      socket.emit('battle:live-code', {
        userId: targetUserId,
        code: participant.currentCode || '',
        lastUpdated: participant.lastSubmission ? 
          participant.lastSubmission.submittedAt : null
      });

    } catch (error) {
      console.error('Get live code error:', error);
      socket.emit('error', { 
        message: 'Failed to get live code',
        details: error.message 
      });
    }
  });
};

// Helper function to end battle
async function endBattle(roomId, io) {
  try {
    const room = await Room.findOne({ roomId })
      .populate('participants.user', 'username avatar statistics')
      .populate('problem', 'title difficulty slug');

    if (!room || room.status !== 'in_progress') {
      return;
    }

    // Calculate final results
    const results = room.participants.map(p => {
      const submission = p.lastSubmission;
      return {
        user: p.user._id,
        finalScore: submission ? submission.score : 0,
        timeSpent: room.battle.startedAt ? 
          Math.round((Date.now() - room.battle.startedAt) / 1000) : 0,
        submissionCount: submission ? 1 : 0,
        correctTests: submission ? 
          submission.testResults.filter(t => t.passed).length : 0,
        totalTests: submission ? submission.testResults.length : 0
      };
    });

    // End the battle
    room.endBattle(results);
    room.calculateRankings && room.calculateRankings();
    await room.save();

    // Create match record
    const match = new Match({
      matchId: `match_${roomId}_${Date.now()}`,
      room: room._id,
      problem: room.problem._id,
      participants: results.map(r => ({
        user: r.user,
        finalScore: r.finalScore,
        timeSpent: r.timeSpent,
        submissionCount: r.submissionCount,
        correctTestCases: r.correctTests,
        totalTestCases: r.totalTests,
        rank: results.findIndex(res => res.user.toString() === r.user.toString()) + 1
      })),
      settings: room.settings,
      battle: {
        startedAt: room.battle.startedAt,
        endedAt: room.battle.endedAt,
        duration: room.battle.duration,
        winner: room.battle.winner,
        status: 'completed'
      }
    });

    await match.save();

    // Update user statistics
    for (const participant of room.participants) {
      const user = await User.findById(participant.user._id);
      const result = results.find(r => r.user.toString() === user._id.toString());
      
      if (user && result) {
        const isWinner = room.battle.winner && 
          room.battle.winner.toString() === user._id.toString();
        
        user.updateStats(
          isWinner ? 'win' : 'loss',
          result.timeSpent,
          room.settings.difficulty
        );
        
        await user.save();
      }
    }

    // Emit battle end to all participants
    io.to(`room:${roomId}`).emit('battle:ended', {
      results: results.map((r, index) => ({
        ...r,
        user: room.participants.find(p => 
          p.user._id.toString() === r.user.toString()
        ).user,
        rank: index + 1
      })),
      winner: room.battle.winner,
      duration: room.battle.duration,
      match: match.getSummary()
    });

    console.log(`Battle ended in room ${roomId}`);

  } catch (error) {
    console.error('End battle error:', error);
  }
}

export default battleHandlers;