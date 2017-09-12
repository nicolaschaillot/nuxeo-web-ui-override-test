
## Keendoo Web UI Override tests

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

#### Modified
* Modification du gulpfile.js : copie du contenu de nuxeo-web-ui dans .nuxeo-web-ui.

* Pour ajouter des composants bower : ajout d'un keendoo-app/elements, ajouter une tache de vulcanisation, ajouter une ressource comme ci-dessous (cette contrib permet d'ajouter des ressources via login.jsp)
````
<?xml version="1.0"?>

<component name="org.nuxeo.ecm.distribution.sample.resources.contrib">

  <require>org.nuxeo.web.ui.resources</require>

  <extension target="org.nuxeo.ecm.platform.WebResources" point="resources">
    <resource name="sample.html" type="import" shrinkable="false">
      <uri>/ui/sample/sample.html</uri>
    </resource>
  </extension>

  <extension target="org.nuxeo.ecm.platform.WebResources" point="bundles">
    <bundle name="web-ui">
      <resources append="true">
        <resource>sample.html</resource>
      </resources>
    </bundle>
  </extension>

</component>
```