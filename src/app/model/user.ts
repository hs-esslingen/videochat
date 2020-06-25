import {Consumer} from 'mediasoup-client/lib/types';

export class User {
  public id: string;
  public nickname: string;
  public signal: UserSignal = UserSignal.NONE;
  public microphoneState: MicrophoneState = MicrophoneState.DISABLED;
  public userRole: UserRole = UserRole.USER;
  public producers: {
    audio?: string;
    video?: string;
    screen?: string;
  } = {};
  public consumers?: {
    audio?: Consumer;
    video?: Consumer;
    screen?: Consumer;
  };
  constructor(id: string, nickname: string) {
    this.id = id;
    this.nickname = nickname;
  }
}

export enum MicrophoneState {
  DISABLED = 0,
  ENABLED = 1,
  TALKING = 2,
}

export enum UserRole {
  USER = 0,
  MODERATOR = 1,
}

export enum UserSignal {
  NONE = 0,
  RAISED_HAND = 1,
  VOTED_UP = 2,
  VOTED_DOWN = 3,
}
