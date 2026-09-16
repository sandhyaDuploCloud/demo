import { Routes } from '@angular/router';
import { ListHelmComponent } from './list/list-helm.component';
import { AddHelmComponent } from './add/add-helm.component';
import { ViewHelmComponent } from './view/view-helm.component';

// What the host lazy-loads (manifest frontend.remote.exposedModule = './Extension').
//
// A `Routes` array, not an NgModule: Angular's `loadChildren` accepts either, and the host's
// extension-route-registrar resolves the export named `Extension` and hands it straight to loadChildren.
// The components are standalone and declare their own `imports`, so there is nothing left for a module
// to do. THE EXPORTED CONST MUST STILL BE NAMED `Extension`.
export const Extension: Routes = [
  { path: '', component: ListHelmComponent },
  { path: 'add', component: AddHelmComponent },
  { path: 'view/:id', component: ViewHelmComponent },
];
