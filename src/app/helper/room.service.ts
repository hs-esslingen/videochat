import {Injectable} from '@angular/core';
import {MediaService, MediaObservable} from './media.service';
import {WsService} from './ws.service';
import {User, CurrentUser, CameraState, MicrophoneState, ScreenshareState, UserSignal, UserRole} from '../model/user';
import {Subject, Subscription} from 'rxjs';
import {ApiService} from './api.service';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  public roomSubject: RoomSubject;
  private mediaSubscription?: Subscription;
  private currentUser: CurrentUser;
  private users: User[] = [];
  nickname: string;
  constructor(private mediaSevice: MediaService, private ws: WsService, private api: ApiService) {
    this.nickname = localStorage.getItem('nickname') as string;
    this.roomSubject = new Subject();
    this.currentUser = this.initCurrentUser();
  }

  initCurrentUser(): CurrentUser {
    return {
      id: '',
      nickname: this.api.displayName,
      cameraState: CameraState.DISABLED,
      microphoneState: MicrophoneState.DISABLED,
      screenshareState: ScreenshareState.DISABLED,
      signal: UserSignal.NONE,
      stream: {},
      userRole: UserRole.USER,
    };
  }

  public subscribe(callback: (v: RoomInfo) => void): Subscription {
    return this.roomSubject.subscribe({
      next: callback,
    });
  }

  public getRoomInfo(): RoomInfo {
    return {
      currentUser: this.currentUser,
      users: [],
    };
  }

  private triggerSubject() {
    this.roomSubject.next({
      currentUser: this.currentUser,
      users: this.users,
    });
  }

  async connectToRoom(roomId: string, isWebcamDisabled: boolean) {
    this.currentUser.id = await this.ws.init(roomId, this.nickname);
    this.mediaSubscription = (await this.mediaSevice.init(roomId, isWebcamDisabled, this.currentUser.id)).subscribe(data => {
      this.currentUser.cameraState = data.cameraState;
      this.currentUser.microphoneState = data.microphoneState;
      this.currentUser.screenshareState = data.screenshareState;
      this.currentUser.stream.video = data.localStream;
      this.currentUser.stream.screen = data.localScreenshareStream;
      this.users = data.users;
      this.triggerSubject();
    });
  }

  async disconnect() {
    await this.mediaSevice.disconnect();
    this.ws.close();
    this.currentUser = this.initCurrentUser();
    this.mediaSubscription?.unsubscribe();
  }
}

export type RoomSubject = Subject<RoomInfo>;

export type RoomInfo = {
  // connection: Connection // Add connection info here
  currentUser: CurrentUser;
  users: User[];
};
