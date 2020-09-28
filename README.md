# Videochat

## Install dependencies

check requirements: [mediasoup installation requirements](https://mediasoup.org/documentation/v3/mediasoup/installation/)<br/>

Windows:
 - Add python.exe to `$PYTHON`
 - Add msbuild.exe to `$PATH`  


Run `npm i` to install all requied dependencies.

## Development server

Copy `.env.example` to `.env`

Run `npm run watch-debug` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.
Linux: Please ensure that `mediasoup-worker` inside `dist/worker/mediasoup-worker` is marked as an executable

## Code scaffolding

To use `ng` install Angular cli with `npm install -g @angular/cli`  
Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Docker Build
`docker build . -t <tagname>`

## Docker Installation
1. create docker-compose.yml from the example below
2. rename and configure `.env.example` to `.env`
3. create a cert folter
4. Create a certificate for Shibboleth and let the DFN verify it.  
   [See DFN](https://doku.tid.dfn.de/en:certificates) for more information  
   Save the certificate Files as `key.pem` and `cert.pem` to the cert folder.
5. Get the Certificate from the HSE IDP and save it as `idp_cert.pem` to the cert folder. [HSE IDP](https://idp.hs-esslingen.de/idp/shibboleth)
[Siehe HSE IDP Metadata](https://idp.hs-esslingen.de/idp/shibboleth)
6. The stack can now be started with `docker-compose up -d`

This project requires a reverse proxy like `nginx` which provides the ssl encryption.

### docker-compose.yml
```
version: "2"

networks:
  videochat:
    external: false


services:
  videochat:
    container_name: videochat
    image: codinglion/videochat
    restart: always
    environment:
      - SESSION_STORE_URL=redis
    volumes:
      - ./cert:/app/dist/cert
      - .env:/app/.env
    network_mode: "host"
    depends_on:
      - redis
  redis:
    image: redis
    restart: always
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - videochat
```
## Administration
After the installation is successful the project reqires no further administration.
