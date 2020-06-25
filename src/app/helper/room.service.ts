import {Injectable} from '@angular/core';
import {MediaService, MediaObservable} from './media.service';
import {WsService} from './ws.service';
import {User} from '../model/user';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  public mediaObservable: MediaObservable | undefined;
  public currentUser: User | undefined;
  nickname: string;
  constructor(private mediaSevice: MediaService, private ws: WsService) {
    this.nickname = localStorage.getItem('nickname') as string;
  }

  async connectToRoom(roomId: string, isWebcamDisabled: boolean) {
    this.currentUser = new User(await this.ws.init(roomId, this.nickname), this.nickname);
    this.mediaObservable = await this.mediaSevice.init(roomId, isWebcamDisabled, this.currentUser.id);
  }

  async disconnect() {
    await this.mediaSevice.disconnect();
    this.ws.close();
    this.currentUser = undefined;
  }
}
