
'use client'

/**
 * 🌾 AI‑Powered Agriculture Assistant - V4 (Cloud-Powered Architecture)
 * This version refactors the application to use a full-stack architecture with
 * a Prisma/MongoDB backend, making data persistent and accessible across devices.
 *
 * Key Architectural Changes:
 * - API-Driven State: All data (fields, chat messages) is fetched from and
 *   persisted to the backend via Next.js API routes. localStorage is removed.
 * - CRUD Operations: All user actions (create, update, delete fields) now
 *   trigger API calls to the server to modify the database.
 * - Persistent Chat History: Chat messages are loaded from the database when a
 *   field is selected and each new message is saved, ensuring conversations
 *   are never lost.
 * - Scalability: The backend is designed to be stateless, allowing both the
 *   Next.js frontend and a future mobile app to use the same API endpoints.
 */

import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression, Icon as LeafletIcon } from "leaflet";
// ADDED: Import for Calendar component
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';


// =============================================================================
// Types
// =============================================================================
interface VisualCrossingDay {
  datetime: string; tempmax: number; tempmin: number; temp: number; feelslikemax?: number; feelslikemin?: number; feelslike?: number; dew?: number; humidity?: number; precip?: number; precipprob?: number; windgust?: number; windspeed?: number; winddir?: number; pressure?: number; cloudcover?: number; visibility?: number; uvindex?: number; sunrise?: string; sunset?: string; description?: string; conditions?:string; icon?: string;
}
interface VisualCrossingResponse {
  resolvedAddress: string; address: string; latitude: number; longitude: number; timezone: string; days: VisualCrossingDay[];
}
type ChatRole = "user" | "assistant" | "system";
interface ChatMessage { role: ChatRole; content: string; ts: number }

// CHANGED: FieldRecord now aligns with the Prisma schema in the database.
interface FieldRecord {
  id: string;
  name: string;
  crop: string;
  plantedAt?: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  threadId: string | null;
}

// ADDED: Type for a single field action
interface FieldAction {
    id: string;
    action: string;
    date: string;
}


const API_KEY = "AVK8GCBZRWYDYYXUQS8GA88RR"; // Visual Crossing API Key

