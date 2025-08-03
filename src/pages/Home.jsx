// src/pages/Home.jsx
import { motion } from "framer-motion";

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex items-center justify-center px-4 relative overflow-hidden">
      
      {/* Optional top-left logo/nav */}
      <nav className="absolute top-6 left-6 text-lg font-bold">
        <span className="text-pink-500">⚡</span> CodeClash
      </nav>

      {/* Animated container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center space-y-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-10 shadow-2xl max-w-xl"
      >
        {/* Heading with gradient */}
        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">
          CodeClash Arena ⚔️
        </h1>

        {/* Subheading */}
        <p className="text-gray-300 text-lg md:text-xl">
          Real-time coding battles. Compete. Learn. Win.
        </p>

        {/* Call to Action */}
        <button className="mt-4 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full shadow-lg hover:scale-105 transition-transform duration-300">
          Join the Battle →
        </button>
      </motion.div>
    </div>
  );
}

export default Home;
