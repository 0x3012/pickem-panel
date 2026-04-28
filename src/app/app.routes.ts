import { Routes } from '@angular/router';
import { LobbyPage } from './lobby/lobby.page';
import { PickOneGameComponent } from './minigames/pick-one/pick-one-game.component';
import { LeaderboardPageComponent } from './leaderboard/leaderboard-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'lobby', pathMatch: 'full' },
  { path: 'lobby', component: LobbyPage },
  { path: 'my-picks', loadComponent: () => import('./lobby/components/my-picks/my-picks.page').then(m => m.MyPicksPage) },
  { path: 'notifications', loadComponent: () => import('./notifications/notifications.page').then(m => m.NotificationsPage) },
  { path: 'leaderboard', component: LeaderboardPageComponent },
  //{ path: 'how-to-play', loadComponent: () => import('./how-to-play/how-to-play.page').then(m => m.HowToPlayPage) },
  //{ path: 'faq', loadComponent: () => import('./faq/faq.page').then(m => m.FaqPage) },
  { path: 'game/:id', component: PickOneGameComponent }
];