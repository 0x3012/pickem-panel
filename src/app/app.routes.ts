import { Routes } from '@angular/router';
import { LobbyPage } from './lobby/lobby.page';
import { PickOneGameComponent } from './minigames/pick-one/pick-one-game.component';

export const routes: Routes = [
  { path: '', redirectTo: 'lobby', pathMatch: 'full' },
  { path: 'lobby', component: LobbyPage },
  { path: 'game/:id', component: PickOneGameComponent }
];
