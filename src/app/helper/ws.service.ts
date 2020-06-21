import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {environment} from 'src/environments/environment';
import {State} from '../model/connection';

@Injectable({
  providedIn: 'root',
})
export class WsService {
  public websocket: WebSocket | undefined;
  public state: State = State.DISCONNECTED;
  public messageObserver:
    | Observable<{
        type: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: any;
      }>
    | undefined;
  constructor() {}

  public init(roomId: string, nickname: string): Promise<string> {
    return new Promise((res, rej) => {
      if (environment.production) {
        const url = new URL(window.location.href);
        this.connect('wss://' + url.host + '/ws');
      } else {
        this.connect('ws://localhost:4000/ws');
      }

      this.websocket?.addEventListener('open', async () => {
        console.log('websocket opened');

        this.send('init', {
          roomId: roomId,
          nickname: nickname,
        });

        this.messageObserver?.subscribe(msg => {
          switch (msg.type) {
            case 'init':
              res(msg.data.id);
              break;
            case 'error-duplicate-session':
              this.close();
              rej('DUPLICATE SESSION');
              break;
          }
        });
      });
    });
  }

  public connect(url: string) {
    this.websocket = new WebSocket(url);
    this.messageObserver = new Observable(sub => {
      this.websocket?.addEventListener('message', ev => {
        const msg = JSON.parse(ev.data);
        sub.next({
          type: msg.type,
          data: msg.data,
        });
      });
      this.websocket?.addEventListener('close', () => {
        sub.complete();
      });
    });
  }

  public send<T>(type: string, data: T) {
    if (this.websocket)
      this.websocket.send(
        JSON.stringify({
          type,
          data,
        })
      );
  }

  public close() {
    if (this.websocket) this.websocket.close();
    this.websocket = undefined;
  }
}
