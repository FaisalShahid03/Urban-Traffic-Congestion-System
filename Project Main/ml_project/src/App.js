// src/App.js
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import RealTime from "./pages/RealTime";
import Forecast from "./pages/Forecast";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/realtime" element={<RealTime />} />
        <Route path="/forecast" element={<Forecast />} />
      </Routes>
    </Router>
  );
}

export default App;
