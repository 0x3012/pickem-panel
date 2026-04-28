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

                this.mountPhaser(matchData).then(() => {
                  this.listenToGameEvents();
                  this.applyInitialPick();
                });
              },
              error: () => {
                this.mountPhaser(matchData).then(() => {
                  this.listenToGameEvents();
                });
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


  private async mountPhaser(matchData: any) {
    this.phaserGame?.destroy(true);

    // wait for custom font(s) before Phaser creates text
    await Promise.all([
      document.fonts.load('700 20px Termina'), // countdown
      document.fonts.load('700 14px Termina'), // back button
      document.fonts.load('400 14px Termina'), // pick confirmed
      document.fonts.load('400 12px Termina'), // points
      document.fonts.load('700 16px Termina'), // team labels
    ]);

    await document.fonts.ready;

    const container = document.getElementById('phaser-container')!;
    const dpr = window.devicePixelRatio || 1;

    this.phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-container',
      backgroundColor: '#ffffff',

      width: container.clientWidth * dpr,
      height: container.clientHeight * dpr,

      scale: {
        mode: Phaser.Scale.NONE,
      },

      render: {
        antialias: true,
        antialiasGL: true,
        pixelArt: false,
        roundPixels: false,
      },

      scene: [new PickOneScene(matchData)],
    });

    const canvas = this.phaserGame.canvas;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
  }

  private listenToGameEvents() {
    
    this.phaserGame?.events.on(
      'pickMade',
      (data: {
        pick: PickChoice;
        fixtureId: number;
        points: number;
        multiplier: string;
      }) => this.onPick(data)
 
    );
    this.phaserGame?.events.on('returnToLobby', () => {
      this.router.navigate(['/lobby']);
    });
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
    console.log('onPick called with:', data);

    if (!this.authReady()) {
      console.error('Auth not ready');
      return;
    }

    const user = this.auth.user();
    const tenant = this.tenantService.getTenant();

    if (!user || !tenant) {
      console.error('No user or tenant');
      return;
    }

    const tenantId = Number(tenant.tenant.id);

    const pickedTeamId = this.mapPickToTeamId(
      data.pick,
      this.currentMatchData
    );

    console.log('Mapped pickedTeamId:', pickedTeamId);

    const deviceHash = await this.deviceService.getDeviceHash();

    const payload = {
      tenantId,
      userId: user.id,
      userEmail: user.email,
      matchId: data.fixtureId,
      pick: data.pick,
      pickedTeamId,
      userLockTime: new Date().toISOString(),
      deviceHash,
    };

    console.log('Sending pick payload:', payload);

    this.picksApi.createPick(payload).subscribe({
      next: response => console.log('Pick created successfully:', response),
      error: err => console.error('Failed to create pick:', err)
    });
  }
}
