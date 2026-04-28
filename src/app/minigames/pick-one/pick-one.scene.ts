import Phaser from 'phaser';
import { environment } from '../../../environments/environment';

export default class PickOneScene extends Phaser.Scene {

  private matchData: any;
  private initialPick: 'A' | 'B' | 'DRAW' | null = null;

  private enforceLock = true;
  private locked = false;
  private lockAt!: number;

  pickStatusText?: Phaser.GameObjects.Text;

  private teamCards: Record<'A' | 'B', {
    container: Phaser.GameObjects.Container;
    bg: any;
  }> = {} as any;

  constructor(matchData: any) {
    super('PickOne');
    this.matchData = matchData;
  }

  preload() {
    const { teamA, teamB } = this.matchData.fixture;

    this.load.image('hsLogoFlat', '/hs-logo-flat.png');

    this.load.image(
      'teamA',
      `${environment.apiBaseUrl}${teamA.logo}`
    );

    this.load.image(
      'teamB',
      `${environment.apiBaseUrl}${teamB.logo}`
    );
    this.load.svg('lockIcon', 'assets/general/mdi_lock-open.svg');
  }

  create() {

    const isMobile = this.scale.width < 768;
    const uiScale = isMobile ? 1.25 : 1;

    const { width, height } = this.scale;
    const { fixture, config } = this.matchData;

    this.lockAt = new Date(config.lockAt).getTime();
    this.locked = this.enforceLock
      ? Date.now() >= this.lockAt
      : false;

    this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0xffffff,
      1
    );

    const centerX = width / 2;
    const y = 52;

