import { AlertCircle } from 'lucide-react';

export default function AuthFieldError({ message }) {
  if (!message) return null;

  return (
    <div className="auth-field-error" role="alert">
      <span className="auth-field-error-icon">
        <AlertCircle size={17} />
      </span>
      <span>{message}</span>
    </div>
  );
}
