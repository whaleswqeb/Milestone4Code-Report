import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';

import { EventsService, Event } from '../services/events.service';
import { ResourcesService, Resource } from '../services/resources.service';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-events',
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
    MatButtonModule
  ],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {
  title = '';
  event_date: Date | null = null;
  resource_id: number | null = null;
  description = '';
  image_url = '';

  upcomingEvents: Event[] = [];
  resources: Resource[] = [];
  isLoading = false;
  isFormLoading = false; // Separate loading state for form operations
  editingEventId: number | null = null;

  constructor(
    private eventsService: EventsService,
    private resourcesService: ResourcesService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadResources();
    this.loadEvents();
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

  loadEvents(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.eventsService.getEvents()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (events: Event[]) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Process events to ensure dates are properly formatted
          const processedEvents = events.map(event => ({
            ...event,
            event_date: event.event_date
          }));

          this.upcomingEvents = processedEvents
            .filter(event => {
              if (!event.event_date) return false;

              const eventDate = new Date(event.event_date);
              eventDate.setHours(0, 0, 0, 0);

              return eventDate >= today;
            })
            .sort((a, b) =>
              new Date(a.event_date).getTime() -
              new Date(b.event_date).getTime()
            );
        },
        error: (err) => {
          console.error('Error loading events', err);
          this.snackBar.open('Failed to load events', 'Close', { duration: 3000 });
        }
      });
  }

  // 🔹 Load Resources
  loadResources(): void {
    this.resourcesService.getResources()
      .pipe(
        finalize(() => {
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (resources: Resource[]) => {
          this.resources = resources;
        },
        error: () => {
          this.snackBar.open('Failed to load resources', 'Close', { duration: 3000 });
        }
      });
  }

  createEvent(): void {
    if (!this.title || !this.event_date) {
      this.snackBar.open('Title and Date required', 'Close', { duration: 3000 });
      return;
    }

    const eventPayload: Event = {
      event_id: this.editingEventId ?? undefined,
      title: this.title,
      description: this.description,
      event_date: this.formatToMySQLDateTime(this.event_date),
      resource_id: this.resource_id ?? undefined,
      image_url: this.image_url
    };

    this.isFormLoading = true;
    this.cdr.detectChanges();

    const request$ = this.editingEventId
      ? this.eventsService.updateEvent(eventPayload)
      : this.eventsService.createEvent(eventPayload);

    request$
      .pipe(
        finalize(() => {
          this.isFormLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: Event) => {
          // Create a complete event object with all fields
          const completeEvent: Event = {
            event_id: response.event_id || this.editingEventId || Date.now(),
            title: response.title || this.title,
            description: response.description || this.description,
            event_date: response.event_date || this.formatToMySQLDateTime(this.event_date!),
            resource_id: response.resource_id ?? this.resource_id ?? undefined,
            image_url: response.image_url || this.image_url
          };

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const eventDate = new Date(completeEvent.event_date!);
          eventDate.setHours(0, 0, 0, 0);

          // Only add to upcoming events if it's today or future
          if (eventDate >= today) {
            if (this.editingEventId) {
              // UPDATE: Find and replace the existing event
              const index = this.upcomingEvents.findIndex(e => e.event_id === this.editingEventId);
              if (index !== -1) {
                // Create a new array with the updated event
                this.upcomingEvents = [
                  ...this.upcomingEvents.slice(0, index),
                  completeEvent,
                  ...this.upcomingEvents.slice(index + 1)
                ];
              }
            } else {
              // CREATE: Add new event and sort
              this.upcomingEvents = [...this.upcomingEvents, completeEvent];
            }

            // Sort events by date
            this.upcomingEvents.sort((a, b) =>
              new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime()
            );
          }
          
          // Force change detection
          this.cdr.detectChanges();
          
          this.snackBar.open(
            this.editingEventId
              ? 'Event updated successfully'
              : 'Event created successfully',
            'Close',
            { duration: 2500 }
          );

          this.resetForm();
        },
        error: (error) => {
          console.error('Error saving event:', error);
          this.snackBar.open('Failed to save event', 'Close', { duration: 3000 });
        }
      });
  }

  deleteEvent(id: number): void {
    if (!confirm('Delete this event?')) return;

    this.isFormLoading = true;
    this.cdr.detectChanges();

    this.eventsService.deleteEvent(id)
      .pipe(
        finalize(() => {
          this.isFormLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          // Remove from local state immediately
          this.upcomingEvents = this.upcomingEvents.filter(e => e.event_id !== id);
          
          // Force change detection
          this.cdr.detectChanges();
          
          this.snackBar.open('Event deleted successfully', 'Close', {
            duration: 2500
          });
        },
        error: (error) => {
          console.error('Error deleting event:', error);
          this.snackBar.open('Failed to delete event', 'Close', { duration: 3000 });
        }
      });
  }

  cancel(): void {
    this.resetForm();
  }

  getResourceName(resourceId: number | undefined): string {
    if (!resourceId) return 'No Resource';
    const res = this.resources.find(r => r.resource_id === resourceId);
    return res ? res.name : 'Unknown Resource';
  }

  trackEvent(index: number, event: Event): number | undefined {
    return event.event_id;
  }

  editEvent(event: Event): void {
    this.editingEventId = event.event_id ?? null;
    this.title = event.title;
    this.description = event.description ?? '';
    this.event_date = event.event_date
      ? new Date(event.event_date)
      : null;
    this.resource_id = event.resource_id ?? null;
    this.image_url = event.image_url ?? '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  resetForm(): void {
    this.title = '';
    this.event_date = null;
    this.resource_id = null;
    this.description = '';
    this.image_url = '';
    this.editingEventId = null;
    this.cdr.detectChanges();
  }
}