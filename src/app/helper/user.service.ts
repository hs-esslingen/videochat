import {Injectable} from '@angular/core';
import {Consumer} from 'mediasoup-client/lib/types';
import {MicrophoneState} from './media.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor() {}
}

export class User {
  constructor(
    public id: string,
    public nickname: string,
    public signal: userSignal,
    public microphoneState: MicrophoneState,
    public isTalking: boolean,
    public userRole: userRole,
    public producers: {
      audio?: string;
      video?: string;
      screen?: string;
    },
    public consumers?: {
      audio?: Consumer;
      video?: Consumer;
      screen?: Consumer;
    }
  ) {}
}

export enum userRole {
  USER = 0,
  MODERATOR = 1,
}

export enum userSignal {
  NONE = 0,
  RAISED_HAND = 1,
  VOTED_UP = 2,
  VOTED_DOWN = 3,
}
