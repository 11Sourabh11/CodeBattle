// src/layouts/AuthLayout.jsx
import { Outlet } from 'react-router-dom';

function AuthLayout({ children }) {

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center text-white">
      {children}
    </div>
  );
}

export default AuthLayout;
