import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Layout } from './components/Layout';
import { POS } from './pages/POS';
import { ProductsList } from './pages/ProductsList';
import { Inventory } from './pages/Inventory';
import { Categories } from './pages/Categories';
import { CustomersList } from './pages/CustomersList';
import { CustomerDetail } from './pages/CustomerDetail';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/products" element={<ProductsList />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/customers" element={<CustomersList />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
