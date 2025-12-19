'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Event, EventType } from '@/services/eventService';

// Mapbox access token - set in env
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  garage_sale: '#22c55e', // green
  estate_sale: '#a855f7', // purple
  flea_market: '#f97316', // orange
  auction: '#3b82f6', // blue
  pop_up: '#ec4899', // pink
  other: '#6b7280', // gray
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  garage_sale: 'Garage Sale',
  estate_sale: 'Estate Sale',
  flea_market: 'Flea Market',
  auction: 'Auction',
  pop_up: 'Pop-up Shop',
  other: 'Other',
};

interface EventMapProps {
  events: Event[];
  userLocation?: { lat: number; lng: number } | null;
  onEventClick?: (event: Event) => void;
  className?: string;
}

export const EventMap: React.FC<EventMapProps> = ({
  events,
  userLocation,
  onEventClick,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_TOKEN) {
      setMapError('Map configuration pending. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your environment.');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: userLocation ? [userLocation.lng, userLocation.lat] : [-98.5795, 39.8283], // Center of US
        zoom: userLocation ? 10 : 4,
        attributionControl: false,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        'top-right'
      );

      // Add user location control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        'top-right'
      );

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError('Failed to load map');
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [userLocation]);

  // Update markers when events change
  const updateMarkers = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    events.forEach((event) => {
      if (!event.lat || !event.lng) return;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'event-marker';
      el.style.cssText = `
        width: 36px;
        height: 36px;
        background-color: ${EVENT_TYPE_COLORS[event.eventType]};
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      `;

      // Add icon based on event type
      const icon = document.createElement('span');
      icon.style.cssText = 'font-size: 16px; filter: brightness(10);';
      icon.textContent = getEventIcon(event.eventType);
      el.appendChild(icon);

      // Hover effect
      el.onmouseenter = () => {
        el.style.transform = 'scale(1.2)';
        el.style.zIndex = '10';
      };
      el.onmouseleave = () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
      };

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        maxWidth: '280px',
      }).setHTML(`
        <div style="padding: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="
              background: ${EVENT_TYPE_COLORS[event.eventType]}20;
              color: ${EVENT_TYPE_COLORS[event.eventType]};
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 500;
            ">${EVENT_TYPE_LABELS[event.eventType]}</span>
          </div>
          <h3 style="font-weight: 600; color: #1e293b; margin: 0 0 4px 0; font-size: 14px;">
            ${event.title}
          </h3>
          <p style="color: #64748b; margin: 0 0 4px 0; font-size: 12px;">
            ${event.city}, ${event.state}
          </p>
          <p style="color: #0d9488; font-size: 12px; font-weight: 500; margin: 0;">
            ${formatEventDate(event.startDate)}${event.startTime ? ' at ' + formatTime(event.startTime) : ''}
          </p>
          ${event.attendeesCount > 0 ? `
            <p style="color: #94a3b8; font-size: 11px; margin-top: 4px;">
              ${event.attendeesCount} people going
            </p>
          ` : ''}
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([event.lng, event.lat])
        .setPopup(popup)
        .addTo(map.current!);

      // Show popup on hover
      el.addEventListener('mouseenter', () => {
        marker.togglePopup();
      });
      el.addEventListener('mouseleave', () => {
        marker.togglePopup();
      });

      // Handle click
      el.addEventListener('click', () => {
        if (onEventClick) {
          onEventClick(event);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (events.length > 0 && !userLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      events.forEach((event) => {
        if (event.lat && event.lng) {
          bounds.extend([event.lng, event.lat]);
        }
      });

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 12,
        });
      }
    }
  }, [events, mapLoaded, onEventClick, userLocation]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Show error state
  if (mapError) {
    return (
      <div className={`bg-slate-100 rounded-2xl flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Map Coming Soon</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            {mapError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-3 max-w-[200px]">
        <p className="text-xs font-medium text-slate-500 mb-2">Event Types</p>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(EVENT_TYPE_LABELS).slice(0, 4).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: EVENT_TYPE_COLORS[type as EventType] }}
              />
              <span className="text-xs text-slate-600 truncate">{label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event count badge */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md px-3 py-1.5">
        <span className="text-sm font-medium text-slate-700">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>
    </div>
  );
};

// Helper functions
function getEventIcon(eventType: EventType): string {
  const icons: Record<EventType, string> = {
    garage_sale: '🏠',
    estate_sale: '🏛️',
    flea_market: '🛒',
    auction: '🔨',
    pop_up: '🏪',
    other: '📍',
  };
  return icons[eventType] || '📍';
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default EventMap;
