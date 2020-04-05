import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { NgModule, Inject, PLATFORM_ID, APP_ID } from "@angular/core";
import {MatCheckboxModule} from '@angular/material/checkbox';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatMenuModule} from '@angular/material/menu';
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { MeetingPageComponent } from "./pages/meeting-page/meeting-page.component";
import { HttpClientModule } from "@angular/common/http";
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { HeaderComponent } from './components/header/header.component';
import { ThankYouPageComponent } from './pages/thank-you-page/thank-you-page.component';
import { UserComponent } from './components/user/user.component';

@NgModule({
  declarations: [AppComponent, MeetingPageComponent, LoginPageComponent, HeaderComponent, ThankYouPageComponent, UserComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    MatMenuModule,
    BrowserAnimationsModule,
    MatCheckboxModule
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
