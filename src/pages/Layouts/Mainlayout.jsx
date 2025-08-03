// src/layouts/MainLayout.jsx
import Navbar from "../../components/Navbar";
import { Outlet } from 'react-router-dom';

function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

export default MainLayout;
