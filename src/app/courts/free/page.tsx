"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Clock, Filter, RefreshCw } from 'lucide-react';

type ApiResp = {
  site: string;
  url: string;
  times: string[];
  courts: {
    court: string;
    slots: { time: string; status: "free" | "booked" | "unavailable" | "closed"; href?: string }[];
    freeRanges: { start: string; end: string; href?: string }[];
  }[];
};

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function FreeCourtsList() {
  const [isIndoor, setIsIndoor] = useState(false); // false = outdoor, true = indoor
  const [after, setAfter] = useState("18:00");
  const [dToken, setDToken] = useState<string>(""); // optional vendor date token
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawTable, setShowRawTable] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const site = isIndoor ? "int" : "ext";
      const qs = new URLSearchParams({ site });
      if (dToken) qs.set("d", dToken);
      
      const res = await fetch(`/api/free-courts?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch');
      }
      
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIndoor, dToken]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const afterMin = toMinutes(after);
    
    return data.courts
      .map(c => {
        // Get individual free slots (not ranges) that start after the specified time
        const freeSlots = c.slots
          .filter(slot => slot.status === "free")
          .filter(slot => {
            const slotMin = toMinutes(slot.time.replace("h", ":"));
            return slotMin >= afterMin;
          })
          .map(slot => ({
            court: c.court,
            time: slot.time.replace("h", ":"),
            href: slot.href,
          }));
        
        return { court: c.court, slots: freeSlots };
      })
      .filter(c => c.slots.length > 0);
  }, [data, after]);

  const getSiteDisplayName = () => {
    return isIndoor ? "Tennis Indoor" : "Tennis Outdoor";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "free": return "🟢";
      case "booked": return "🔴";
      case "closed": return "⚫";
      default: return "⚪";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Free Tennis Courts - Centre FairPlay
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Real-time tennis court availability with direct booking
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Tennis Indoor/Outdoor Toggle */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Court Type
                </label>
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-1">
                  <button
                    onClick={() => setIsIndoor(false)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      !isIndoor
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                  >
                    🌞 Outdoor
                  </button>
                  <button
                    onClick={() => setIsIndoor(true)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isIndoor
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                  >
                    🏢 Indoor
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Show after
                </label>
                <Input
                  type="time"
                  value={after}
                  onChange={e => setAfter(e.target.value)}
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date Token (optional)
                </label>
                <Input
                  placeholder="d=ZwNlAF0jBF0kZN=="
                  value={dToken}
                  onChange={e => setDToken(e.target.value.trim())}
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button
                onClick={fetchData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="text-red-600 dark:text-red-400">
                <strong>Error:</strong> {error}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-6">
            {/* Source Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span>Source:</span>
              <a 
                href={data.url} 
                target="_blank" 
                rel="noreferrer" 
                className="underline hover:text-blue-600 flex items-center gap-1"
              >
                {getSiteDisplayName()} - Centre FairPlay
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Available Slots */}
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">🎾</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No courts available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No free tennis courts after {after}.
                    Try adjusting your time filter or check back later.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(c => (
                  <Card key={c.court} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {c.court}
                        <Badge variant="secondary">
                          {c.slots.length} slot{c.slots.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {c.slots.map((slot, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {slot.time}
                              </div>
                            </div>
                            {slot.href ? (
                              <Button
                                asChild
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 h-7"
                              >
                                <a
                                  href={slot.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  Book
                                </a>
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-500">No link</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Raw Table Toggle */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setShowRawTable(!showRawTable)}
                className="flex items-center gap-2"
              >
                {showRawTable ? 'Hide' : 'Show'} Raw Schedule
              </Button>
            </div>

            {/* Raw Table */}
            {showRawTable && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Raw Schedule - {getSiteDisplayName()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="p-3 text-left font-medium text-gray-900 dark:text-white">Court</th>
                          {data.times.map((t, i) => (
                            <th key={i} className="p-2 text-center font-medium text-gray-900 dark:text-white min-w-[50px]">
                              {t.replace("h", ":")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.courts.map((c, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="p-3 font-medium text-gray-900 dark:text-white">{c.court}</td>
                            {c.slots.map((s, i) => (
                              <td key={i} className="p-2 text-center">
                                <div className="flex items-center justify-center">
                                  <span className="text-lg" title={s.status}>
                                    {getStatusIcon(s.status)}
                                  </span>
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex flex-wrap gap-4">
                      <span className="flex items-center gap-1">
                        <span>🟢</span> Free
                      </span>
                      <span className="flex items-center gap-1">
                        <span>🔴</span> Booked
                      </span>
                      <span className="flex items-center gap-1">
                        <span>⚫</span> Closed
                      </span>
                      <span className="flex items-center gap-1">
                        <span>⚪</span> Unavailable
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}