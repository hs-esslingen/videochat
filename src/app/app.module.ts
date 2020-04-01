import { BrowserModule } from "@angular/platform-browser";
import { NgModule, Inject, PLATFORM_ID, APP_ID } from "@angular/core";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { MeetingPageComponent } from "./pages/meeting-page/meeting-page.component";
import { HttpClientModule } from "@angular/common/http";

@NgModule({
  declarations: [AppComponent, MeetingPageComponent],
  imports: [
    BrowserModule.withServerTransition({ appId: "videochat" }),
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(APP_ID) private appId: string
  ) {}
}
