import {Injectable} from '@angular/core';
import {MediaService, MediaObservable} from './media.service';
import {WsService} from './ws.service';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  public mediaObservable: MediaObservable | undefined;
  nickname: string;
  constructor(private mediaSevice: MediaService, private ws: WsService) {
    this.nickname = localStorage.getItem('nickname') as string;
  }

  async connectToRoom(roomId: string, isWebcamDisabled: boolean) {
    const uid = await this.ws.init(roomId, this.nickname);
    this.mediaObservable = await this.mediaSevice.init(roomId, isWebcamDisabled);
  }

  disconnect() {
    this.mediaSevice.disconnect();
    this.ws.close();
  }
}
