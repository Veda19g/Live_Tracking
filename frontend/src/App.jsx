import React from 'react'
import Tracking from './components/Tracking'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Tracking />} />
      </Routes>
    </Router>
  )
}

export default App
