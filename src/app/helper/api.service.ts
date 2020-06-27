import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {TransportOptions, RtpParameters, RtpCapabilities, DtlsParameters, IceParameters} from 'mediasoup-client/lib/types';
import {User, UserSignal, MicrophoneState} from '../model/user';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  public token: string | undefined;
  public initialLoading = true;
  public redirectUrl: string | undefined;
  public isLoggedIn: boolean | undefined;
  public displayName = '';
  private moodleCourses:
    | {
        fullname: string;
        id: number;
        visible: number;
        shortname: string;
      }[]
    | undefined;

  constructor(private http: HttpClient) {
    this.token = window.localStorage.getItem('token') as string;
  }

  public getLogin(): string | undefined {
    return this.token;
  }

  public async checkLogin(): Promise<boolean> {
    try {
      const data = (await this.http.get('/auth/check').toPromise()) as {email: string; displayName: string};
      window.localStorage.setItem('email', data.email);
      window.localStorage.setItem('displayName', data.displayName);
      this.displayName = data.displayName;
      this.isLoggedIn = true;
      return true;
    } catch (e) {
      try {
        if (this.token) {
          await this.jwtLogin();
          this.isLoggedIn = true;
          return this.checkLogin();
        }
      } catch (e) {
        // ingore error
      }
      this.isLoggedIn = false;
      return false;
    }
  }

  public async emailLogin(email: string) {
    return this.http.post('/auth/email', {email}).toPromise() as Promise<{
      token?: string;
    }>;
  }

  public async jwtLogin() {
    try {
      await this.http
        .get('/auth/jwt', {
          headers: {
            'x-token': this.token as string,
          },
        })
        .toPromise();
    } catch (error) {
      return false;
    }
    this.isLoggedIn = true;
    return true;
  }

  public async logout() {
    this.token = undefined;
    this.isLoggedIn = false;
    window.localStorage.removeItem('token');
    return this.http.get('/auth/logout').toPromise() as Promise<{
      token?: string;
    }>;
  }

  async getMoodleCourses(token: string) {
    if (this.moodleCourses == null)
      this.moodleCourses = (await this.http.get('/api/moodle/courses?token=' + token).toPromise()) as {
        fullname: string;
        id: number;
        visible: number;
        shortname: string;
      }[];
    return this.moodleCourses;
  }

  public getCapabilities(roomId: string): Promise<RtpCapabilities> {
    return this.http.get(`/api/room/${roomId}/capabilities`).toPromise() as Promise<RtpCapabilities>;
  }

  public getCreateTransport(roomId: string): Promise<TransportOptions> {
    return this.http.get(`/api/room/${roomId}/create-transport`).toPromise() as Promise<TransportOptions>;
  }

  public connect(roomId: string, id: string, dtlsParameters: DtlsParameters): Promise<object> {
    return this.http
      .post(`/api/room/${roomId}/connect`, {
        id,
        dtlsParameters,
      })
      .toPromise();
  }

  public produce(roomId: string, id: string, kind: string, rtpParameters: RtpParameters, appData: {type: string}): Promise<{id: string}> {
    return this.http
      .post(`/api/room/${roomId}/produce`, {
        id,
        kind,
        rtpParameters,
        appData,
      })
      .toPromise() as Promise<{id: string}>;
  }

  public producerClose(roomId: string, id: string) {
    return this.http
      .post(`/api/room/${roomId}/producer-close`, {
        id,
      })
      .toPromise() as Promise<object>;
  }

  public addConsumer(roomId: string, id: string, rtpCapabilities: RtpCapabilities, producerId: string): Promise<{id: string; rtpParameters: RtpParameters}> {
    return this.http
      .post(`/api/room/${roomId}/add-consumer`, {
        id,
        rtpCapabilities,
        producerId,
      })
      .toPromise() as Promise<{id: string; rtpParameters: RtpParameters}>;
  }

  public resume(roomId: string, id: string): Promise<object> {
    return this.http
      .post(`/api/room/${roomId}/resume`, {
        id,
      })
      .toPromise();
  }

  public restartIce(roomId: string, id: string): Promise<IceParameters> {
    return this.http
      .post(`/api/room/${roomId}/restart-ice`, {
        id,
      })
      .toPromise() as Promise<IceParameters>;
  }

  public getUsers(roomId: string): Promise<User[]> {
    return this.http.get(`/api/room/${roomId}/users`).toPromise() as Promise<User[]>;
  }

  public setUserSignal(roomId: string, signal: UserSignal) {
    return this.http
      .post(`/api/room/${roomId}/user-signal`, {
        signal,
      })
      .toPromise() as Promise<object>;
  }

  public setMicrophoneState(roomId: string, microphoneState: MicrophoneState) {
    return this.http
      .post(`/api/room/${roomId}/microphone-state`, {
        microphoneState,
      })
      .toPromise() as Promise<object>;
  }
}
