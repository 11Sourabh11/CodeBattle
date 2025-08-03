// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-black text-white px-6 py-4 shadow-md flex justify-between items-center">
      <div className="text-2xl font-bold">CodeClash ⚔️</div>
      <div className="space-x-4">
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        {!isLoggedIn ? (
          <Link
            to="/login"
            className="bg-white text-black px-4 py-2 rounded-full"
          >
            Login
          </Link>
        ) : (
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-full"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
