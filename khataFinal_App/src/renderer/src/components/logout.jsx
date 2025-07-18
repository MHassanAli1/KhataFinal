import { useAuth } from '../hooks/useAuth';
import './logout.css';

export function LogoutButton() {
  const { logout } = useAuth();
  
  return (
    <button className="logout-button" onClick={logout} aria-label="Logout">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z" />
      </svg>
    </button>
  );
}