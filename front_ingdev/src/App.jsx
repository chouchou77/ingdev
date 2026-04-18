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
        <div className="flex min-h-screen bg-slate-50">
          <Navbar />
          <div className="flex-1 h-screen overflow-y-auto custom-scrollbar">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<Map />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/prediction" element={<Prediction />} />
            </Routes>
          </div>
        </div>
      </Router>
    </>
  )
}

export default App
