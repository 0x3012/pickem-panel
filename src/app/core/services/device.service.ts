import { Injectable } from '@angular/core';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

@Injectable({ providedIn: 'root' })
export class DeviceService {

  private fpPromise = FingerprintJS.load();

  async getDeviceHash(): Promise<string> {
    const fp = await this.fpPromise;
    const result = await fp.get();
    return result.visitorId;
  }
}