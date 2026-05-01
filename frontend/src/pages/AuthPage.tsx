import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login, setAuthToken } from '../services/api';
import type { AuthResponse } from '../types';
import './AuthPage.css';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let response: AuthResponse;

      if (mode === 'login') {
        response = await login({ username, password });
      } else {
        response = await register({
          username,
          email,
          password,
          displayName: displayName || undefined,
        });
      }

      setAuthToken(response.token);
      setSuccess(true);

      // Redirect to home after a brief delay
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setError(null);
    setSuccess(false);
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-page__success">
          <div className="auth-page__success-icon">✅</div>
          <h3>
            {mode === 'login' ? 'Logged in successfully!' : 'Account created!'}
          </h3>
          <p>Redirecting to the library…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
      <p className="auth-page__subtitle">
        {mode === 'login'
          ? 'Sign in to manage your tutorials and preferences'
          : 'Register to start adding and managing tutorials'}
      </p>

      <div className="auth-page__tabs">
        <button
          className={`auth-page__tab${mode === 'login' ? ' auth-page__tab--active' : ''}`}
          onClick={() => switchMode('login')}
          type="button"
        >
          Sign In
        </button>
        <button
          className={`auth-page__tab${mode === 'register' ? ' auth-page__tab--active' : ''}`}
          onClick={() => switchMode('register')}
          type="button"
        >
          Register
        </button>
      </div>

      <form className="auth-page__form" onSubmit={handleSubmit}>
        <div className="auth-page__field">
          <label htmlFor="auth-username">Username</label>
          <input
            id="auth-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            placeholder="Your username"
            autoComplete="username"
          />
        </div>

        {mode === 'register' && (
          <div className="auth-page__field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>
        )}

        {mode === 'register' && (
          <div className="auth-page__field">
            <label htmlFor="auth-display-name">Display Name (optional)</label>
            <input
              id="auth-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others see you"
            />
          </div>
        )}

        <div className="auth-page__field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Your password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && <div className="auth-page__error">⚠️ {error}</div>}

        <button
          type="submit"
          className="auth-page__submit"
          disabled={loading}
        >
          {loading
            ? 'Please wait…'
            : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
