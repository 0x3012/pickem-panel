import {
  Component,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Phaser from 'phaser';
import PickOneScene from './pick-one.scene';

import { GameMatchesApi } from '../../core/services/game-matches.service';
import { MatchPicksApi } from '../../core/services/match-picks.service';
import { AuthService } from '../../core/services/auth.service';
import { TenantService } from '../../core/services/tenant.service';

import { PickChoice } from '../../core/models/match-pick.model';

import { LoginRequiredDialog } from '../../lobby/components/login/login-required.dialog';
import { signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { DeviceService } from '../../core/services/device.service';

@Component({
  standalone: true,
  selector: 'app-pick-one-game',
  templateUrl: './pick-one-game.component.html',
  styleUrls: ['./pick-one-game.component.css'],
  imports: [NgIf, LoginRequiredDialog],
})
export class PickOneGameComponent
  implements AfterViewInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
private deviceService = inject(DeviceService);
  private matchesApi = inject(GameMatchesApi);
  private picksApi = inject(MatchPicksApi);
  private auth = inject(AuthService);
  private tenantService = inject(TenantService);

  private currentMatchData: any;
  private phaserGame?: Phaser.Game;
  private matchId!: number;

  showLoginDialog = signal(false);

  user = this.auth.user;
  isLoggedIn = this.auth.isLoggedIn;
  authReady = this.auth.ready;

  private userPick: PickChoice | null = null;
 

  ngAfterViewInit() {
    this.auth.loadSession();

    this.matchId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.matchId) {
      this.router.navigate(['/lobby']);
      return;
    }

    this.matchesApi.getMatch(this.matchId).subscribe({
      next: matchData => {
        this.currentMatchData = matchData;

        const waitForAuth = setInterval(() => {
          if (!this.auth.ready()) return;

          clearInterval(waitForAuth);

          const user = this.auth.user();
          const tenant = this.tenantService.getTenant();

          if (!tenant) {
            console.error('[PickOne] Tenant not loaded');
            return;
          }

          const tenantId = Number(tenant.tenant.id);

          if (!user) {
            this.requireLogin();
            return;
          }

          this.picksApi
            .getUserPickForMatch(user.id, this.matchId, tenantId)
            .subscribe({
              next: pick => {
                if (pick?.pickedTeamId !== undefined) {
                  this.userPick = this.mapTeamIdToPick(
                    pick.pickedTeamId
                  );
                }

                this.mountPhaser(matchData);
                this.listenToPick();
                this.applyInitialPick();
              },
              error: () => {
                this.mountPhaser(matchData);
                this.listenToPick();
              }
            });
        }, 50);
      },
      error: () => this.router.navigate(['/lobby']),
    });
  }

  ngOnDestroy() {
    this.phaserGame?.destroy(true);
  }
 

  private requireLogin() {
    this.showLoginDialog.set(true);
  }

  onLoginDialogClose() {
    this.showLoginDialog.set(false);
    this.router.navigate(['/lobby']);
  }

  onLoginDialogGoToLogin() {
    this.showLoginDialog.set(false);
    this.router.navigate(['/login']);
  }

  /* =========================
     PICK MAPPING
  ========================= */

  private mapTeamIdToPick(
    pickedTeamId: number | null
  ): PickChoice {
    if (pickedTeamId === null) return 'DRAW';

    if (
      pickedTeamId ===
      Number(this.currentMatchData.fixture.teamA.id)
    ) {
      return 'A';
    }

    return 'B';
  }

  private mapPickToTeamId(
    pick: PickChoice,
    matchData: any
  ): number | null {
    if (pick === 'DRAW') return null;
    if (pick === 'A') return Number(matchData.fixture.teamA.id);
    if (pick === 'B') return Number(matchData.fixture.teamB.id);
    return null;
  }
 

  private mountPhaser(matchData: any) {
    this.phaserGame?.destroy(true);

    this.phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-container',
      backgroundColor: '#0e0e0e',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [new PickOneScene(matchData)],
    });
  }

  private listenToPick() {
    this.phaserGame?.events.on(
      'pickMade',
      (data: {
        pick: PickChoice;
        fixtureId: number;
        points: number;
        multiplier: string;
      }) => this.onPick(data)
    );
  }

  private applyInitialPick() {
    if (!this.userPick || !this.phaserGame) return;

    const tryApply = () => {
      const scene = this.phaserGame!.scene.getScene('PickOne') as any;
      if (!scene?.setInitialPick) return false;
      scene.setInitialPick(this.userPick);
      return true;
    };

    if (tryApply()) return;

    this.phaserGame.events.once('scene-ready', tryApply);
  }

 

private async onPick(data: {
  pick: PickChoice;
  fixtureId: number;
  points: number;
  multiplier: string;
}) {
  if (!this.authReady()) return;

  const user = this.auth.user();
  const tenant = this.tenantService.getTenant();

  if (!user || !tenant) return;

  const tenantId = Number(tenant.tenant.id);

  const pickedTeamId = this.mapPickToTeamId(
    data.pick,
    this.currentMatchData
  );

  const deviceHash = await this.deviceService.getDeviceHash();

  this.picksApi.createPick({
    tenantId,
    userId: user.id,
    userEmail: user.email,
    matchId: data.fixtureId,
    pick: data.pick,
    pickedTeamId,
    userLockTime: new Date().toISOString(),
    deviceHash,  
  }).subscribe();
}
}
