import React, { useEffect, useRef } from 'react';

export default function GisMap({
  center = [19.0760, 72.8777],
  zoom = 13,
  markers = [],
  units = [],
  heatmapPoints = [],
  onMapClick = null,
  height = '500px'
}) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    if (!leafletMap.current) {
      // Initialize map
      leafletMap.current = window.L.map(mapRef.current).setView(center, zoom);

      // CartoDB Dark Matter tile layer for slick modern enterprise look
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19
      }).addTo(leafletMap.current);

      markersLayer.current = window.L.layerGroup().addTo(leafletMap.current);

      if (onMapClick) {
        leafletMap.current.on('click', (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }
    }

    return () => {
      // Keep map instance persistent across small updates
    };
  }, []);

  // Update markers and layers when props change
  useEffect(() => {
    if (!leafletMap.current || !window.L || !markersLayer.current) return;

    markersLayer.current.clearLayers();

    // 1. Render Heatmap circles
    heatmapPoints.forEach(pt => {
      const radius = pt.weight * 300 + 100;
      const color = pt.priority === 'P1_CRITICAL' ? '#ef4444' : (pt.priority === 'P2_HIGH' ? '#f97316' : '#eab308');
      window.L.circle([pt.latitude, pt.longitude], {
        color: color,
        fillColor: color,
        fillOpacity: 0.35,
        radius: radius,
        stroke: false
      }).addTo(markersLayer.current);
    });

    // 2. Render Complaint & Emergency Incident markers
    markers.forEach(m => {
      const isEmergency = m.is_emergency || m.incident_code || m.priority === 'P1_CRITICAL';
      const iconHtml = isEmergency
        ? `<div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white font-bold text-xs shadow-lg ring-4 ring-red-400/50 animate-pulse">SOS</div>`
        : `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-sky-600 text-white font-bold text-xs shadow-md border-2 border-white">#</div>`;

      const customIcon = window.L.divIcon({
        html: iconHtml,
        className: 'custom-map-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = window.L.marker([m.latitude, m.longitude], { icon: customIcon }).addTo(markersLayer.current);
      
      const popupHtml = `
        <div class="p-2 text-slate-900 min-w-[200px]">
          <div class="font-bold text-sm ${isEmergency ? 'text-red-600' : 'text-sky-700'}">
            ${m.incident_code || m.ticket_number || 'Civic Incident'}
          </div>
          <div class="font-semibold text-xs text-slate-700 mt-1">${m.title || m.emergency_type || ''}</div>
          <div class="text-xs text-slate-500 mt-1">${m.address_text || ''}</div>
          <div class="mt-2 flex items-center justify-between text-[11px] font-mono">
            <span class="px-1.5 py-0.5 rounded bg-slate-200">${m.status || 'ACTIVE'}</span>
            <span class="font-bold ${m.priority === 'P1_CRITICAL' ? 'text-red-600' : 'text-slate-600'}">${m.priority || ''}</span>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });

    // 3. Render Emergency Fleet Units
    units.forEach(u => {
      const vehicleIcons = {
        AMBULANCE: '🚑',
        FIRE_TRUCK: '🚒',
        POLICE_CAR: '🚓',
        RESCUE_BOAT: '🚤'
      };
      const vIcon = vehicleIcons[u.unit_type] || '🚨';
      const statusColor = u.status === 'AVAILABLE' ? 'bg-emerald-600' : (u.status === 'EN_ROUTE' ? 'bg-amber-600' : 'bg-blue-600');

      const unitIconHtml = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full ${statusColor} text-white text-base shadow-xl border-2 border-white">
          ${vIcon}
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: unitIconHtml,
        className: 'unit-map-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = window.L.marker([u.current_lat, u.current_lon], { icon: customIcon }).addTo(markersLayer.current);
      marker.bindPopup(`
        <div class="p-2 text-slate-900 min-w-[180px]">
          <div class="font-bold text-sm text-slate-900">${u.unit_callsign}</div>
          <div class="text-xs text-slate-600 mt-0.5">Type: ${u.unit_type}</div>
          <div class="text-xs font-semibold ${u.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-amber-600'} mt-1">Status: ${u.status}</div>
          ${u.distance_meters ? `<div class="text-[11px] text-slate-500 mt-1">Distance: ${u.distance_meters}m (ETA: ~${u.eta_minutes}m)</div>` : ''}
        </div>
      `);
    });

  }, [markers, units, heatmapPoints]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl">
      <div ref={mapRef} style={{ height: height, width: '100%' }} className="z-10" />
      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-300 shadow-lg pointer-events-none">
        GIS ENGINE: Active
      </div>
    </div>
  );
}
