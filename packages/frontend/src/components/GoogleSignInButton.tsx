import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useI18n } from '../i18n';

export default function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        if (credentialResponse.credential) {
          try {
            await loginWithGoogle(credentialResponse.credential);
            navigate('/', { replace: true });
          } catch {
            toast.error(t.google.error);
          }
        }
      }}
      onError={() => {
        toast.error(t.google.error);
      }}
      width="100%"
    />
  );
}
