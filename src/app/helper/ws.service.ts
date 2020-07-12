import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
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
  private pingTimeout?: number;
  public messageSubject: Subject<{
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  }>;
  constructor() {
    this.messageSubject = new Subject();
    this.connectionSubject = new Subject();
  }

  public init(roomId: string, nickname: string, moodleToken?: string): Promise<string> {
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
              case 'error-failed':
                this.state = State.FAILED;
                this.connectionSubject.next({
                  state: this.state,
                });
                this.close();
                rej('MOODLE ERROR');
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
            moodleToken: moodleToken,
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
      console.log('Connecting to WS');
      if (this.state !== State.RECONNECTING) this.state = State.CONNECTING;
      if (this.websocket) {
        console.log('Old ws state: ' + WsReadyState[this.websocket.readyState]);
        if (this.websocket.readyState === WsReadyState.OPEN) {
          this.websocket.close();
        }
        console.log();
      }
      if (environment.production) {
        const url = new URL(window.location.href);
        this.websocket = new WebSocket('wss://' + url.host + '/ws');
      } else {
        this.websocket = new WebSocket('ws://localhost:4000/ws');
      }
      this.websocket.addEventListener('message', ev => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'ping') {
          this.websocket.send(JSON.stringify({type: 'pong'}));
          clearTimeout(this.pingTimeout);
          this.pingTimeout = (setTimeout(() => {
            this.websocket.close();
          }, 3000) as unknown) as number;
          return;
        }
        this.messageSubject.next({
          type: msg.type,
          data: msg.data,
        });
      });

      this.websocket.addEventListener('error', e => {
        console.log('WEBSOCKET ERROR');
        console.log(e);
        rej();
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
      if (this.websocket.readyState >= WsReadyState.CLOSING) {
        return;
      } else if (this.websocket.readyState <= WsReadyState.CONNECTING) {
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
    clearTimeout(this.pingTimeout);
    this.state = State.DISCONNECTED;
    if (this.websocket) this.websocket.close();
  }
}

export enum WsReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}
