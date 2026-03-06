import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface Event {
  event_id?: number;
  title: string;
  description?: string;
  event_date: string;
  resource_id?: number;
  image_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EventsService {

  private baseUrl = 'http://localhost:5000/api/events';

  constructor(private http: HttpClient) {}

getEvents(): Observable<Event[]> {
  return this.http.get<any>(this.baseUrl).pipe(
    map(response => {

      // If backend returns { events: [...] }
      if (response?.events) {
        return response.events;
      }

      // If backend returns array directly
      if (Array.isArray(response)) {
        return response;
      }

      return [];
    })
  );
}

  createEvent(event: Event): Observable<any> {
    return this.http.post(this.baseUrl, event);
  }

  updateEvent(event: Event): Observable<any> {
    return this.http.put(this.baseUrl, event);
  }

  deleteEvent(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  searchByTitle(search: string): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/search/title/${search}`);
  }

  getByDate(date: string): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/date/${date}`);
  }

  getByResource(resourceId: number): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/resource/${resourceId}`);
  }
}