import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface Resource {
  resource_id?: number;        
  name: string;                
  category: string;            
    location?: string;         
  availability_status: boolean; 
  last_updated?: string;       
  image_url?: string;          
}

@Injectable({
  providedIn: 'root'
})
export class ResourcesService {

  private baseUrl = 'http://localhost:5000/api/resources';

  constructor(private http: HttpClient) {}

getResources(): Observable<Resource[]> {
  return this.http
    .get<{ resources: Resource[] }>(this.baseUrl)
    .pipe(map(response => response.resources));
}

  createResource(resource: Resource): Observable<any> {
    return this.http.post(this.baseUrl, resource);
  }

  updateResource(resource: Resource): Observable<any> {
    return this.http.put(this.baseUrl, resource);
  }

  deleteResource(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  searchByName(search: string): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.baseUrl}/search/name/${search}`);
  }

  getByCategory(category: string): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.baseUrl}/category/${category}`);
  }

  getByAvailability(status: string): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.baseUrl}/availability/${status}`);
  }
}