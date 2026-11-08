
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {

    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {

        const verifyToken = async () => {

            const token = localStorage.getItem('boujeeToken');

            if (!token) {
                setIsAuthenticated(false);
                return;
            }

            try {

                const response = await fetch(
                    'http://localhost:5000/api/creator/dashboard',
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error('Authentication failed');
                }

                setIsAuthenticated(true);

            } catch (error) {

                localStorage.removeItem('boujeeToken');
                localStorage.removeItem('boujeeUser');

                setIsAuthenticated(false);
            }
        };

        verifyToken();

    }, []);

    // Wait while the backend verifies the token
    if (isAuthenticated === null) {
        return <p>Verifying your access...</p>;
    }

    // Redirect unauthenticated users to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Allow authenticated creators into the dashboard
    return children;
}

export default ProtectedRoute;
