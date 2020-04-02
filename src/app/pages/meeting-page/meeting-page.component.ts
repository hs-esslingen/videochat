import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ElementRef
} from "@angular/core";
import { Device } from "mediasoup-client";
import { Http2ServerRequest } from "http2";
import { HttpClient } from "@angular/common/http";
import {
  TransportOptions,
  Transport,
  Consumer,
  Producer,
  RtpParameters,
  MediaKind
} from "mediasoup-client/lib/types";
import { RtpCapabilities } from "mediasoup/lib/types";
import { environment } from 'src/environments/environment';

@Component({
  selector: "app-meeting-page",
  templateUrl: "./meeting-page.component.html",
  styleUrls: ["./meeting-page.component.scss"]
})
export class MeetingPageComponent implements OnInit, AfterViewInit {
  @ViewChild("local") local: ElementRef<HTMLVideoElement>;
  device: Device;
  localStream: MediaStream;
  localVideoProducer: Producer;
  localAudioProducer: Producer;
  videoConsumers: {
    consumer: Consumer;
    stream: MediaStream;
  }[] = [];
  audioConsumers: {
    consumer: Consumer;
    stream: MediaStream;
  }[] = [];
  recvTransport: Transport;
  sendTransport: Transport;
  websocket: WebSocket;

  constructor(private http: HttpClient) {
    const url = new URL(window.location.href);
    console.log(url.host);
  }

  ngOnInit(): void {
    if (environment.production) {
      const url = new URL(window.location.href);
      this.websocket = new WebSocket("wss://"+url.host+"/ws");
    } else {
      this.websocket = new WebSocket("ws://localhost:4000/ws");
    }

    this.websocket.onopen = event => {
      console.log("websocket opened");
    };
    this.websocket.addEventListener("message", ev => {
      const data = JSON.parse(ev.data);
      switch (data.type) {
        case "new-producer":
          this.addConsumer(data.data.producerId, data.data.kind);
          break;
        case "remove-producer":
          this.removeConsumer(data.data.id, data.data.kind);
          break;

        default:
          break;
      }
      console.log(data);
    });
  }

  removeConsumer(id: string, kind: string) {
    console.log(kind);
    let list = kind === "video" ? this.videoConsumers : this.audioConsumers;
    console.log(list.length);
    list = list.filter(item => item.consumer.producerId !== id);
    console.log(list.length);
    if (kind === "video") {
      this.videoConsumers = list;
      //@ts-ignore
      window.test = list;
    } else {
      this.audioConsumers = list;
    }
  }

  trackByFn(index, item) {
    console.log("trackFn:");
    console.log(item);
    if (!item) return null;
    console.log(item.consumer.producerId);
    return item.consumer.producerId; // or item.id
  }

  async ngAfterViewInit(): Promise<void> {
    console.log(this.local.nativeElement);
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      this.local.nativeElement.srcObject = this.localStream;
      this.local.nativeElement.volume = 0;
      this.device = new Device();
      const routerRtpCapabilities = (await await this.http
        .get("/api/capabilities")
        .toPromise()) as RtpCapabilities;
      console.log(routerRtpCapabilities);
      await this.device.load({
        routerRtpCapabilities
      });

      await this.createSendTransport();
      await this.createRecvTransport();

      await this.addExistingConsumers();

      await this.sendVideo();
      await this.sendAudio();

      this.websocket.send(JSON.stringify({
        type: "init",
        data: {
          transports: [
            this.sendTransport.id,
            this.recvTransport.id
          ]
        }
      }))
    } catch (err) {
      console.error(err);
    }
  }

  async addExistingConsumers() {
    console.log("GET CONSUMER");
    const producers = (await this.http.get("/api/producers").toPromise()) as {
      kind: MediaKind;
      producerId: string;
    }[];
    for (const prod of producers) {
      if (
        this.videoConsumers.find(
          item => item.consumer.id === prod.producerId
        ) == undefined &&
        this.audioConsumers.find(
          item => item.consumer.id === prod.producerId
        ) == undefined
      ) {
        await this.addConsumer(prod.producerId, prod.kind);
      }
    }
  }

  async addConsumer(producerId, kind) {
    console.log("ADDING");

    if (
      producerId === this.localVideoProducer?.id ||
      producerId === this.localAudioProducer?.id
    )
      return;
    const consume = (await this.http
      .post("/api/add-consumer", {
        id: this.recvTransport.id,
        rtpCapabilities: this.device.rtpCapabilities,
        producerId
      })
      .toPromise()) as { id: string; rtpParameters: RtpParameters };

    const consumer = await this.recvTransport.consume({
      id: consume.id,
      kind,
      producerId,
      rtpParameters: consume.rtpParameters
    });

    await this.http
      .post("/api/resume", {
        id: consume.id
      })
      .toPromise();

    if (consumer.kind === "video")
      this.videoConsumers.push({
        consumer,
        stream: new MediaStream([consumer.track])
      });
    else {
      this.audioConsumers.push({
        consumer,
        stream: new MediaStream([consumer.track])
      });
    }

    consumer.on("transportclose", () => {
      console.log("track close");
      this.removeConsumer(consumer.id, consumer.kind);
    });
    consumer.on("trackended", () => {
      console.log("track ended");
      this.removeConsumer(consumer.id, consumer.kind);
    });
    console.log(consumer);
  }

  async createSendTransport() {
    const params = (await this.http
      .get("/api/get-media")
      .toPromise()) as TransportOptions;
    this.sendTransport = this.device.createSendTransport(params);
    this.addProduceCallbacks(this.sendTransport);
  }

  async createRecvTransport() {
    const params = (await this.http
      .get("/api/get-media")
      .toPromise()) as TransportOptions;
    this.recvTransport = this.device.createRecvTransport(params);
    this.addProduceCallbacks(this.recvTransport);
  }

  async sendVideo() {
    this.localVideoProducer = await this.sendTransport.produce({
      track: this.localStream.getVideoTracks()[0],
      encodings: [
        { maxBitrate: 96000, scaleResolutionDownBy: 4 },
        { maxBitrate: 680000, scaleResolutionDownBy: 1 }
      ]
    });
  }

  async sendAudio() {
    this.localAudioProducer = await this.sendTransport.produce({
      track: this.localStream.getAudioTracks()[0].clone()
    });
  }

  addProduceCallbacks(transport: Transport) {
    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      // Signal local DTLS parameters to the server side transport.
      try {
        await this.http
          .post("/api/connect", {
            id: transport.id,
            dtlsParameters
          })
          .toPromise();
        // Tell the transport that parameters were transmitted.
        console.log("CONNECTED");
        callback();
      } catch (error) {
        // Tell the transport that something was wrong.
        console.error(error);
        errback(error);
      }
    });

    transport.on("produce", async (parameters, callback, errback) => {
      console.log("PRODUCE");
      const { id } = (await this.http
        .post("/api/produce", {
          id: transport.id,
          kind: parameters.kind,
          rtpParameters: parameters.rtpParameters,
          appData: parameters.appData
        })
        .toPromise()) as { id: string };
      callback({ id });
    });
  }
}