// =============================================================================
// Utilities & Constants
// =============================================================================
const INDIA_BOUNDS: LatLngBoundsExpression = [[6.753515, 68.162384], [35.674545, 97.395561]];
function fmt(n?: number, digits = 0) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}
function dayName(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function iconFor(vcIcon?: string) {
  switch (vcIcon) {
    case "snow": return "❄️"; case "rain": return "🌧️"; case "fog": return "🌫️"; case "wind": return "💨"; case "cloudy": return "☁️"; case "partly-cloudy-day": return "⛅"; case "partly-cloudy-night": return "☁️"; case "clear-day": return "☀️"; case "clear-night": return "🌙"; default: return "🌤️";
  }
}
function buildApiUrl(place: string) {
  const encoded = encodeURIComponent(place);
  return `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encoded}/next7days?unitGroup=metric&key=${API_KEY}&contentType=json`;
}

// =============================================================================
// Map Helpers
// =============================================================================
function ClickToSelect({ onPick }: { onPick: (latlng: [number, number]) => void }) {
  useMapEvents({ click(e) { onPick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}
function ensureLeafletCSS() {
  if (typeof window === "undefined") return;
  const id = "leaflet-css-cdn";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id; link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

// =============================================================================
// SVG Icons
// =============================================================================
const ICONS = {
  logo: <img src="/logo.png" alt="SAKAL Agrowan Logo" width="100" height="100" />,
  back: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
};

// =============================================================================
// Main App Component - Manages view state and field data
// =============================================================================
export default function AgriAssistantDemo() {
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ADDED: Load fields from the API on initial mount
  useEffect(() => {
    async function fetchFields() {
      try {
        const res = await fetch('/api/fields');
        if (!res.ok) throw new Error('Failed to fetch fields from API');
        const data: FieldRecord[] = await res.json();
        setFields(data);
      } catch (e) {
        console.error("Failed to load fields", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFields();
  }, []);

  // REMOVED: localStorage useEffect hooks are no longer needed.

  // CHANGED: handleCreateField now sends a POST request to the API
  async function handleCreateField(fieldData: Omit<FieldRecord, "id" | "latitude" | "longitude" | "locationName" | "threadId">) {
    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldData),
      });
      if (!res.ok) throw new Error('API call to create field failed');
      const newField: FieldRecord = await res.json();
      setFields(f => [newField, ...f]);
      setSelectedFieldId(newField.id);
    } catch (e) {
      console.error("Failed to create field", e);
      alert("Error: Could not create the field.");
    }
  }

  // CHANGED: handleUpdateField now sends a PUT request to the API
  async function handleUpdateField(updatedFieldData: Partial<FieldRecord> & { id: string }) {
    try {
      const res = await fetch(`/api/fields/${updatedFieldData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // The API expects latLng, so we construct it
          latLng: updatedFieldData.latitude && updatedFieldData.longitude ? [updatedFieldData.latitude, updatedFieldData.longitude] : null,
          locationName: updatedFieldData.locationName,
          threadId: updatedFieldData.threadId,
        }),
      });
      if (!res.ok) throw new Error('API call to update field failed');

      const returnedField: FieldRecord = await res.json();
      setFields(currentFields =>
        currentFields.map(f => (f.id === returnedField.id ? returnedField : f))
      );
    } catch (e) {
      console.error("Failed to update field", e);
      alert("Error: Could not update the field.");
    }
  }

  // CHANGED: handleDeleteField now sends a DELETE request to the API
  async function handleDeleteField(fieldId: string) {
    if (window.confirm("Are you sure you want to delete this field? This action cannot be undone.")) {
       try {
        const res = await fetch(`/api/fields/${fieldId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('API call to delete field failed');

        setFields(f => f.filter(field => field.id !== fieldId));
        setSelectedFieldId(null);
      } catch(e) {
        console.error("Failed to delete field", e);
        alert("Error: Could not delete the field.");
      }
    }
  }
  
  // CHANGED: selectedField now derives latLng from latitude and longitude for the map
  const selectedField = useMemo(() => {
    const field = fields.find(f => f.id === selectedFieldId);
    if (!field) return undefined;
    
    return {
      ...field,
      latLng: field.latitude && field.longitude ? [field.latitude, field.longitude] as [number, number] : null
    };
  }, [fields, selectedFieldId]);


  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading your fields...</div>
        ) : selectedField ? (
          <FieldDetailView
            key={selectedField.id}
            field={selectedField}
            onUpdateField={handleUpdateField}
            onBack={() => setSelectedFieldId(null)}
            onDelete={handleDeleteField}
          />
        ) : (
          <FieldListView
            fields={fields}
            onSelectField={setSelectedFieldId}
            onCreateField={handleCreateField}
          />
        )}
      </main>
    </div>
  );
}

// =============================================================================
// Header (No changes needed)
// =============================================================================
function Header() {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-teal-800">{ICONS.logo}</span>
            <h1 className="text-lg font-bold text-teal-900"> Agrowan</h1>
          </div>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// Field List View (No changes needed)
// =============================================================================
function FieldListView({ fields, onSelectField, onCreateField }: {
  fields: FieldRecord[];
  onSelectField: (id: string) => void;
  onCreateField: (data: Omit<FieldRecord, "id" | "latitude" | "longitude" | "locationName" | "threadId">) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-teal-900 mb-4">My Fields</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NewFieldCard onCreate={onCreateField} />
        {fields.map(field => (
          <div key={field.id}
            onClick={() => onSelectField(field.id)}
            className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-teal-400 cursor-pointer transition-all"
          >
            <h3 className="font-bold text-lg text-gray-800">{field.name}</h3>
            <p className="text-gray-600">{field.crop || "No crop specified"}</p>
            <p className="text-sm text-gray-400 mt-2">📍 {field.locationName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// New Field Card (No changes needed)
// =============================================================================
function NewFieldCard({ onCreate }: { onCreate: (data: Omit<FieldRecord, "id" | "latitude" | "longitude" | "locationName" | "threadId">) => void; }) {
  const [name, setName] = useState("");
  const [crop, setCrop] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, crop });
    setName("");
    setCrop("");
  }

  return (
    <div className="p-5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
      <h3 className="font-bold text-lg text-gray-800 mb-2">Add New Field</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Field Name (e.g., North Field)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Crop (e.g., Wheat)"
          value={crop}
          onChange={e => setCrop(e.target.value)}
        />
        <button type="submit" className="w-full px-4 py-2 rounded-lg bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 transition-colors">
          Create Field
        </button>
      </form>
    </div>
  );
}


// =============================================================================
// Field Detail View (The main workspace for a selected field)
// =============================================================================
interface FieldDetailViewProps {
  field: FieldRecord & { latLng: [number, number] | null };
  onUpdateField: (field: Partial<FieldRecord> & { id: string }) => void;
  onBack: () => void;
  onDelete: (id: string) => void;
}

function FieldDetailView({ field, onUpdateField, onBack, onDelete }: FieldDetailViewProps) {
    const [hydrated, setHydrated] = useState(false);
    const [markerIcon, setMarkerIcon] = useState<LeafletIcon | null>(null);

    const [weatherData, setWeatherData] = useState<VisualCrossingResponse | null>(null);
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(true);
    const [draft, setDraft] = useState("");
    const [isReplying, setIsReplying] = useState(false);

    // ADDED: State for field actions and calendar
    const [actions, setActions] = useState<FieldAction[]>([]);
    const [isLoadingActions, setIsLoadingActions] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());


  // Geocoding and weather fetching (no changes needed)
  async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Reverse geocoding failed");
      const j = await res.json();
      return j.display_name || `${fmt(lat, 3)}, ${fmt(lon, 3)}`;
    } catch {
      return `${fmt(lat, 3)}, ${fmt(lon, 3)}`;
    }
  }
  async function fetchWeatherForField() {
    if (!field.latLng) return;
    setIsLoadingWeather(true);
    setWeatherData(null);
    try {
      const url = buildApiUrl(`${field.latLng[0]},${field.latLng[1]}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const j: VisualCrossingResponse = await res.json();
      setWeatherData(j);
    } catch (e) {
      console.error("Failed to fetch forecast", e);
    } finally {
      setIsLoadingWeather(false);
    }
  }

  // Effect to fetch weather when field location is set or changed
  useEffect(() => {
    fetchWeatherForField();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.latLng]);
  
  // Effect for one-time map setup (no changes needed)
  useEffect(() => {
    setHydrated(true);
    ensureLeafletCSS();
    (async () => {
      const L = await import("leaflet");
      setMarkerIcon(new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png", shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
      }));
    })();
  }, []);

  // ADDED: Effect to load this field's chat history from the API
  useEffect(() => {
    async function fetchChatHistory() {
      setIsLoadingChat(true);
      try {
        const res = await fetch(`/api/fields/${field.id}/messages`);
        if (!res.ok) throw new Error('Failed to fetch chat history');
        const messages = await res.json();
        const formattedMessages = messages.map((m: any) => ({
             role: m.role,
             content: m.content,
             ts: new Date(m.createdAt).getTime(),
        }));
        setChat([
             { role: "system", ts: Date.now(), content: `Assistant ready for ${field.name}. Context loaded.` },
             ...formattedMessages
        ]);
      } catch (e) {
        console.error("Failed to load chat history", e);
        setChat([{ role: "system", content: "Could not load chat history.", ts: Date.now() }]);
      } finally {
        setIsLoadingChat(false);
      }
    }
    fetchChatHistory();
  }, [field.id, field.name]);

    // ADDED: Effect to load this field's actions from the API
    useEffect(() => {
        async function fetchActions() {
            setIsLoadingActions(true);
            try {
                const res = await fetch(`/api/fields/${field.id}/actions`);
                if (!res.ok) throw new Error('Failed to fetch actions');
                const actionsData: FieldAction[] = await res.json();
                setActions(actionsData);
            } catch (e) {
                console.error("Failed to load actions", e);
            } finally {
                setIsLoadingActions(false);
            }
        }
        fetchActions();
    }, [field.id]);

    // ADDED: Handler to create a new action
    async function handleCreateAction(action: string, date: Date) {
        try {
            const res = await fetch(`/api/fields/${field.id}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, date: date.toISOString() }),
            });
            if (!res.ok) throw new Error('API call to create action failed');
            const newAction: FieldAction = await res.json();
            setActions(a => [newAction, ...a]);
        } catch (e) {
            console.error("Failed to create action", e);
            alert("Error: Could not save the action.");
        }
    }


  // CHANGED: handleSetLocation now calls the parent's update handler with separate lat/lon
  async function handleSetLocation(latlng: [number, number]) {
    const locationName = await reverseGeocode(latlng[0], latlng[1]);
    onUpdateField({ id: field.id, latitude: latlng[0], longitude: latlng[1], locationName });
  }

  // ADDED: Helper function to save a message to our database
  async function saveMessage(message: { role: ChatRole, content: string }) {
      await fetch(`/api/fields/${field.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
      });
  }

  // CHANGED: onSend now persists messages to the DB and handles threadId updates
  async function onSend() {
    if (!draft.trim() || isReplying) return;
    const userMsg: ChatMessage = { role: "user", content: draft.trim(), ts: Date.now() };
    setChat(c => [...c, userMsg]); // Optimistic UI update
    setDraft("");
    setIsReplying(true);

    try {
      // 1. Save user's message to our database
      await saveMessage({ role: 'user', content: userMsg.content });

        // ADDED: Construct the full context to send to the AI
        const weatherSummary =
  weatherData?.days?.length
    ? `7-day forecast:\n` +
      weatherData.days.slice(0, 7).map(d =>
        `${dayName(d.datetime)} — ${d.conditions} ` +
        `(avg ${fmt(d.temp,1)}°C, min/max ${fmt(d.tempmin,0)}°/${fmt(d.tempmax,0)}°` +
        `${d.precipprob !== undefined ? `, rain prob ${fmt(d.precipprob,0)}%` : ""})`
      ).join("\n")
    : "Weather data not available.";


        const actionsSummary = actions.length > 0
        ? "Previous Actions:\n" + actions.map(a => `- ${new Date(a.date).toLocaleDateString()}: ${a.action}`).join("\n")
        : "No previous actions have been recorded.";

        const fullContext = `
            Field Information:
            - Name: ${field.name}
            - Crop: ${field.crop}
            - Location: ${field.locationName}
            - ${weatherSummary}

            ${actionsSummary}

            User's Question: ${userMsg.content}
        `;

      // 2. Call the external AI service
      const res = await fetch(`/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullContext, thread_id: field.threadId }),
      });
      if (!res.ok) throw new Error(`AI Service Error: ${res.statusText}`);
      
      const data = await res.json();
      const assistantMsg: ChatMessage = { role: "assistant", content: data.answer, ts: Date.now() };
      
      // 3. If a new thread was created, update the field record in our DB
      if (!field.threadId && data.thread_id) {
        onUpdateField({ id: field.id, threadId: data.thread_id });
      }

      // 4. Save assistant's message to our database
      await saveMessage({ role: 'assistant', content: assistantMsg.content });

      // 5. Update UI with final response
      setChat(c => [...c, assistantMsg]);
    } catch (error: any) {
      setChat(c => [...c, { role: "system", content: `Error: ${error.message}`, ts: Date.now() }]);
    } finally {
      setIsReplying(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-700 font-semibold">
            {ICONS.back} Back to Fields
          </button>
          <h2 className="text-2xl font-bold text-teal-900">{field.name}</h2>
          <p className="text-gray-500">{field.crop} - 📍 {field.locationName}</p>
        </div>
        <button onClick={() => onDelete(field.id)} className="px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100">
          Delete Field
        </button>
      </div>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
           <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
            {!field.latLng && <div className="p-4 bg-yellow-50 text-yellow-800 text-center font-medium">Please set the field's location by clicking on the map.</div>}
            {hydrated ? (
              <MapContainer
                center={field.latLng || [20.5937, 78.9629]}
                zoom={field.latLng ? 13 : 5}
                bounds={INDIA_BOUNDS} boundsOptions={{ padding: [20, 20] }} maxBounds={INDIA_BOUNDS}
                maxBoundsViscosity={1.0} style={{ height: 420, width: "100%" }} scrollWheelZoom={true}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <ClickToSelect onPick={handleSetLocation} />
                {field.latLng && markerIcon && (
                  <Marker position={field.latLng as LatLngExpression} icon={markerIcon}>
                    <Popup>{field.name}</Popup>
                  </Marker>
                )}
              </MapContainer>
            ) : (
              <div style={{ height: 420 }} className="grid place-items-center text-sm text-gray-500">Loading map…</div>
            )}
          </div>
           {/* ADDED: Action calendar component */}
           <ActionCalendar 
                        actions={actions}
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                        onCreateAction={handleCreateAction}
                        isLoading={isLoadingActions}
                    />
          <ChatView chat={chat} draft={draft} setDraft={setDraft} onSend={onSend} isReplying={isReplying} isLoadingChat={isLoadingChat} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {isLoadingWeather && <div className="p-4 text-center rounded-xl bg-white border border-gray-200">Loading weather...</div>}
          {weatherData ? <WeatherForecast data={weatherData} /> : 
           !isLoadingWeather && <div className="p-4 text-center rounded-xl bg-white border border-gray-200 text-gray-500">Set a location to see the weather forecast.</div>
          }
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// Reusable View & Widget Components
// =============================================================================
function ChatView({ chat, draft, setDraft, onSend, isReplying, isLoadingChat }: { chat: ChatMessage[], draft: string, setDraft: (s: string) => void, onSend: () => void, isReplying: boolean, isLoadingChat: boolean }) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, isReplying]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm h-[480px] flex flex-col p-4">
      <div className="flex-1 overflow-auto space-y-4 pr-2">
        {isLoadingChat ? (
            <div className="text-center text-gray-500">Loading chat...</div>
        ) : (
            <>
                {chat.map((m, i) => (
                  <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                     <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        m.role === 'user' ? 'bg-teal-600 text-white' : 
                        m.role === 'assistant' ? 'bg-gray-100 text-gray-800' : 
                        'bg-yellow-50 text-yellow-800 text-center w-full text-xs'
                      }`}>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                ))}
                {isReplying && (
                  <div className="flex justify-start"><div className="bg-gray-100 text-gray-500 rounded-xl px-4 py-2.5 text-sm">Typing...</div></div>
                )}
            </>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="border border-gray-300 focus:ring-2 focus:ring-teal-500 rounded-lg px-3 py-2 flex-1 text-sm disabled:bg-gray-100"
          value={draft}
          placeholder={isLoadingChat ? "Loading..." : "Ask about this field..."}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
          disabled={isReplying || isLoadingChat}
        />
        <button onClick={onSend} className="px-4 py-2 rounded-lg bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 transition-colors disabled:bg-teal-800/50" disabled={isReplying || isLoadingChat}>
          Send
        </button>
      </div>
    </div>
  );
}

function WeatherForecast({ data }: { data: VisualCrossingResponse }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-teal-900">7-Day Forecast for {data.address}</h2>
      <div className="grid grid-cols-1 gap-3 mt-4">
        {data.days.slice(0, 7).map((d) => (
          <div key={d.datetime} className="rounded-xl border border-gray-200 p-3 flex items-center gap-4 bg-white hover:bg-gray-50 transition-colors">
            <div className="text-2xl" title={d.icon || ""}>{iconFor(d.icon)}</div>
            <div className="flex-1">
              <div className="font-semibold text-gray-800">{dayName(d.datetime)}</div>
              <div className="text-xs text-gray-500">{d.conditions}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-gray-900">{fmt(d.temp, 1)}°C</div>
              <div className="text-xs text-gray-500">{fmt(d.tempmax, 0)}°/{fmt(d.tempmin, 0)}°</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ADDED: New component for the Action Calendar
function ActionCalendar({
    actions,
    selectedDate,
    onDateChange,
    onCreateAction,
    isLoading,
}: {
    actions: FieldAction[];
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    onCreateAction: (action: string, date: Date) => void;
    isLoading: boolean;
}) {
    const [newAction, setNewAction] = useState("");

    const actionsOnSelectedDate = useMemo(() => {
        return actions.filter(a => {
            const actionDate = new Date(a.date);
            return (
                actionDate.getFullYear() === selectedDate.getFullYear() &&
                actionDate.getMonth() === selectedDate.getMonth() &&
                actionDate.getDate() === selectedDate.getDate()
            );
        });
    }, [actions, selectedDate]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!newAction.trim()) return;
        onCreateAction(newAction, selectedDate);
        setNewAction("");
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-teal-900 mb-4">Field Actions Calendar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Calendar
                        onChange={(value) => onDateChange(value as Date)}
                        value={selectedDate}
                        tileClassName={({ date, view }) => {
                            if (view === 'month') {
                                const hasAction = actions.some(a => {
                                    const actionDate = new Date(a.date);
                                    return (
                                        date.getFullYear() === actionDate.getFullYear() &&
                                        date.getMonth() === actionDate.getMonth() &&
                                        date.getDate() === actionDate.getDate()
                                    );
                                });
                                if (hasAction) {
                                    return 'bg-green-200 rounded-full';
                                }
                            }
                            return null;
                        }}
                    />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                        Actions for {selectedDate.toLocaleDateString()}
                    </h3>
                    {isLoading ? (
                        <p className="text-gray-500">Loading actions...</p>
                    ) : actionsOnSelectedDate.length > 0 ? (
                        <ul className="space-y-2">
                            {actionsOnSelectedDate.map(a => (
                                <li key={a.id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded-md">
                                    {a.action}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">No actions recorded for this day.</p>
                    )}
                    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
                        <input
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="Add new action..."
                            value={newAction}
                            onChange={e => setNewAction(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="w-full px-4 py-2 rounded-lg bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 transition-colors"
                        >
                            Add Action for {selectedDate.toLocaleDateString()}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}