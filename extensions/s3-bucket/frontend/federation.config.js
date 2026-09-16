const { withNativeFederation, share, NG_SKIP_LIST } =
  require('@angular-architects/native-federation/config');

const REMOTE_NAME = 'duploExtensionS3Bucket';

module.exports = withNativeFederation({
  name: REMOTE_NAME,

  exposes: {
    './Extension': './src/app/extension.routes.ts',
  },

  shared: {
    ...share({
      '@angular/core':              { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@angular/common':            { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@angular/forms':             { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@angular/router':            { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@angular/platform-browser':  { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@angular/cdk':               { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@angular/material':          { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      'rxjs':                       { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@ng-bootstrap/ng-bootstrap': { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@ngx-translate/core':        { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      'ngx-toastr':                 { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@ng-select/ng-select':       { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@swimlane/ngx-datatable':    { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      'ngx-markdown':               { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      'ngx-monaco-editor-v2':       { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      '@ngbracket/ngx-layout':      { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      'ngx-echarts':                { singleton: true, strictVersion: false, requiredVersion: 'auto' },
      'angularx-flatpickr':         { singleton: true, strictVersion: false, requiredVersion: 'auto' },
    }),
  },

  skip: [
    ...NG_SKIP_LIST,
    /\/schematics(\/|$)/,
    '@ngbracket/ngx-layout/server',
  ],
});
