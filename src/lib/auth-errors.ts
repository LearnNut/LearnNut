import { isAuthError } from '@supabase/supabase-js';

export type AuthAction = 'sign-in' | 'sign-up' | 'sign-out';

export function getFriendlyAuthError(error: unknown, action: AuthAction) {
  const code = isAuthError(error) ? error.code : undefined;

  switch (code) {
    case 'invalid_credentials':
      return 'That email and password combination didn’t work. Please try again.';
    case 'email_not_confirmed':
      return 'Please confirm your email before signing in.';
    case 'email_address_invalid':
      return 'Enter a valid email address.';
    case 'weak_password':
      return 'Choose a stronger password and try again.';
    case 'email_exists':
    case 'user_already_exists':
      return 'We couldn’t create that account. Try signing in, or use a different email.';
    case 'signup_disabled':
    case 'email_provider_disabled':
    case 'provider_disabled':
      return 'Account creation isn’t available just now. Please try again later.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'There have been too many attempts. Please wait a little and try again.';
    case 'request_timeout':
      return 'The request took too long. Check your connection and try again.';
    default:
      if (action === 'sign-out') {
        return 'We couldn’t sign you out just now. Please try again.';
      }

      return 'We couldn’t connect to LearnNut just now. Check your connection and try again.';
  }
}
