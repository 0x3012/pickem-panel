import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {

   if (!environment.apiKey || req.url.startsWith('/assets')) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${environment.apiKey}`,
    },
  });

  return next(authReq);
};
