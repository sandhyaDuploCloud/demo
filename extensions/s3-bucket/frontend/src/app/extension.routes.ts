import { Routes } from '@angular/router';
import { ListS3BucketComponent } from './list/list-s3-bucket.component';
import { AddS3BucketComponent } from './add/add-s3-bucket.component';
import { ViewS3BucketComponent } from './view/view-s3-bucket.component';

export const Extension: Routes = [
  { path: '', component: ListS3BucketComponent },
  { path: 'add', component: AddS3BucketComponent },
  { path: 'edit/:id', component: AddS3BucketComponent, data: { action: 'Edit' } },
  { path: 'view/:id', component: ViewS3BucketComponent },
];
