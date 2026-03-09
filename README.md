# Pickem Panel

This repository contains the front-end application for the Pickem Panel, an Angular/Phaser-based web client used for managing and playing prediction mini-games. It is built with Angular v20 and leverages Phaser 3 for interactive game scenes.

## 📁 Repository Structure

```
angular.json                # Angular CLI config
package.json                # npm dependencies and scripts
proxy.conf.json            # API proxy for local development
src/                       # Source code
  index.html               # App shell
  main.ts                  # Bootstraps Angular application
  styles.css               # Global CSS
  app/                     # Application code
    app.ts                 # Root component and initialization
    app.routes.ts          # Route definitions
    app.config.ts          # Global configuration constants
    core/                  # Shared models, services, interceptors
      interceptors/        # HTTP interceptors (API key injection)
      models/              # TypeScript data interfaces
      services/            # Injectable services for API access & utilities
    lobby/                 # Lobby pages & UI components
    minigames/             # Game pages & Phaser scenes
    environments/          # Environment-specific settings
public/                    # Static assets (fonts, images)
```

## 🧱 Architecture Overview

The app follows a modular, service-oriented approach:

- **Models** describe API payloads and domain objects using TypeScript interfaces.
- **Services** encapsulate HTTP requests and business logic (e.g. `AuthService`, `GameMatchesApi`, `MatchPicksApi`).
- **Angular Components/Pages** manage UI and lifecycle; standalone components are preferred for ease of lazy loading and reuse.
- **Phaser Integration**: Game pages embed Phaser `Game` instances and communicate via events.
- **State & Reactivity**: Auth state and UI toggles use observables and Angular signals.

### Core Services
- `AuthService` – handles login, session persistence, and user state.
- `TenantService` – fetches and caches tenant information.
- `GameMatchesApi`, `MatchPicksApi` – interact with backend endpoints for matches and picks.
- `DeviceService` – generates a device fingerprint used when creating picks.
- `ToastService` – displays notifications.

### Routing
Routes are defined in `src/app/app.routes.ts`:

```ts
const routes: Routes = [
  { path: 'lobby', component: LobbyPage },
  { path: 'game/pick-one/:id', component: PickOneGameComponent },
  { path: '', redirectTo: '/lobby', pathMatch: 'full' }
];
```

Game pages guard themselves by checking authentication in `ngAfterViewInit` and may display `LoginRequiredDialog` to prompt users.

## 🔧 Common How-Tos

### Running the App
1. Install deps: `npm install`
2. Start dev server: `npm start` (uses `proxy.conf.json` to forward API requests).
3. Build for production: `npm run build`.

### Adding a New API Endpoint
1. Define a model in `src/app/core/models`.
2. Add a method to the relevant service in `src/app/core/services` using `HttpClient`.
3. If post/put requests require headers, update `api-key.interceptor.ts`.
4. Inject and consume the service in your component.

### Creating a New Page
1. Run: `ng generate component <name> --standalone`.
2. Add route entry in `app.routes.ts`.
3. Build UI, inject required services, and handle lifecycle.
4. Adjust navigation as needed (e.g. add links/buttons in lobby).

### Creating a Mini-Game
1. Add folder under `src/app/minigames`.
2. Implement an Angular component similar to `PickOneGameComponent`:
   - Load game/match data in `ngAfterViewInit`.
   - Initialize `Phaser.Game` and listen for custom events (e.g. `pickMade`).
   - Map picks to team IDs and call `MatchPicksApi`.
3. Create a Phaser scene class that extends `Phaser.Scene` and emits events with `this.events.emit(...)`.

## 🔐 Authentication & Session
- `AuthService` stores JWT in localStorage and provides helper functions to check login state.
- Components wait for `auth.ready()` (signal) before performing user-specific actions.
- Unauthenticated users are redirected or shown login dialogs via `LoginRequiredDialog`.

## 🎮 Device Fingerprinting
`DeviceService.getDeviceHash()` returns a promise; used to include `deviceHash` in pick submissions for tracking.

## 🧪 Testing
- Tests live beside their components (e.g. `app.spec.ts`).
- Run with `npm run test` (Karma + Jasmine).

## 🎨 Styling
- Global styles in `src/styles.css`.
- Component-specific CSS resides alongside templates and uses scoped selectors.

## ✅ Best Practices
- Keep components focused; move shared logic to services.
- Use TypeScript types for clarity and compile-time safety.
- Gracefully handle API errors—navigate back to lobby on failure.
- Centralize constants/configuration in `app.config.ts`.
- Update this README or add documentation in `/docs` as the project evolves.

## 📚 Resources
- [Angular Docs](https://angular.io/)
- [Phaser 3](https://phaser.io/)
- [RxJS](https://rxjs.dev/)

---

