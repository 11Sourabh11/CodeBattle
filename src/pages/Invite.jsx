// src/pages/Invite.jsx
import { useState } from "react";
import { motion } from "framer-motion";

function Invite() {
  const [roomCode] = useState(generateRoomCode());

  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g. "F7X2LQ"
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    alert("Room code copied!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white px-6 py-12 flex flex-col items-center">
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-10 shadow-xl max-w-lg w-full text-center"
      >
        <h1 className="text-3xl font-bold text-blue-400 mb-4">🎯 Invite a Friend</h1>
        <p className="text-gray-300 mb-6">
          Share this code with your friend to join a private coding battle.
        </p>

        <div className="bg-white/10 text-2xl font-mono tracking-widest py-4 px-6 rounded-lg mb-4 border border-white/10">
          {roomCode}
        </div>

        <button
          onClick={handleCopy}
          className="mb-6 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:scale-105 transition-transform"
        >
          Copy Room Code
        </button>

        <p className="text-gray-400 text-sm mb-4">
          Waiting for your friend to join...
        </p>

        <button className="mt-2 px-6 py-2 bg-green-500 hover:bg-green-600 transition rounded-full font-medium text-white">
          Start Battle
        </button>
      </motion.div>
    </div>
  );
}

export default Invite;
