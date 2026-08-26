import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Layout } from './components/Layout';
import { ProductsList } from './pages/ProductsList';
import { Inventory } from './pages/Inventory';
import { Categories } from './pages/Categories';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/products" element={<ProductsList />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
