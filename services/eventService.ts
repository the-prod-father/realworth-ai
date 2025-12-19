import { supabase, getSupabaseAdmin } from '@/lib/supabase';

export type EventType = 'garage_sale' | 'estate_sale' | 'flea_market' | 'auction' | 'pop_up' | 'other';

export interface Event {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  eventType: EventType;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  categories: string[];
  photos: string[];
  websiteUrl: string | null;
  status: 'active' | 'cancelled' | 'completed';
  isRecurring: boolean;
  recurrencePattern: string | null;
  viewsCount: number;
  savesCount: number;
  attendeesCount: number;
  createdAt: string;
  updatedAt: string;
  // Joined data
  creator?: {
    id: string;
    name: string;
    picture: string;
  };
}

export interface CreateEventData {
  title: string;
  description?: string;
  eventType: EventType;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  categories?: string[];
  photos?: string[];
  websiteUrl?: string;
}

export interface EventFilters {
  eventType?: EventType;
  city?: string;
  state?: string;
  zip?: string;
  startDate?: string;
  endDate?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  limit?: number;
  offset?: number;
}

class EventService {
  /**
   * Create a new event
   */
  async createEvent(
    userId: string,
    data: CreateEventData
  ): Promise<{ event: Event | null; error: string | null }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const { data: event, error } = await supabaseAdmin
        .from('events')
        .insert({
          creator_id: userId,
          title: data.title,
          description: data.description || null,
          event_type: data.eventType,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          lat: data.lat,
          lng: data.lng,
          start_date: data.startDate,
          end_date: data.endDate || null,
          start_time: data.startTime || null,
          end_time: data.endTime || null,
          categories: data.categories || [],
          photos: data.photos || [],
          website_url: data.websiteUrl || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        return { event: null, error: 'Failed to create event' };
      }

      return { event: this.mapEvent(event), error: null };
    } catch (error) {
      console.error('Error in createEvent:', error);
      return { event: null, error: 'Failed to create event' };
    }
  }

  /**
   * Get events with filters
   */
  async getEvents(filters: EventFilters = {}): Promise<Event[]> {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          users!events_creator_id_fkey (
            id,
            name,
            picture
          )
        `)
        .eq('status', 'active')
        .gte('start_date', new Date().toISOString().split('T')[0]) // Only future/current events
        .order('start_date', { ascending: true });

      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }

      if (filters.state) {
        query = query.eq('state', filters.state);
      }

      if (filters.zip) {
        query = query.eq('zip', filters.zip);
      }

      if (filters.startDate) {
        query = query.gte('start_date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('start_date', filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching events:', error);
        return [];
      }

      let events = (data || []).map((row) => this.mapEventWithJoins(row));

      // Filter by radius if lat/lng provided
      if (filters.lat && filters.lng && filters.radiusMiles) {
        events = events.filter((event) => {
          const distance = this.calculateDistance(
            filters.lat!,
            filters.lng!,
            event.lat,
            event.lng
          );
          return distance <= filters.radiusMiles!;
        });
      }

      return events;
    } catch (error) {
      console.error('Error in getEvents:', error);
      return [];
    }
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          users!events_creator_id_fkey (
            id,
            name,
            picture
          )
        `)
        .eq('id', eventId)
        .single();

      if (error || !data) {
        console.error('Error fetching event:', error);
        return null;
      }

      // Increment view count
      await supabase
        .from('events')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', eventId);

      return this.mapEventWithJoins(data);
    } catch (error) {
      console.error('Error in getEvent:', error);
      return null;
    }
  }

  /**
   * Update an event
   */
  async updateEvent(
    userId: string,
    eventId: string,
    updates: Partial<CreateEventData & { status: string }>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Verify ownership
      const { data: event } = await supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single();

      if (!event || event.creator_id !== userId) {
        return { success: false, error: 'Event not found or access denied' };
      }

      const updateData: Record<string, unknown> = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.eventType !== undefined) updateData.event_type = updates.eventType;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.zip !== undefined) updateData.zip = updates.zip;
      if (updates.lat !== undefined) updateData.lat = updates.lat;
      if (updates.lng !== undefined) updateData.lng = updates.lng;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
      if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
      if (updates.categories !== undefined) updateData.categories = updates.categories;
      if (updates.photos !== undefined) updateData.photos = updates.photos;
      if (updates.websiteUrl !== undefined) updateData.website_url = updates.websiteUrl;
      if (updates.status !== undefined) updateData.status = updates.status;

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId);

      if (error) {
        console.error('Error updating event:', error);
        return { success: false, error: 'Failed to update event' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error in updateEvent:', error);
      return { success: false, error: 'Failed to update event' };
    }
  }

  /**
   * Cancel an event
   */
  async cancelEvent(userId: string, eventId: string): Promise<{ success: boolean; error: string | null }> {
    return this.updateEvent(userId, eventId, { status: 'cancelled' });
  }

  /**
   * Save/unsave an event
   */
  async toggleSaveEvent(
    userId: string,
    eventId: string
  ): Promise<{ saved: boolean; error: string | null }> {
    try {
      // Check if already saved
      const { data: existing } = await supabase
        .from('saved_events')
        .select('event_id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (existing) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', userId)
          .eq('event_id', eventId);

        if (error) {
          return { saved: false, error: 'Failed to unsave event' };
        }

        return { saved: false, error: null };
      } else {
        // Add to saved
        const { error } = await supabase
          .from('saved_events')
          .insert({ user_id: userId, event_id: eventId });

        if (error) {
          return { saved: true, error: 'Failed to save event' };
        }

        return { saved: true, error: null };
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      return { saved: false, error: 'Failed to save event' };
    }
  }

  /**
   * Mark attendance for an event
   */
  async markAttendance(
    userId: string,
    eventId: string,
    status: 'interested' | 'going' | 'went'
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('event_attendees')
        .upsert({
          user_id: userId,
          event_id: eventId,
          status,
        });

      if (error) {
        console.error('Error marking attendance:', error);
        return { success: false, error: 'Failed to mark attendance' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error in markAttendance:', error);
      return { success: false, error: 'Failed to mark attendance' };
    }
  }

  /**
   * Get user's saved events
   */
  async getSavedEvents(userId: string): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('saved_events')
        .select(`
          events (
            *,
            users!events_creator_id_fkey (
              id,
              name,
              picture
            )
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching saved events:', error);
        return [];
      }

      return (data || [])
        .filter((row) => row.events)
        .map((row) => this.mapEventWithJoins(row.events as unknown as Record<string, unknown>));
    } catch (error) {
      console.error('Error in getSavedEvents:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two points in miles (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Map database row to Event interface
   */
  private mapEvent(row: Record<string, unknown>): Event {
    return {
      id: row.id as string,
      creatorId: row.creator_id as string,
      title: row.title as string,
      description: row.description as string | null,
      eventType: row.event_type as EventType,
      address: row.address as string,
      city: row.city as string,
      state: row.state as string,
      zip: row.zip as string,
      lat: row.lat as number,
      lng: row.lng as number,
      startDate: row.start_date as string,
      endDate: row.end_date as string | null,
      startTime: row.start_time as string | null,
      endTime: row.end_time as string | null,
      categories: (row.categories as string[]) || [],
      photos: (row.photos as string[]) || [],
      websiteUrl: row.website_url as string | null,
      status: row.status as Event['status'],
      isRecurring: row.is_recurring as boolean,
      recurrencePattern: row.recurrence_pattern as string | null,
      viewsCount: row.views_count as number,
      savesCount: row.saves_count as number,
      attendeesCount: row.attendees_count as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  /**
   * Map database row with joins to Event interface
   */
  private mapEventWithJoins(row: Record<string, unknown>): Event {
    const event = this.mapEvent(row);

    const userData = row.users as Record<string, unknown> | null;
    if (userData) {
      event.creator = {
        id: userData.id as string,
        name: userData.name as string,
        picture: userData.picture as string,
      };
    }

    return event;
  }
}

export const eventService = new EventService();
