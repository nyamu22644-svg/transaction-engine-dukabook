import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { X, MapPin, Clock, User, Package, TrendingUp, Navigation } from 'lucide-react';
import { SalesRecord, StoreProfile } from '../types';
import { THEME_COLORS, DEFAULT_THEME } from '../constants';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

interface SalesLocationMapProps {
  store: StoreProfile;
  sales: SalesRecord[];
  onClose: () => void;
}

// Component to recenter map
const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
};

export const SalesLocationMap: React.FC<SalesLocationMapProps> = ({ store, sales, onClose }) => {
  const theme = THEME_COLORS[store.theme_color || 'blue'] || DEFAULT_THEME;
  
  // Filter sales with valid GPS coordinates
  const salesWithLocation = sales.filter(
    s => s.gps_latitude && s.gps_longitude && 
         s.gps_latitude !== 0 && s.gps_longitude !== 0
  );

  // Calculate center point (Kenya default if no sales with GPS)
  const defaultCenter = { lat: -1.2921, lng: 36.8219 }; // Nairobi
  
  const center = salesWithLocation.length > 0
    ? {
        lat: salesWithLocation.reduce((sum, s) => sum + (s.gps_latitude || 0), 0) / salesWithLocation.length,
        lng: salesWithLocation.reduce((sum, s) => sum + (s.gps_longitude || 0), 0) / salesWithLocation.length,
      }
    : defaultCenter;

  // Group sales by location (for clustering)
  const locationGroups = salesWithLocation.reduce((acc, sale) => {
    const key = `${sale.gps_latitude?.toFixed(4)},${sale.gps_longitude?.toFixed(4)}`;
    if (!acc[key]) {
      acc[key] = {
        lat: sale.gps_latitude!,
        lng: sale.gps_longitude!,
        sales: [],
        totalAmount: 0,
      };
    }
    acc[key].sales.push(sale);
    acc[key].totalAmount += sale.total_amount;
    return acc;
  }, {} as Record<string, { lat: number; lng: number; sales: SalesRecord[]; totalAmount: number }>);

  const locations = Object.values(locationGroups);

  // Stats
  const totalSalesWithGPS = salesWithLocation.length;
  const totalRevenue = salesWithLocation.reduce((sum, s) => sum + s.total_amount, 0);
  const uniqueLocations = locations.length;

  // Today's sales
  const today = new Date().toDateString();
  const todaySales = salesWithLocation.filter(s => 
    new Date(s.created_at || '').toDateString() === today
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`p-4 ${theme.bg} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Sales Location Map</h2>
              <p className="text-sm opacity-80">{store.name} - GPS tracked sales</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Tracked Sales
            </div>
            <div className="text-lg font-bold text-slate-800">{totalSalesWithGPS}</div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Navigation className="w-3 h-3" /> Locations
            </div>
            <div className="text-lg font-bold text-slate-800">{uniqueLocations}</div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Revenue
            </div>
            <div className="text-lg font-bold text-green-600">KES {totalRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Today
            </div>
            <div className="text-lg font-bold text-blue-600">{todaySales.length} sales</div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {salesWithLocation.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <div className="text-center p-8">
                <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600">No GPS Data Yet</h3>
                <p className="text-slate-500 mt-2">
                  Sales locations will appear here once staff<br />
                  make sales with GPS enabled on their devices.
                </p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <RecenterMap lat={center.lat} lng={center.lng} />

              {/* Sales location markers */}
              {locations.map((location, idx) => {
                const isRecent = location.sales.some(s => 
                  new Date(s.created_at || '').toDateString() === today
                );
                const color = isRecent ? '#10B981' : '#6B7280';
                
                return (
                  <Marker
                    key={idx}
                    position={[location.lat, location.lng]}
                    icon={createCustomIcon(color)}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-bold text-gray-800 border-b pb-1 mb-2">
                          📍 {location.sales.length} Sale{location.sales.length > 1 ? 's' : ''} Here
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total:</span>
                            <span className="font-semibold text-green-600">
                              KES {location.totalAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="max-h-32 overflow-y-auto mt-2 space-y-1">
                            {location.sales.slice(0, 5).map((sale, sIdx) => (
                              <div key={sIdx} className="text-xs bg-gray-50 p-1 rounded flex justify-between">
                                <span>{sale.item_name}</span>
                                <span className="text-gray-500">
                                  {new Date(sale.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))}
                            {location.sales.length > 5 && (
                              <div className="text-xs text-gray-400 text-center">
                                +{location.sales.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
            <span className="text-slate-600">Today's Sales</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow"></div>
            <span className="text-slate-600">Previous Sales</span>
          </div>
          <div className="text-xs text-slate-400 ml-4">
            Click markers for details
          </div>
        </div>
      </div>
    </div>
  );
};
