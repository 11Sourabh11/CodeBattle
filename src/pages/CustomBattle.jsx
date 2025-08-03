// src/pages/CustomBattle.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function CustomBattle() {
  const [difficulty, setDifficulty] = useState("easy");
  const [language, setLanguage] = useState("javascript");
  const [timeLimit, setTimeLimit] = useState(15);
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    // You can send these settings to your backend/socket here
    const roomSettings = { difficulty, language, timeLimit };
    console.log("Creating custom room with:", roomSettings);

    // Navigate to room (you'll replace this with actual room ID later)
    navigate("/battle-room");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white px-6 py-12 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-10 shadow-xl w-full max-w-xl"
      >
        <h1 className="text-3xl font-bold text-green-400 mb-6 text-center">⚙️ Create Custom Battle</h1>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-medium">Select Difficulty</label>
          <select
            className="w-full bg-white/10 border border-white/10 rounded px-4 py-2 text-white"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">🟢 Easy</option>
            <option value="medium">🟡 Medium</option>
            <option value="hard">🔴 Hard</option>
          </select>
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-medium">Select Language</label>
          <select
            className="w-full bg-white/10 border border-white/10 rounded px-4 py-2 text-white"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </div>

        {/* Time Limit Selection */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-medium">Time Limit (minutes)</label>
          <input
            type="number"
            min={5}
            max={60}
            step={5}
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded px-4 py-2 text-white"
          />
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateRoom}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full font-semibold hover:scale-105 transition-transform"
        >
          🚀 Create Battle Room
        </button>
      </motion.div>
    </div>
  );
}

export default CustomBattle;
