import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './pages/Layouts/Mainlayout';
import AuthLayout from './pages/Layouts/Authlayout';
import Home from './pages/Home';

import Login from './pages/Login';
import Navbar from './components/Navbar';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Invite from './pages/Invite';
import CustomBattle from './pages/CustomBattle';

function App() {
  return (
    <Router>
      <div className="bg-black min-h-screen text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login/>}/>
          <Route path="signup" element={<Signup/>}/>
          <Route path="dashboard" element={<Dashboard/>}/>
          <Route path="invite" element={<Invite/>}/>
          <Route path="custom-room" element={<CustomBattle/>}/>
        </Routes>
      </div>
    </Router>
  );
}

export default App;