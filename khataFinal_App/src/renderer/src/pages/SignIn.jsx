import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import { Eye, EyeOff, User, Lock, Shield } from 'lucide-react';

export default function SignIn() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <style jsx>{`
        .admin-login-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .background-pattern {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
          animation: pulse 6s ease-in-out infinite;
        }

        .admin-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 3rem 2.5rem;
          width: 100%;
          max-width: 420px;
          position: relative;
          box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .admin-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .admin-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 4rem;
          height: 4rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
        }

        .admin-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.025em;
        }

        .admin-subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .input-wrapper {
          position: relative;
          transition: transform 0.2s ease;
        }

        .input-wrapper:focus-within {
          transform: translateY(-1px);
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          z-index: 1;
        }

        .admin-input {
          width: 100%;
          height: 3.5rem;
          padding: 0 1rem 0 3rem;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          color: #1e293b;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .admin-input::placeholder {
          color: #94a3b8;
        }

        .admin-input:focus {
          outline: none;
          border-color: #6366f1;
          background: white;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .password-toggle:hover {
          color: #6366f1;
          background: #f1f5f9;
        }

        .admin-button {
          width: 100%;
          height: 3.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .admin-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.5);
          background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%);
        }

        .admin-button:active {
          transform: translateY(0);
        }

        .admin-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.9;
          }
        }

        @media (max-width: 480px) {
          .admin-card {
            padding: 2rem 1.5rem;
            margin: 1rem;
          }

          .admin-title {
            font-size: 1.75rem;
          }
        }
      `}</style>

      <div className="admin-login-container">
        <div className="background-pattern"></div>

        <div className="admin-card">
          <div className="admin-header">
            <div className="admin-icon">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="admin-title">Sign In</h2>
            <p className="admin-subtitle">کھاتہ منیجمنٹ سسٹم میں داخل ہوں</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-wrapper">
                <div className="input-icon">
                  <User className="w-5 h-5" />
                </div>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  className="admin-input"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <div className="input-icon">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="admin-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" className="admin-button">
              Login
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
