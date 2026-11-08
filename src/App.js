
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import HomePage from './pages/HomePage';
import ViewerPortal from './pages/ViewerPortal';
import CategoryPage from './pages/CategoryPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* PUBLIC HOMEPAGE */}
                <Route path="/" element={<HomePage />} />

                {/* PUBLIC VIEWER PORTAL */}
                <Route path="/viewer" element={<ViewerPortal />} />

                {/* CATEGORY GALLERIES */}
                <Route path="/category/:category" element={<CategoryPage />} />

                {/* CREATOR LOGIN */}
                <Route path="/login" element={<Login />} />

                {/* PROTECTED CREATOR DASHBOARD */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
