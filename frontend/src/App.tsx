import { useState } from 'react'
import './App.scss'
import Home from './pages/Home'
import Header from './components/Header'
import Footer from './components/Footer'
import { Routes, Route } from 'react-router-dom';
import RecipeList from './pages/RecipeList'
import RecipeDetails from './pages/RecipeDetails'
import EditRecipe from './pages/EditRecipe'
import Login from './pages/Login'
import Registration from './pages/Registration'
import RequireAuth from './components/Auth/RequireAuth';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Header />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/recipe-list/' element={<RecipeList />} />
        <Route path='/recipe-details/:id' element={<RecipeDetails />} />
        <Route path='/login/' element={<Login />} />
        <Route path='/registration/' element={<Registration />} />

        {/* protected routes */}
        <Route element={<RequireAuth />}>
          <Route path='/new-recipe/' element={<EditRecipe />} />
        </Route>
      </Routes>
      <Footer />
    </>
  )
}

export default App
