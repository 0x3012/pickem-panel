import { ApplicationConfig, inject, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { apiKeyInterceptor } from './core/interceptors/api-key.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

     provideHttpClient(
      withInterceptors([apiKeyInterceptor]),
    ),

    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const auth = inject(AuthService);

        return () => {
          auth.loadSession();
          auth.startHeartbeat();
        };
      },
    },
  ],
};