    const backButton = this.add.text(14, 12, '< Return to Lobby', {
      font: `${Math.round(14 * uiScale)}px Termina`,
      color: '#222222'
    });
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => {
      this.game.events.emit('returnToLobby');
    });

    const countdownGroup = this.add.container(
      centerX,
      isMobile ? 76 : 52
    );

    const lockIcon = this.add.image(0, 0, 'lockIcon');
    lockIcon.setScale(1);

    const countdownText = this.add.text(0, 0, '', {
      font: `${Math.round(20 * uiScale)}px Termina`,
      color: '#111111',
    }).setOrigin(0, 0.5);
    countdownGroup.add([lockIcon, countdownText]);

    const updateCountdownLayout = () => {
      const spacing = isMobile ? 6 : 8;

      lockIcon.setPosition(lockIcon.displayWidth / 2, 0);
      
      countdownText.setPosition(
        lockIcon.displayWidth + spacing,
        isMobile ? 2 : 0
      );

      const totalWidth =
        lockIcon.displayWidth + spacing + countdownText.width;

      countdownGroup.x = centerX - totalWidth / 2;
    };

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.enforceLock) {
          countdownText.setText('UNLOCKED');
          updateCountdownLayout();
          return;
        }

        const remaining = Math.max(0, this.lockAt - Date.now());

        if (remaining <= 0) {
          countdownText.setText('LOCKED');
          this.locked = true;
          updateCountdownLayout();
          return;
        }

        const timeStr = this.formatCountdown(remaining);
        countdownText.setText(`Locks in ${timeStr}`);
        updateCountdownLayout();
      }
    });

    updateCountdownLayout();

    const cardsY = height * (isMobile ? 0.45 : 0.5);
    const leftX = width * (isMobile ? 0.23 : 0.32);
    const rightX = width * (isMobile ? 0.75 : 0.68);

    this.createTeamCard({
      x: leftX,
      y: cardsY,
      key: this.textures.exists('teamA') ? 'teamA' : 'hsLogoFlat',
      label: fixture.teamA.name,
      pick: 'A'
    });

    this.createTeamCard({
      x: rightX,
      y: cardsY,
      key: this.textures.exists('teamB') ? 'teamB' : 'hsLogoFlat',
      label: fixture.teamB.name,
      pick: 'B'
    });

    this.add.text(
      width / 2,
       isMobile ? 340 : 330,
      `Points: ${config.basePoints} × ${config.multiplier}`,
      {
        font: `${Math.round(12 * uiScale)}px Termina`,
        color: '#666666'
      }
    ).setOrigin(0.5);

    this.pickStatusText = this.add.text(
      width / 2,
      isMobile ? 380 : 300,
      'Pick confirmed!',
      {
              font: `${Math.round(14 * uiScale)}px Termina`,

        color: '#222222'
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    this.game.events.emit('scene-ready');
  }

  private pad(n: number): string {
    return n < 10 ? '0' + n : n.toString();
  }

  private formatCountdown(diff: number): string {
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  createTeamCard(config: {
    x: number;
    y: number;
    key: string;
    label: string;
    pick: 'A' | 'B';
  }) {
    const container = this.add.container(config.x, config.y);
    const { width } = this.scale;

    const isMobile = this.scale.width < 768;
    const uiScale = isMobile ? 1.35 : 1;

    const cardWidth = Math.min(width * 0.32, 420) * uiScale;
    const cardHeight = cardWidth * (isMobile ? 0.60 : 0.50);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.9);
    bg.lineStyle(2, 0xe7e7e7, 1);
    bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
    bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);

    const hitbox = this.add.rectangle(0, 0, 320, 180, 0x000000, 0.001);
    hitbox.setInteractive({ useHandCursor: true });

    const logo = this.add.image(0, -30, config.key);
    const maxW = 80 * uiScale;
    const maxH = 80 * uiScale;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    logo.setScale(scale);

    const text = this.add.text(0, 30 * uiScale, config.label, {
      font: `${Math.round(18 * uiScale)}px Termina`,
      color: '#000000',
      align: 'center',
      wordWrap: { width: 220 * uiScale }
    }).setOrigin(0.5);

    container.add([bg, hitbox, logo, text]);

    this.teamCards[config.pick] = {
      container,
      bg
    };

    hitbox.on('pointerdown', () => {
      this.selectPick(config.pick);
    });

    hitbox.on('pointerover', () => {
      container.setScale(1.05);
    });

    hitbox.on('pointerout', () => {
      container.setScale(1);
    });
  }

  /* =========================
     PICK HANDLING
  ========================= */

  selectPick(choice: 'A' | 'B' | 'DRAW') {
    if (this.locked) return;

    // ❌ REMOVED: this.locked = true;
    this.initialPick = choice;

    this.cameras.main.flash(150, 0, 255, 200);

    this.showPickedText(choice);
    this.applyPickedBorder(choice);

    console.log('Emitting pickMade:', {
      pick: choice,
      fixtureId: this.matchData.fixture.id,
      points: this.matchData.config.basePoints,
      multiplier: this.matchData.config.multiplier
    });

    this.game.events.emit('pickMade', {
      pick: choice,
      fixtureId: this.matchData.fixture.id,
      points: this.matchData.config.basePoints,
      multiplier: this.matchData.config.multiplier
    });
  }

  setInitialPick(choice: 'A' | 'B' | 'DRAW') {
    this.initialPick = choice;

    this.showPickedText(choice);
    this.applyPickedBorder(choice);
  }

  /* =========================
     VISUAL HELPERS
  ========================= */

  private applyPickedBorder(choice: 'A' | 'B' | 'DRAW') {
    const cardWidth = Math.min(this.scale.width * 0.32, 420) * (this.scale.width < 768 ? 1.35 : 1);
    const cardHeight = cardWidth * (this.scale.width < 768 ? 0.60 : 0.50);

    Object.entries(this.teamCards).forEach(([pick, card]) => {
      card.bg.clear();
      card.bg.fillStyle(0xffffff, 0.9);
      card.bg.lineStyle(2, 0xffffff, 0.2);
      card.bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
      card.bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
      card.container.setScale(1);
    });

    if (choice === 'DRAW') return;

    const selected = this.teamCards[choice];
    if (!selected) return;

    selected.bg.clear();
    selected.bg.fillStyle(0xffffff, 0.9);
    selected.bg.lineStyle(2, 0x00ffcc, 1);
    selected.bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
    selected.bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
    selected.container.setScale(1.05);
  }


  private showPickedText(choice: 'A' | 'B' | 'DRAW') {
    if (!this.pickStatusText) return;

    let label = 'DRAW';

    if (choice === 'A') {
      label = this.matchData.fixture.teamA.name;
    } else if (choice === 'B') {
      label = this.matchData.fixture.teamB.name;
    }

    this.pickStatusText
      .setText(`YOU PICKED ${label}`)
      .setVisible(true);
  }
}
