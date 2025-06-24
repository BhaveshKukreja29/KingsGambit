// client/src/App.jsx
import React from 'react';
import { Routes, Route, Outlet, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MatchPage from './pages/MatchPage';

function App() {
  return (
    <div className="App">
      <header>
        <h1>King's Gambit Project</h1>
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/match/123">Match 123</Link></li>
          </ul>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/match/:id" element={<MatchPage />} />
        </Routes>
        <Outlet /> {/* This is where nested routes will render */}
      </main>
      <footer>
        <p>&copy; 2025 King's Gambit</p>
      </footer>
    </div>
  );
}

export default App;