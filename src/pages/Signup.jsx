// src/pages/Signup.jsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black text-white px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-md shadow-xl border border-white/10 space-y-6"
      >
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 text-transparent bg-clip-text">
          Join the Arena!
        </h2>

        <form className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm">Username</label>
            <input
              type="text"
              placeholder="Choose a username"
              className="w-full px-4 py-2 mt-1 rounded-md bg-gray-900 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full px-4 py-2 mt-1 rounded-md bg-gray-900 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm">Password</label>
            <input
              type="password"
              placeholder="Create a strong password"
              className="w-full px-4 py-2 mt-1 rounded-md bg-gray-900 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105 transition-transform duration-300 text-white font-semibold rounded-full"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-pink-400 hover:underline">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default Signup;
