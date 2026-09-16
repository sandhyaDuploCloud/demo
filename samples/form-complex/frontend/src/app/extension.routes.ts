import { Routes } from '@angular/router';
import { ListAppSvcComponent } from './list/list-appsvc.component';
import { AddAppSvcComponent } from './add/add-appsvc.component';
import { ViewAppSvcComponent } from './view/view-appsvc.component';

// What the host lazy-loads (manifest frontend.remote.exposedModule = './Extension').
//
// A `Routes` array, not an NgModule: Angular's `loadChildren` accepts either, and the host's
// extension-route-registrar resolves the export named `Extension` and hands it straight to loadChildren.
// The components are standalone and declare their own `imports`, so there is nothing left for a module
// to do. THE EXPORTED CONST MUST STILL BE NAMED `Extension`.
export const Extension: Routes = [
  { path: '', component: ListAppSvcComponent },
  { path: 'add', component: AddAppSvcComponent },
  { path: 'view/:id', component: ViewAppSvcComponent },
];
