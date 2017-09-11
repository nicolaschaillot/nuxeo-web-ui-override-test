
## Keendoo Web UI Override tests

> Ongoing work to build a new Nuxeo Web UI. See [demo](https://webui-demo.nuxeo.com/nuxeo/ui/), use `demo`/`demo` for credentials.

## Getting Started

### Install dependencies

```sh
npm install -g gulp bower && npm install && bower install
```

### Development workflow

#### Serve / watch

```sh
gulp serve
```

This outputs an IP address you can use to locally test and another that can be used on devices connected to your network.

#### Run tests

```sh
gulp test:local
```

This runs the unit tests defined in the `app/test` directory through [web-component-tester](https://github.com/Polymer/web-component-tester).

#### Build & Vulcanize

```sh
gulp
```

Build and optimize the current project, ready for deployment. This includes linting as well as vulcanization, image, script, stylesheet and HTML optimization and minification.

