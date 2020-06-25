export enum State {
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
  RECONNECTING,
}

export interface Connection {
  state: State;
  duplicateSession?: boolean;
}
