import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {environment} from 'src/environments/environment';
import {State, Connection} from '../model/connection';
import {MicrophoneState} from '../model/user';

@Injectable({
  providedIn: 'root',
})
export class WsService {
  public websocket!: WebSocket;
  public state: State = State.DISCONNECTED;
  public connectionSubject: Subject<Connection>;
  public messageSubject: Subject<{
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  }>;
  constructor() {
    this.messageSubject = new Subject();
    this.connectionSubject = new Subject();
  }

  public init(roomId: string, nickname: string): Promise<string> {
    return new Promise((res, rej) => {
      this.connect()
        .then(() => {
          const sub = this.messageSubject?.subscribe(msg => {
            console.log('message');
            console.log(msg);
            switch (msg.type) {
              case 'init':
                this.connectionSubject.next({
                  state: this.state,
                });
                this.state = State.CONNECTED;
                res(msg.data.id);
                sub.unsubscribe();
                break;
              case 'error-duplicate-session':
                this.state = State.FAILED;
                this.connectionSubject.next({
                  state: this.state,
                });
                this.close();
                rej('DUPLICATE SESSION');
                sub.unsubscribe();
                break;
            }
          });

          this.send('init', {
            roomId: roomId,
            nickname: nickname,
            microphoneState: MicrophoneState.ENABLED,
          });
        })
        .catch(e => rej(e));
    });
  }

  public reconnect(roomId: string): Promise<string> {
    if (this.state !== State.RECONNECTING) throw new Error(`Not Reconnecting Current WS State: ${State[this.state]}`);
    return new Promise((res, rej) => {
      this.connect()
        .then(() => {
          const sub = this.messageSubject?.subscribe(msg => {
            switch (msg.type) {
              case 'reconnect':
                console.log('reconnected');
                this.state = State.CONNECTED;
                this.connectionSubject.next({
                  state: this.state,
                });
                sub.unsubscribe();
                res(msg.data.id);
                break;
              case 'reconnect-failed':
                this.state = State.DISCONNECTED;
                this.connectionSubject.next({
                  state: this.state,
                });

                console.log('reconnection failed');
                this.close();
                sub.unsubscribe();
                rej('RECONNECT FAILED');
                break;
            }
          });

          this.send('reconnect', {
            roomId: roomId,
          });
        })
        .catch(e => rej(e));
    });
  }

  public connect() {
    return new Promise((res, rej) => {
      if (environment.production) {
        const url = new URL(window.location.href);
        this.websocket = new WebSocket('wss://' + url.host + '/ws');
      } else {
        this.websocket = new WebSocket('ws://localhost:4000/ws');
      }
      this.websocket.addEventListener('message', ev => {
        const msg = JSON.parse(ev.data);
        this.messageSubject.next({
          type: msg.type,
          data: msg.data,
        });
      });

      this.websocket.addEventListener('error', e => {
        rej();
        console.log('WEBSOCKET ERROR');
        console.log(e);
      });

      this.websocket.addEventListener('close', e => {
        console.log('WEBSOCKET CLOSED');
        console.log(e);
        if (this.state === State.CONNECTED) {
          this.state = State.RECONNECTING;
          this.connectionSubject.next({
            state: this.state,
          });
          // reconnect
        }
      });
      // setTimeout(() => rej('timeout'), 5000);
      this.websocket.addEventListener('open', async () => {
        console.log('websocket opened');
        res();
      });
    });
  }

  public send<T>(type: string, data: T) {
    if (this.websocket) {
      if (this.websocket.readyState !== 1) {
        setTimeout(() => {
          this.send(type, data);
        }, 500);
      }
      this.websocket.send(
        JSON.stringify({
          type,
          data,
        })
      );
    }
  }

  public close() {
    this.state = State.DISCONNECTED;
    if (this.websocket) this.websocket.close();
  }
}
