import {Injectable} from '@angular/core';
import {MediaService} from './media.service';
import {WsService} from './ws.service';
import {User, CurrentUser, CameraState, MicrophoneState, ScreenshareState, UserSignal, UserRole} from '../model/user';
import {Subject, Subscription} from 'rxjs';
import {ApiService} from './api.service';
import {State, Connection} from '../model/connection';
import {LocalMediaService} from './local-media.service';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  public roomSubject: RoomSubject;
  private connection: Connection;
  private currentUser: CurrentUser;
  private users: User[] = [];
  private roomId!: string;

  constructor(private mediaSevice: MediaService, private ws: WsService, private api: ApiService, private localMedia: LocalMediaService) {
    this.roomSubject = new Subject();
    this.currentUser = this.initCurrentUser();
    this.connection = {
      state: State.DISCONNECTED,
    };

    ws.connectionSubject.subscribe(data => {
      if (data.state === State.RECONNECTING) {
        this.reconnect();
      }
    });

    mediaSevice.mediaSubject.subscribe(data => {
      this.currentUser.cameraState = data.cameraState;
      this.currentUser.microphoneState = data.microphoneState;
      this.currentUser.screenshareState = data.screenshareState;
      this.currentUser.stream.video = data.localStream;
      this.currentUser.stream.screen = data.localScreenshareStream;
      this.users = data.users;
      this.triggerSubject();
    });
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
      users: this.users,
      connection: this.connection,
    };
  }

  private triggerSubject() {
    this.roomSubject.next({
      currentUser: this.currentUser,
      users: this.users,
      connection: this.connection,
    });
  }

  async connectToRoom(roomId: string, isWebcamDisabled: boolean) {
    if (this.connection.state !== State.RECONNECTING)
      this.connection = {
        state: State.CONNECTING,
      };
    this.triggerSubject();
    try {
      this.roomId = roomId;
      this.currentUser.nickname = this.api.displayName;
      this.currentUser.id = await this.ws.init(roomId, this.api.displayName);
      await this.mediaSevice.init(roomId, isWebcamDisabled, this.currentUser.id);
      setTimeout(() => {
        this.connection = {
          state: State.CONNECTED,
        };
        this.triggerSubject();
      }, 500);
    } catch (error) {
      if (error === 'DUPLICATE SESSION') {
        this.connection.state = State.FAILED;
        this.connection.duplicateSession = true;
        this.triggerSubject();
      } else {
        console.log('Connection Failed trying again...');
        setTimeout(() => {
          this.connectToRoom(roomId, isWebcamDisabled);
        }, 1000);
      }
      console.log(error);
    }
  }

  private reconnect() {
    this.connection.state = State.RECONNECTING;
    this.triggerSubject();
    setTimeout(async () => {
      try {
        console.log('RECONNECTING');
        await this.ws.reconnect(this.roomId);
        this.mediaSevice.restartIce();
        this.connection = {
          state: State.CONNECTED,
        };
        this.triggerSubject();
        this.mediaSevice.addExistingUsers();
      } catch (error) {
        console.log('WS RECONNECT FAILED RESTARTING CONNECTION');
        const cameraDisabled = this.currentUser?.cameraState !== CameraState.ENABLED;
        this.currentUser = this.initCurrentUser();
        this.triggerSubject();
        await this.mediaSevice.disconnect();
        this.localMedia.closeAudio();
        this.localMedia.closeVideo();
        await this.connectToRoom(this.roomId, cameraDisabled);
      }
    }, 1000);
  }

  async disconnect() {
    try {
      if (this.roomId) await this.api.disconnect(this.roomId);
    } catch (error) {
      // Ingore error
    }
    await this.mediaSevice.disconnect();
    this.ws.close();
    this.localMedia.closeAudio();
    this.localMedia.closeVideo();
    this.currentUser = this.initCurrentUser();
    this.connection = {
      state: State.DISCONNECTED,
    };
  }
}

export type RoomSubject = Subject<RoomInfo>;

export type RoomInfo = {
  connection: Connection;
  currentUser: CurrentUser;
  users: User[];
};
