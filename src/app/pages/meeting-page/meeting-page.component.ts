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
  consumers: Consumer[] = [];
  recvTransport: Transport;
  sendTransport: Transport;
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log(this.local);
  }

  getMediaStream(consumer: Consumer) {
    return new MediaStream([consumer.track]);
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

      await this.sendVideo();
      await this.sendAudio();
    } catch (err) {
      console.error(err);
    }
  }

  async addConsumer() {
    console.log("GET CONSUMER");
    const producers = (await this.http.get("/api/producers").toPromise()) as {
      kind: MediaKind;
      producerId: string;
    }[];
    producers.forEach(async prod => {
      if (
        prod.kind === "video" &&
        this.consumers.find(
          conumer => conumer.producerId === prod.producerId
        ) == undefined
      ) {
        console.log("ADDING");
        const consume = (await this.http
          .post("/api/add-consumer", {
            id: this.recvTransport.id,
            rtpCapabilities: this.device.rtpCapabilities,
            producerId: prod.producerId
          })
          .toPromise()) as { id: string; rtpParameters: RtpParameters };

        const consumer = await this.recvTransport.consume({
          id: consume.id,
          kind: prod.kind,
          producerId: prod.producerId,
          rtpParameters: consume.rtpParameters
        });

        await this.http
          .post("/api/resume", {
            id: consume.id
          })
          .toPromise();

        this.consumers.push(consumer);
        consumer.on("close", () => {
          this.consumers = this.consumers.filter(cons => cons !== consumer);
        });
        console.log(consumer);
      }
    });

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
