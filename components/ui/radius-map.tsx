import { useEffect, useRef } from 'react';

// Zwijndrecht, Netherlands center coordinates
const CENTER: [number, number] = [51.8213, 4.6281];
const RADIUS_KM = 15;

export function RadiusMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix default icon paths for bundlers
      // @ts-expect-error
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: CENTER,
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      // Dark/light CartoDB tile layer
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
        },
      ).addTo(map);

      // Radius circle — 15km around Zwijndrecht
      L.circle(CENTER, {
        radius: RADIUS_KM * 1000,
        color: '#6d28d9',
        fillColor: '#7c3aed',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '6 4',
      }).addTo(map);

      // Center marker
      L.circleMarker(CENTER, {
        radius: 8,
        color: '#6d28d9',
        fillColor: '#7c3aed',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={mapRef}
        className="absolute inset-0 w-full h-full rounded-[22px] overflow-hidden"
        style={{ background: '#f0edf7' }}
      />
    </>
  );
}
