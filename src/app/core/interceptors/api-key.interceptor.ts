import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const getApiKey = () => {
  // Allow overriding the API key at runtime (useful for local dev/testing).
  const override = window.localStorage.getItem('API_KEY');
  return override || environment.apiKey;
};

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const apiKey = getApiKey();

  // Skip assets and requests without a configured API key.
  if (!apiKey || req.url.startsWith('/assets')) {
    if (!apiKey) {
      console.warn('[apiKeyInterceptor] No API key configured; skipping auth headers');
    }
    return next(req);
  }

  // WP REST endpoints use cookie-based auth + CORS, so avoid adding custom headers
  // (which would trigger preflight and can cause CORS failures if the server
  // doesn't allow Authorization/x-api-key headers).
  if (req.url.includes('/wp-json/')) {
    return next(req);
  }

  // Some backends accept x-api-key and/or Authorization: Bearer <key>.
  // If your backend requires a different header, set it here.
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
    },
  });

  return next(authReq);
};
