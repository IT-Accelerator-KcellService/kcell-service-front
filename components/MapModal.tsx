import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
});

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapLocation: {
    lat: number;
    lon: number;
    accuracy: number;
  };
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  mapLocation,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle>Локация заявки</CardTitle>
          <CardDescription>Точное местоположение проблемы</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <React.Suspense fallback={
            <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
              Загрузка карты...
            </div>
          }>
            <MapView lat={mapLocation.lat} lon={mapLocation.lon} accuracy={mapLocation.accuracy} />
          </React.Suspense>
        </CardContent>
        <div className="p-4 flex justify-end border-t">
          <Button onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </Card>
    </div>
  );
};
