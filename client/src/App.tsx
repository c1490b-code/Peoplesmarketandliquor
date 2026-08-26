import { Routes, Route } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-2xl font-bold text-gray-900">Peoples Market & Liquor</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<div>Welcome to Peoples Market & Liquor POS</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
