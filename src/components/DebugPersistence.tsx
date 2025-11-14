import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { STORAGE_KEYS, isLocalStorageAvailable } from "../utils/localStorage";

export function DebugPersistence() {
  const [isVisible, setIsVisible] = useState(false);
  const [storageData, setStorageData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isVisible) return;

    const updateStorageData = () => {
      const data: Record<string, any> = {};
      Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            data[name] = {
              exists: true,
              count: Array.isArray(parsed) ? parsed.length : 'N/A',
              size: new Blob([item]).size,
              preview: Array.isArray(parsed) ? parsed.slice(0, 2) : parsed
            };
          } catch {
            data[name] = { exists: true, error: 'Parse error' };
          }
        } else {
          data[name] = { exists: false };
        }
      });
      setStorageData(data);
    };

    updateStorageData();
    const interval = setInterval(updateStorageData, 2000);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsVisible(true)}
          className="bg-white shadow-lg"
        >
          <Eye className="w-4 h-4 mr-2" />
          Debug Storage
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto">
      <Card className="p-4 bg-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">🔍 Debug - localStorage</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsVisible(false)}
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b">
            {isLocalStorageAvailable() ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-green-700">localStorage Disponível</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-red-600" />
                <span className="text-red-700">localStorage Indisponível</span>
              </>
            )}
          </div>

          {Object.entries(storageData).map(([name, info]) => (
            <div key={name} className="py-1 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">{name}</span>
                {info.exists ? (
                  <div className="flex items-center gap-2">
                    {info.count !== 'N/A' && (
                      <span className="text-blue-600">{info.count} itens</span>
                    )}
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </div>
                ) : (
                  <XCircle className="w-3 h-3 text-gray-300" />
                )}
              </div>
              {info.size && (
                <div className="text-gray-500 text-xs mt-1">
                  {(info.size / 1024).toFixed(2)} KB
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              console.log("=== DUMP DO LOCALSTORAGE ===");
              Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
                const item = localStorage.getItem(key);
                console.log(`${name}:`, item ? JSON.parse(item) : null);
              });
            }}
            className="w-full text-xs"
          >
            Dump no Console
          </Button>
        </div>
      </Card>
    </div>
  );
}
