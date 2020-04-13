import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  TransportOptions,
  RtpParameters,
  MediaKind,
  RtpCapabilities,
} from "mediasoup-client/lib/types";
import { User } from "./media.service";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  public token: string;

  constructor(private http: HttpClient) {
    this.token = window.localStorage.getItem("token");
  }

  public getLogin(): string {
    return this.token;
  }
  public async checkLogin() {
    return this.http.get(`/login/check`).toPromise() as Promise<{
      token?: string;
    }>;
  }

  public async login(email: string) {
    return this.http.post(`/api/login`, { email }).toPromise() as Promise<{
      token?: string;
    }>;
  }

  public async logout() {
    this.token = undefined;
    window.localStorage.removeItem("token");
  }

  public getCapabilities(roomId: string): Promise<RtpCapabilities> {
    return this.http
      .get(`/api/room/${roomId}/capabilities`)
      .toPromise() as Promise<RtpCapabilities>;
  }

  public getCreateTransport(roomId: string): Promise<TransportOptions> {
    return this.http
      .get(`/api/room/${roomId}/create-transport`)
      .toPromise() as Promise<TransportOptions>;
  }

  public connect(roomId: string, id, dtlsParameters): Promise<object> {
    return this.http
      .post(`/api/room/${roomId}/connect`, {
        id,
        dtlsParameters,
      })
      .toPromise();
  }

  public produce(
    roomId: string,
    id,
    kind,
    rtpParameters,
    appData
  ): Promise<{ id: string }> {
    return this.http
      .post(`/api/room/${roomId}/produce`, {
        id,
        kind,
        rtpParameters,
        appData,
      })
      .toPromise() as Promise<{ id: string }>;
  }

  public producerClose(roomId: string, id) {
    return this.http
      .post(`/api/room/${roomId}/producer-close`, {
        id,
      })
      .toPromise() as Promise<object>;
  }

  public getProducers(
    roomId: string
  ): Promise<
    {
      kind: MediaKind;
      producerId: string;
    }[]
  > {
    return this.http
      .get(`/api/room/${roomId}/producers`)
      .toPromise() as Promise<
      {
        kind: MediaKind;
        producerId: string;
      }[]
    >;
  }

  public addConsumer(
    roomId: string,
    id,
    rtpCapabilities,
    producerId
  ): Promise<{ id: string; rtpParameters: RtpParameters }> {
    return this.http
      .post(`/api/room/${roomId}/add-consumer`, {
        id,
        rtpCapabilities,
        producerId,
      })
      .toPromise() as Promise<{ id: string; rtpParameters: RtpParameters }>;
  }

  public resume(roomId: string, id): Promise<object> {
    return this.http
      .post(`/api/room/${roomId}/resume`, {
        id,
      })
      .toPromise();
  }

  public getUsers(roomId): Promise<User[]> {
    return this.http.get(`/api/room/${roomId}/users`).toPromise() as Promise<
      User[]
    >;
  }
}
