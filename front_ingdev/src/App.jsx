import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Map from './pages/Map'
import Simulation from './pages/Simulation'
import Prediction from './pages/Prediction'

import Navbar from './components/Navbar'

function App() {

  return (
    <>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<Map />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/prediction" element={<Prediction />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
