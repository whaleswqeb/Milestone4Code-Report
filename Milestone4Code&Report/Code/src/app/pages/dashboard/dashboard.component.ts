import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourcesService, Resource } from '../services/resources.service';
import { EventsService, Event } from '../services/events.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']

})
export class DashboardComponent implements OnInit {

  resources: Resource[] = [];
  upcomingEvents: Event[] = [];

  totalResources = 0;
  upcomingEventsCount = 0;

  isLoading = true;

  private loadedCalls = 0;

  constructor(
    private resourcesService: ResourcesService,
    private eventsService: EventsService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchResources();
    this.fetchEvents();
  }

  private fetchResources() {
    this.resourcesService.getResources().subscribe({
      next: (data) => {
        this.resources = data || [];
        this.totalResources = this.resources.length;
        this.checkLoadingComplete();
      },
      error: (err) => {
        console.error('Resources error:', err);
        this.checkLoadingComplete();
      }
    });
  }

  private fetchEvents() {
    this.eventsService.getEvents().subscribe({
      next: (data) => {
        const today = new Date();

        this.upcomingEvents = (data || []).filter(event =>
          new Date(event.event_date) >= today
        );

        this.upcomingEventsCount = this.upcomingEvents.length;
        this.checkLoadingComplete();
      },
      error: (err) => {
        console.error('Events error:', err);
        this.checkLoadingComplete();
      }
    });
  }

  private checkLoadingComplete() {
    this.loadedCalls++;

    if (this.loadedCalls === 2) {
      this.isLoading = false;
      this.cd.detectChanges(); // 🔥 Force UI update
    }
  }

  trackByResource(index: number, item: Resource) {
    return item.resource_id;
  }

  trackByEvent(index: number, item: Event) {
    return item.event_id;
  }

  onImageError(event: any) {
    event.target.src = 'https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFycmlhZ2UlMjBoYWxsfGVufDB8fDB8fHww';
  }
}