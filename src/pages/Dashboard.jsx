// src/pages/Dashboard.jsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white px-6 py-10">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-pink-500">⚔️ CodeClash Dashboard</h1>
    
      </header>

      {/* Main content layout */}
      <div className="grid lg:grid-cols-4 gap-8">
        
        {/* Left Panel (Battle Options) */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-3 space-y-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-purple-300 mb-4">🔥 Battle Options</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Join Battle */}
              <Link to="/battle" className="bg-white/5 hover:bg-white/10 p-5 rounded-xl border border-white/10 transition shadow">
                <h3 className="text-xl font-semibold text-purple-400">Join Public Battle</h3>
                <p className="text-gray-400 mt-1 text-sm">Jump into a live coding challenge with a random opponent.</p>
              </Link>

              {/* Invite Friend */}
              <Link to="/invite" className="bg-white/5 hover:bg-white/10 p-5 rounded-xl border border-white/10 transition shadow">
                <h3 className="text-xl font-semibold text-blue-400">Invite a Friend</h3>
                <p className="text-gray-400 mt-1 text-sm">Send a room code to battle your friend in real-time.</p>
              </Link>

              {/* Custom Room */}
              <Link to="/custom-room" className="bg-white/5 hover:bg-white/10 p-5 rounded-xl border border-white/10 transition shadow">
                <h3 className="text-xl font-semibold text-green-400">Create Custom Room</h3>
                <p className="text-gray-400 mt-1 text-sm">Select difficulty, language, and host your own battle.</p>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Right Panel (Stats Section) */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Leaderboard */}
          <Link to="/leaderboard" className="block bg-white/5 hover:bg-white/10 p-6 rounded-xl border border-white/10 transition shadow">
            <h2 className="text-xl font-semibold text-yellow-400">🏆 Leaderboard</h2>
            <p className="text-gray-400 mt-1 text-sm">See top coders and track your rank.</p>
          </Link>

          {/* Match History */}
          <Link to="/matches" className="block bg-white/5 hover:bg-white/10 p-6 rounded-xl border border-white/10 transition shadow">
            <h2 className="text-xl font-semibold text-pink-400">📜 Recent Matches</h2>
            <p className="text-gray-400 mt-1 text-sm">View your past battles and performance.</p>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;
