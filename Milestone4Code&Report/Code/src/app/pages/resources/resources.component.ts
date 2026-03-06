import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';

import { ResourcesService, Resource } from '../services/resources.service';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss']
})
export class ResourcesComponent implements OnInit {
  // Form Fields
  name = '';
  category = '';
  location = '';
  availability_status = true;
  last_updated: Date | null = null;
  image_url = '';

  // List of resources
  resources: Resource[] = [];
  isLoading = false;
  isFormLoading = false;
  editingResourceId: number | null = null;

  constructor(
    private resourcesService: ResourcesService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadResources();
  }

  // 🔹 Convert Date to MySQL format
  private formatToMySQLDateTime(date: Date): string {
    const pad = (n: number) => n < 10 ? '0' + n : n;

    return date.getFullYear() + '-' +
      pad(date.getMonth() + 1) + '-' +
      pad(date.getDate()) + ' ' +
      pad(date.getHours()) + ':' +
      pad(date.getMinutes()) + ':' +
      pad(date.getSeconds());
  }

  // Load all resources
  loadResources(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.resourcesService.getResources()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (resources: Resource[]) => {
          // Sort resources by ID or date to show newest first
          this.resources = resources.sort((a, b) => 
            (b.resource_id || 0) - (a.resource_id || 0)
          );
        },
        error: (err) => {
          console.error('Error loading resources', err);
          this.snackBar.open('Failed to load resources', 'Close', { duration: 3000 });
        }
      });
  }

  // Create or Update a resource
 // Create or Update a resource
createResource(): void {
  if (!this.name || !this.category) {
    this.snackBar.open('Name and Category are required', 'Close', { duration: 3000 });
    return;
  }

  const resourcePayload: Resource = {
    resource_id: this.editingResourceId ?? undefined,
    name: this.name,
    category: this.category,
    location: this.location,
    availability_status: this.availability_status,
    last_updated: this.last_updated ? this.formatToMySQLDateTime(this.last_updated) : '',
    image_url: this.image_url
  };

  this.isFormLoading = true;
  this.cdr.detectChanges();

  const request$ = this.editingResourceId
    ? this.resourcesService.updateResource(resourcePayload)
    : this.resourcesService.createResource(resourcePayload);

  request$
    .pipe(
      finalize(() => {
        this.isFormLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (response: Resource) => {
        if (this.editingResourceId) {
          // UPDATE: Find and replace the existing resource
          const index = this.resources.findIndex(r => r.resource_id === this.editingResourceId);
          if (index !== -1) {
            // Create a complete resource object, preserving the existing ID
            const updatedResource: Resource = {
              resource_id: this.editingResourceId, // Use the existing ID
              name: response.name || this.name,
              category: response.category || this.category,
              location: response.location || this.location,
              availability_status: response.availability_status ?? this.availability_status,
              last_updated: response.last_updated || this.last_updated?.toString() || '',
              image_url: response.image_url || this.image_url
            };
            
            // Create a new array with the updated resource
            this.resources = [
              ...this.resources.slice(0, index),
              updatedResource,
              ...this.resources.slice(index + 1)
            ];
          }
        } else {
          // CREATE: Add new resource at the beginning
          const newResource: Resource = {
            resource_id: response.resource_id,
            name: response.name || this.name,
            category: response.category || this.category,
            location: response.location || this.location,
            availability_status: response.availability_status ?? this.availability_status,
            last_updated: response.last_updated || this.last_updated?.toString() || '',
            image_url: response.image_url || this.image_url
          };
          
          this.resources = [newResource, ...this.resources];
        }
        
        // Force change detection
        this.cdr.detectChanges();
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 100);
        
        this.snackBar.open(
          this.editingResourceId
            ? 'Resource updated successfully'
            : 'Resource created successfully',
          'Close',
          { duration: 2500 }
        );

        this.resetForm();
      },
      error: (error) => {
        console.error('Error saving resource:', error);
        this.snackBar.open('Failed to save resource', 'Close', { duration: 3000 });
      }
    });
}

  // Delete a resource
  deleteResource(resource_id: number): void {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    this.isFormLoading = true;
    this.cdr.detectChanges();

    this.resourcesService.deleteResource(resource_id)
      .pipe(
        finalize(() => {
          this.isFormLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          // Remove from local state by creating a new array
          this.resources = this.resources.filter(r => r.resource_id !== resource_id);
          
          // Force multiple change detections
          this.cdr.detectChanges();
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 100);
          
          this.snackBar.open('Resource deleted successfully', 'Close', {
            duration: 2500
          });
        },
        error: (error) => {
          console.error('Error deleting resource', error);
          this.snackBar.open('Failed to delete resource', 'Close', { duration: 3000 });
        }
      });
  }

  // Edit a resource
  editResource(resource: Resource): void {
    this.editingResourceId = resource.resource_id ?? null;
    this.name = resource.name;
    this.category = resource.category;
    this.location = resource.location || '';
    this.availability_status = resource.availability_status ?? true;
    this.last_updated = resource.last_updated ? new Date(resource.last_updated) : null;
    this.image_url = resource.image_url || '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  // Reset form fields
  cancel(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.name = '';
    this.category = '';
    this.location = '';
    this.availability_status = true;
    this.last_updated = null;
    this.image_url = '';
    this.editingResourceId = null;
    this.cdr.detectChanges();
  }

  // TrackBy for performance
  trackResource(index: number, resource: Resource): number | undefined {
    return resource.resource_id;
  }
}