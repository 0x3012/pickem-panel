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
    bg: Phaser.GameObjects.Rectangle;
  }> = {} as any;

  constructor(matchData: any) {
    super('PickOne');
    this.matchData = matchData;
  }

  preload() {
    const { teamA, teamB } = this.matchData.fixture;

    this.load.image(
      'bg',
      `/assets/general/fb_image.png`
    );

    this.load.image(
      'teamA',
      `${environment.apiBaseUrl}${teamA.logo}`
    );

    this.load.image(
      'teamB',
      `${environment.apiBaseUrl}${teamB.logo}`
    );
  }

  create() {
    const { width, height } = this.scale;
    const { fixture, config } = this.matchData;

    this.lockAt = new Date(config.lockAt).getTime();
    this.locked = this.enforceLock
      ? Date.now() >= this.lockAt
      : false;

    const bg = this.add.image(width / 2, height / 2, 'bg');
    bg.setDisplaySize(width, height);

    this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.55
    );

    this.add.text(width / 2, 40, 'WHO WINS?', {
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const countdownText = this.add.text(
      width / 2,
      80,
      '',
      { fontSize: '14px', color: '#ffcc00' }
    ).setOrigin(0.5);

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.enforceLock) {
          countdownText.setText('UNLOCKED (TEMP)');
          return;
        }

        const remaining = Math.max(0, this.lockAt - Date.now());
        const seconds = Math.floor(remaining / 1000);

        countdownText.setText(
          seconds > 0 ? `LOCKS IN ${seconds}s` : 'LOCKED'
        );
      }
    });

 
    this.createTeamCard({
      x: width / 2 - 90,
      y: height / 2,
      key: 'teamA',
      label: fixture.teamA.name,
      pick: 'A'
    });

    this.createTeamCard({
      x: width / 2 + 90,
      y: height / 2,
      key: 'teamB',
      label: fixture.teamB.name,
      pick: 'B'
    });

    this.add.text(
      width / 2,
      height - 30,
      `Points: ${config.basePoints} × ${config.multiplier}`,
      { color: '#aaa' }
    ).setOrigin(0.5);

 
    this.pickStatusText = this.add.text(
      width / 2,
      height - 60,
      '',
      {
        fontSize: '18px',
        color: '#00ffcc',
        fontStyle: 'bold'
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    this.game.events.emit('scene-ready');
  }

  createTeamCard(config: {
    x: number;
    y: number;
    key: string;
    label: string;
    pick: 'A' | 'B';
  }) {
    const container = this.add.container(config.x, config.y);

    const cardBg = this.add.rectangle(
      0,
      0,
      140,
      180,
      0x1a1a1a,
      0.9
    ).setStrokeStyle(2, 0xffffff, 0.2);

    const logo = this.add.image(0, -30, config.key)
      .setDisplaySize(80, 80);

    const text = this.add.text(0, 60, config.label, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 120 }
    }).setOrigin(0.5);

    container.add([cardBg, logo, text]);
    container.setSize(140, 180);
    container.setInteractive({ useHandCursor: true });

    this.teamCards[config.pick] = {
      container,
      bg: cardBg
    };

    container.on('pointerdown', () => {
      this.selectPick(config.pick);
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
    Object.values(this.teamCards).forEach(card => {
      card.bg.setStrokeStyle(2, 0xffffff, 0.2);
      card.container.setScale(1);
    });

    if (choice === 'DRAW') return;

    const selected = this.teamCards[choice];
    if (!selected) return;

    selected.bg.setStrokeStyle(2, 0x00ffcc, 1);
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
