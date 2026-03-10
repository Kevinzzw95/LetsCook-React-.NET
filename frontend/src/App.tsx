import { useState } from 'react'
import './App.scss'
import Header from './components/Header'
import Footer from './components/Footer'
import {  Outlet, useLocation } from 'react-router-dom';
import Home from './pages/Home';

function App() {
  const [count, setCount] = useState(0);
  const location = useLocation();

  return (
    <>
        <Header />
        {
            location.pathname === '/' ? (
                <Home />
            ) : (
                <Outlet />
            )
        }
        <Footer />
    </>
  )
}

export default App