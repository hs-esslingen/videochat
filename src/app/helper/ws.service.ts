import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WsService {
  public websocket: WebSocket | undefined;
  public messageObserver:
    | Observable<{
        type: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: any;
      }>
    | undefined;
  constructor() {}

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
