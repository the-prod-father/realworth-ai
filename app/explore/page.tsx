'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SearchIcon, MapIcon, CalendarIcon, LocationIcon } from '@/components/icons';
import type { Event, EventType } from '@/services/eventService';

// Dynamically import map to avoid SSR issues
const EventMap = dynamic(() => import('@/components/EventMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center">
      <div className="text-slate-400">Loading map...</div>
    </div>
  ),
});

const EVENT_TYPES: { value: EventType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'garage_sale', label: 'Garage Sales' },
  { value: 'estate_sale', label: 'Estate Sales' },
  { value: 'flea_market', label: 'Flea Markets' },
  { value: 'auction', label: 'Auctions' },
  { value: 'pop_up', label: 'Pop-up Shops' },
];

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  garage_sale: 'Garage Sale',
  estate_sale: 'Estate Sale',
  flea_market: 'Flea Market',
  auction: 'Auction',
  pop_up: 'Pop-up Shop',
  other: 'Other',
};

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  garage_sale: 'bg-green-100 text-green-800',
  estate_sale: 'bg-purple-100 text-purple-800',
  flea_market: 'bg-orange-100 text-orange-800',
  auction: 'bg-blue-100 text-blue-800',
  pop_up: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function ExplorePage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<EventType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showThisWeekend, setShowThisWeekend] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Get user's location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (error) => {
        console.log('Location error:', error);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Request location on mount for map view
  useEffect(() => {
    if (viewMode === 'map' && !userLocation) {
      getUserLocation();
    }
  }, [viewMode, userLocation, getUserLocation]);

  const handleEventClick = useCallback((event: Event) => {
    router.push(`/explore/${event.id}`);
  }, [router]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') {
        params.set('eventType', selectedType);
      }
      if (showThisWeekend) {
        // Calculate this weekend's dates
        const today = new Date();
        const dayOfWeek = today.getDay();
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + (6 - dayOfWeek));
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);

        params.set('startDate', saturday.toISOString().split('T')[0]);
        params.set('endDate', sunday.toISOString().split('T')[0]);
      }

      const response = await fetch(`/api/events?${params.toString()}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedType, showThisWeekend]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filter events by search query (client-side)
  const filteredEvents = events.filter((event) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title?.toLowerCase().includes(query) ||
      event.city?.toLowerCase().includes(query) ||
      event.address?.toLowerCase().includes(query)
    );
  });

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />
      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Explore Events</h1>
              <p className="text-slate-600">Find garage sales, estate sales, and events near you</p>
            </div>
            <Link
              href="/explore/create"
              className="bg-teal-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
            >
              Post Event
            </Link>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            {/* Search */}
            <div className="relative mb-4">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, locations..."
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Event Type Pills */}
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedType === type.value
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* This Weekend Toggle */}
              <button
                onClick={() => setShowThisWeekend(!showThisWeekend)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  showThisWeekend
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                This Weekend
              </button>

              {/* Near Me Button */}
              <button
                onClick={() => {
                  getUserLocation();
                  setViewMode('map');
                }}
                disabled={locationLoading}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  userLocation
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } disabled:opacity-50`}
              >
                <LocationIcon className="w-4 h-4" />
                {locationLoading ? 'Finding...' : userLocation ? 'Near Me' : 'Use Location'}
              </button>

              {/* View Toggle */}
              <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Map
                </button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-slate-600">
            {loading ? 'Loading...' : `${filteredEvents.length} events found`}
          </div>

          {/* Content */}
          {viewMode === 'list' ? (
            /* List View */
            loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow animate-pulse p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-slate-200 rounded-lg" />
                      <div className="flex-1">
                        <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
                        <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <MapIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No events found</h3>
                <p className="text-slate-600 mb-4">
                  Be the first to post an event in your area!
                </p>
                <Link
                  href="/explore/create"
                  className="inline-block bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
                >
                  Post an Event
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/explore/${event.id}`}
                    className="block bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-4"
                  >
                    <div className="flex gap-4">
                      {/* Date Box */}
                      <div className="w-20 h-20 bg-teal-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs text-teal-600 font-medium">
                          {new Date(event.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-2xl font-bold text-teal-600">
                          {new Date(event.startDate + 'T00:00:00').getDate()}
                        </span>
                        <span className="text-xs text-teal-600">
                          {new Date(event.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>

                      {/* Event Info */}
                      <div className="flex-1 min-w-0">
                        {/* Type Badge */}
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${EVENT_TYPE_COLORS[event.eventType]}`}>
                          {EVENT_TYPE_LABELS[event.eventType]}
                        </span>

                        {/* Title */}
                        <h3 className="font-semibold text-slate-900 truncate">
                          {event.title}
                        </h3>

                        {/* Location */}
                        <p className="text-sm text-slate-600 truncate">
                          {event.city}, {event.state}
                        </p>

                        {/* Time */}
                        {event.startTime && (
                          <p className="text-sm text-slate-500">
                            {formatTime(event.startTime)}
                            {event.endTime && ` - ${formatTime(event.endTime)}`}
                          </p>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex flex-col items-end justify-center text-sm text-slate-500">
                        <span>{event.attendeesCount} going</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            /* Map View */
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <EventMap
                events={filteredEvents}
                userLocation={userLocation}
                onEventClick={handleEventClick}
                className="h-[500px] md:h-[600px]"
              />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
