import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  TransportOptions,
  RtpParameters,
  MediaKind,
  RtpCapabilities,
} from "mediasoup-client/lib/types";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  public currentUser: string;

  constructor(private http: HttpClient) {
    this.currentUser = window.localStorage.getItem("email");
  }

  public getLogin(): string {
    return this.currentUser;
  }

  public login(email) {
    window.localStorage.setItem("email", email);
    this.currentUser = email;
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
    return this.http.get(`/api/room/${roomId}/producers`).toPromise() as Promise<
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
}
