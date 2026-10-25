import { Outlet, useLocation } from 'react-router-dom';
import './App.scss';
import Header from './components/Header';
import Home from './pages/Home';

function App() {
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
        {/* <Footer /> */}
    </>
  )
}

export default App