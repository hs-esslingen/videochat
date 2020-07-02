import {Injectable} from '@angular/core';
import {Subject, Subscription} from 'rxjs';
import {ApiService} from './api.service';
import {UserSignal} from '../model/user';

@Injectable({
  providedIn: 'root',
})
export class SignalService {
  private signalSubject: Subject<UserSignal>;
  private roomId!: string;
  private userSignal: UserSignal = UserSignal.NONE;

  constructor(private api: ApiService) {
    this.signalSubject = new Subject();
  }

  init(roomId: string) {
    this.roomId = roomId;
    this.userSignal = UserSignal.NONE;
  }

  async setSignal(signal: UserSignal) {
    if (this.userSignal === signal) signal = UserSignal.NONE;
    this.userSignal = signal;
    await this.api.setUserSignal(this.roomId, signal);
    this.signalSubject.next(signal);
  }

  async getSignal() {
    return this.userSignal;
  }

  public subscribe(callback: (v: UserSignal) => void): Subscription {
    return this.signalSubject.subscribe({
      next: callback,
    });
  }
}
