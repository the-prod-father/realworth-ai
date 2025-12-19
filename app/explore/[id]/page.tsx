'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthContext } from '@/components/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MapIcon, CalendarIcon, ClockIcon, GlobeIcon, ShareIcon, HeartIcon, CheckIcon } from '@/components/icons';
import type { Event, EventType } from '@/services/eventService';

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

export default function EventDetailPage() {
  const params = useParams();
  const { user } = useContext(AuthContext);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<'interested' | 'going' | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${params.id}`);
        const data = await response.json();
        if (data.event) {
          setEvent(data.event);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchEvent();
    }
  }, [params.id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaved(!isSaved);
    // TODO: Call API to save/unsave with supabase.auth.getSession()
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title || 'Check out this event',
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleAttendance = (status: 'interested' | 'going') => {
    if (!user) return;
    setAttendanceStatus(attendanceStatus === status ? null : status);
    // TODO: Call API to update attendance
  };

  const openInMaps = () => {
    if (!event) return;
    const query = encodeURIComponent(`${event.address}, ${event.city}, ${event.state} ${event.zip}`);
    window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-200" />
            <div className="h-4 w-32 rounded bg-slate-200" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Event Not Found</h1>
            <p className="text-slate-600 mb-4">This event may have been cancelled or removed.</p>
            <Link
              href="/explore"
              className="inline-block bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
            >
              Browse Events
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isOwnEvent = user?.id === event.creatorId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />
      <main className="flex-1 p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          {/* Back Link */}
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4"
          >
            <span>&larr;</span> Back to Events
          </Link>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header Image (placeholder) */}
            <div className="h-48 bg-gradient-to-br from-teal-400 to-emerald-500 relative flex items-center justify-center">
              <MapIcon className="w-20 h-20 text-white/30" />

              {/* Type Badge */}
              <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-medium ${EVENT_TYPE_COLORS[event.eventType]}`}>
                {EVENT_TYPE_LABELS[event.eventType]}
              </span>

              {/* Actions */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={handleSave}
                  className={`p-2 rounded-full ${
                    isSaved ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-600'
                  } hover:bg-white transition-colors`}
                >
                  <HeartIcon className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-full bg-white/80 text-slate-600 hover:bg-white transition-colors"
                >
                  <ShareIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Title */}
              <h1 className="text-2xl font-bold text-slate-900 mb-4">
                {event.title}
              </h1>

              {/* Date & Time */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{formatDate(event.startDate)}</p>
                  {event.endDate && event.endDate !== event.startDate && (
                    <p className="text-sm text-slate-600">to {formatDate(event.endDate)}</p>
                  )}
                  {event.startTime && (
                    <p className="text-sm text-slate-600">
                      {formatTime(event.startTime)}
                      {event.endTime && ` - ${formatTime(event.endTime)}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <MapIcon className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{event.address}</p>
                  <p className="text-sm text-slate-600">{event.city}, {event.state} {event.zip}</p>
                  <button
                    onClick={openInMaps}
                    className="text-sm text-teal-600 hover:underline mt-1"
                  >
                    Open in Maps
                  </button>
                </div>
              </div>

              {/* Website */}
              {event.websiteUrl && (
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <GlobeIcon className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <a
                      href={event.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:underline"
                    >
                      {event.websiteUrl}
                    </a>
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">About</h2>
                  <p className="text-slate-600 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              {/* Organizer */}
              {event.creator && (
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h2 className="text-sm font-medium text-slate-500 mb-3">Posted by</h2>
                  <div className="flex items-center gap-3">
                    {event.creator.picture ? (
                      <Image
                        src={event.creator.picture}
                        alt={event.creator.name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-teal-600 font-semibold">
                          {event.creator.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <span className="font-medium text-slate-900">{event.creator.name}</span>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="border-t border-slate-200 pt-4 mt-4 flex items-center gap-4 text-sm text-slate-500">
                <span>{event.viewsCount} views</span>
                <span>&#x2022;</span>
                <span>{event.savesCount} saves</span>
                <span>&#x2022;</span>
                <span>{event.attendeesCount} going</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Bottom CTA */}
      {!isOwnEvent && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button
              onClick={() => handleAttendance('interested')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                attendanceStatus === 'interested'
                  ? 'bg-teal-100 text-teal-700 border-2 border-teal-500'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {attendanceStatus === 'interested' && <CheckIcon className="w-4 h-4" />}
              Interested
            </button>
            <button
              onClick={() => handleAttendance('going')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                attendanceStatus === 'going'
                  ? 'bg-teal-500 text-white'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
            >
              {attendanceStatus === 'going' && <CheckIcon className="w-4 h-4" />}
              Going
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
