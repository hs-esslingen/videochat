import { Injectable } from "@angular/core";
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from "@angular/router";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  constructor(readonly router: Router, readonly api: ApiService) {}
  async canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    let isLoggedIn = this.api.isLoggedIn;
    if (isLoggedIn == undefined) {
      isLoggedIn = await this.api.checkLogin();
    }

    if (isLoggedIn) {
      return true;
    }

    this.api.redirectUrl = state.url;
    this.router.navigate(["/login"]);
    return false;
  }
}
