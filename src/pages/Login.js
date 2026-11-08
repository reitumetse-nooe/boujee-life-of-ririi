
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setLoading(true);

    try {

      // Send login details to our backend
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const data = await response.json();

      // Check whether login was successful
      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      // Only creator accounts can enter the Creator Dashboard
      if (data.user.role !== 'creator') {
        throw new Error('Access denied. Creator account required.');
      }

      // Save the authentication token
      localStorage.setItem('boujeeToken', data.token);

      // Save creator information
      localStorage.setItem('boujeeUser', JSON.stringify(data.user));

      // Open the Creator Dashboard
      navigate('/dashboard');

    } catch (error) {

      setErrorMessage(
        error.message === 'Failed to fetch'
          ? 'Cannot connect to the server. Please check that your backend is running.'
          : error.message
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        <h1>BOUJEE LIFE OF RIRII</h1>

        <p>CREATOR STUDIO</p>

        <h2>Welcome Back</h2>

        <p>Sign in to manage your content and stories.</p>

        <form onSubmit={handleLogin}>

          <div>
            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {errorMessage && (
            <p className="login-error">
              {errorMessage}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>

        </form>

        <Link to="/">Return to Website</Link>

      </div>

    </div>
  );
}

export default Login;
