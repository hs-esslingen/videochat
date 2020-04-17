import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  TransportOptions,
  RtpParameters,
  MediaKind,
  RtpCapabilities,
} from "mediasoup-client/lib/types";
import { User } from "./media.service";
import { Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  public token: string;
  public redirectUrl: string;
  public isLoggedIn: boolean;

  constructor(private http: HttpClient) {
    this.token = window.localStorage.getItem("token");
  }



  public getLogin(): string {
    return this.token;
  }

  public async checkLogin() {
    try {
      await this.http.get(`/auth/check`).toPromise();
      this.isLoggedIn = true;
      return true;
    } catch (e) {
      try {
        if (this.token) {
          await this.jwtLogin();
          this.isLoggedIn = true;
          return true;
        }
      } catch (e) {}
      
      this.isLoggedIn = false;
      return false;
    }
  }

  public async emailLogin(email: string) {
    return this.http.post(`/auth/email`, { email }).toPromise() as Promise<{
      token?: string;
    }>;
  }

  public async jwtLogin() {
    try {
      await this.http
        .get(`/auth/jwt`, {
          headers: {
            "x-token": this.token,
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
    window.localStorage.removeItem("token");
    return this.http.get(`/auth/logout`).toPromise() as Promise<{
      token?: string;
    }>;
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
