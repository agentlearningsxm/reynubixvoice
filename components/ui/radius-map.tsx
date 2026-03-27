import { useEffect, useRef } from 'react';

// Zwijndrecht, Netherlands center coordinates
const CENTER: [number, number] = [51.8213, 4.6281];
const RADIUS_KM = 15;

export function RadiusMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    const container = mapRef.current;
    if (!container || mapInstanceRef.current) return;
    let disposed = false;

    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      if (disposed || mapInstanceRef.current) return;

      const leafletContainer = container as HTMLDivElement & {
        _leaflet_id?: number;
      };

      if (leafletContainer._leaflet_id) {
        delete leafletContainer._leaflet_id;
      }

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

      const map = L.map(container, {
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

      // Radius circle -15km around Zwijndrecht
      L.circle(CENTER, {
        radius: RADIUS_KM * 1000,
        color: '#b8956a',
        fillColor: '#c8a960',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '6 4',
      }).addTo(map);

      // Center marker
      L.circleMarker(CENTER, {
        radius: 8,
        color: '#b8956a',
        fillColor: '#c8a960',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      const leafletContainer = container as HTMLDivElement & {
        _leaflet_id?: number;
      };
      if (leafletContainer._leaflet_id) {
        delete leafletContainer._leaflet_id;
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
        style={{ background: '#f5f0e8' }}
      />
    </>
  );
}
