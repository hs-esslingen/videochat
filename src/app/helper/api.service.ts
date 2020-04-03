import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  TransportOptions,
  RtpParameters,
  MediaKind,
  RtpCapabilities
} from "mediasoup-client/lib/types";

@Injectable({
  providedIn: "root"
})
export class ApiService {
  public currentUser: string;


  constructor(private http: HttpClient) {
  }


  public getLogin(): string {
    return this.currentUser;
  }

  public login(email) {
    this.currentUser = email;
  }

  

  public getCapabilities(): Promise<RtpCapabilities> {
    return this.http.get("/api/capabilities").toPromise() as Promise<
      RtpCapabilities
    >;
  }

  public getCreateTransport(): Promise<TransportOptions> {
    return this.http.get("/api/get-media").toPromise() as Promise<
      TransportOptions
    >;
  }

  public connect(id, dtlsParameters): Promise<object> {
    return this.http
      .post("/api/connect", {
        id,
        dtlsParameters
      })
      .toPromise();
  }

  public produce(id, kind, rtpParameters, appData): Promise<{ id: string }> {
    return this.http
      .post("/api/produce", {
        id,
        kind,
        rtpParameters,
        appData
      })
      .toPromise() as Promise<{ id: string }>;
  }

  public getProducers(): Promise<
    {
      kind: MediaKind;
      producerId: string;
    }[]
  > {
    return this.http.get("/api/producers").toPromise() as Promise<
      {
        kind: MediaKind;
        producerId: string;
      }[]
    >;
  }

  public addConsumer(
    id,
    rtpCapabilities,
    producerId
  ): Promise<{ id: string; rtpParameters: RtpParameters }> {
    return this.http
      .post("/api/add-consumer", {
        id,
        rtpCapabilities,
        producerId
      })
      .toPromise() as Promise<{ id: string; rtpParameters: RtpParameters }>;
  }

  public resume(id): Promise<object> {
    return this.http
      .post("/api/resume", {
        id
      })
      .toPromise();
  }
}
