import { Routes } from '@angular/router';
import { ListPasswordGeneratorComponent } from './list/list-password-generator.component';
import { AddPasswordGeneratorComponent } from './add/add-password-generator.component';
import { ViewPasswordGeneratorComponent } from './view/view-password-generator.component';

// What the host lazy-loads (manifest frontend.remote.exposedModule = './Extension').
//
// A `Routes` array, not an NgModule: Angular's `loadChildren` accepts either, and the host's
// extension-route-registrar resolves the export named `Extension` and hands it straight to loadChildren.
// The components are standalone and declare their own `imports`, so there is nothing left for a module
// to do. THE EXPORTED CONST MUST STILL BE NAMED `Extension`.
export const Extension: Routes = [
  { path: '', component: ListPasswordGeneratorComponent },
  { path: 'add', component: AddPasswordGeneratorComponent },
  { path: 'view/:id', component: ViewPasswordGeneratorComponent },
];
