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
      try {
        if (environment.production) {
          const url = new URL(window.location.href);
          this.connect('wss://' + url.host + '/ws');
        } else {
          this.connect('ws://localhost:4000/ws');
        }
      } catch (error) {
        rej(error);
      }

      setTimeout(() => rej('timeout'), 2000);

      this.websocket.addEventListener('open', async () => {
        console.log('websocket opened');

        this.send('init', {
          roomId: roomId,
          nickname: nickname,
          microphoneState: MicrophoneState.ENABLED,
        });

        this.messageSubject?.subscribe(msg => {
          switch (msg.type) {
            case 'init':
              this.connectionSubject.next({
                state: this.state,
              });
              this.state = State.CONNECTED;
              res(msg.data.id);
              break;
            case 'error-duplicate-session':
              this.state = State.FAILED;
              this.connectionSubject.next({
                state: this.state,
              });
              this.close();
              rej('DUPLICATE SESSION');
              break;
          }
        });
      });
    });
  }

  public reconnect(roomId: string): Promise<string> {
    if (this.state !== State.RECONNECTING) throw new Error(`Not Reconnecting Current WS State: ${State[this.state]}`);
    return new Promise((res, rej) => {
      try {
        if (environment.production) {
          const url = new URL(window.location.href);
          this.connect('wss://' + url.host + '/ws');
        } else {
          this.connect('ws://localhost:4000/ws');
        }
      } catch (error) {
        console.log('connection failed');
        rej(error);
      }

      setTimeout(() => rej('timeout'), 5000);

      this.websocket.addEventListener('open', async () => {
        console.log('websocket opened');

        this.send('reconnect', {
          roomId: roomId,
        });

        this.messageSubject?.subscribe(msg => {
          switch (msg.type) {
            case 'reconnect':
              console.log('reconnected');
              this.state = State.CONNECTED;
              this.connectionSubject.next({
                state: this.state,
              });

              res(msg.data.id);
              break;
            case 'reconnect-failed':
              this.state = State.DISCONNECTED;
              this.connectionSubject.next({
                state: this.state,
              });

              console.log('reconnection failed');
              this.close();
              rej('RECONNECT FAILED');
              break;
          }
        });
      });
    });
  }

  public connect(url: string) {
    this.websocket = new WebSocket(url);
    this.websocket.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      this.messageSubject.next({
        type: msg.type,
        data: msg.data,
      });
    });

    this.websocket.addEventListener('error', e => {
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
