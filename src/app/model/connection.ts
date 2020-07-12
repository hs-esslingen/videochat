export enum State {
  CONNECTING = 0,
  CONNECTED = 1,
  DISCONNECTED = 2,
  RECONNECTING = 3,
  FAILED = 4,
}

export interface Connection {
  state: State;
  duplicateSession?: boolean;
  moodleError?: boolean;
}
