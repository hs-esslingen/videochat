import { Injectable } from "@angular/core";
import { Observable, Subscriber } from 'rxjs';

@Injectable({
  providedIn: "root",
})
export class WsService {
  public websocket: WebSocket;
  public messageObserver: Observable<{
    type: string,
    data: any,
  }>;
  constructor() {}

  public connect(url) {
    this.websocket = new WebSocket(url);
    this.messageObserver = new Observable((sub) => {
      this.websocket.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        sub.next({
          type: msg.type,
          data: msg.data
        });
      })
      this.websocket.addEventListener("close", () => {
        sub.complete();
      })
    })
  }

  public send(type: string, data: any) {
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
