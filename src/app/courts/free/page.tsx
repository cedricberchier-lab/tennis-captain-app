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
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [showIndoor, setShowIndoor] = useState(true);
  const [showOutdoor, setShowOutdoor] = useState(true);
  const [after, setAfter] = useState("18:00");
  
  // Generate next 7 days
  const next7Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        displayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    return days;
  }, []);
  
  const selectedDate = next7Days[selectedDateIndex]?.date || next7Days[0].date;
  const [dateTokens, setDateTokens] = useState<{indoor?: string, outdoor?: string}>({});
  const [indoorData, setIndoorData] = useState<ApiResp | null>(null);
  const [outdoorData, setOutdoorData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawTable, setShowRawTable] = useState(false);

  // Helper function to format date for site matching (like "Ve 12")
  const siteDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); // Add time to avoid timezone issues
    const fr = date.toLocaleDateString("fr-CH", { weekday: "short", day: "numeric" });
    const [wdRaw, dayStr] = fr.replace(/\u00A0/g, " ").split(" ");
    const wd2 = (wdRaw || "").slice(0, 2).toLowerCase();
    const wd = wd2.charAt(0).toUpperCase() + wd2.charAt(1);
    return `${wd} ${parseInt(dayStr, 10)}`;
  };

  // Resolve date token for a specific site
  const resolveDateToken = async (site: 'ext' | 'int', targetDate: string): Promise<string> => {
    const wanted = siteDayLabel(targetDate);
    const baseUrl = site === 'ext' 
      ? 'https://online.centrefairplay.ch/tableau.php?responsive=false'
      : 'https://online.centrefairplay.ch/tableau_int.php?responsive=false';
    
    try {
      // For now, we'll make a request to our API to resolve the token
      // The API should implement the day-strip scraping logic
      const response = await fetch(`/api/resolve-date-token?site=${site}&date=${targetDate}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to resolve date token: ${response.status}`);
      }
      
      const { token } = await response.json();
      return token;
    } catch (error) {
      console.error(`Failed to resolve date token for ${site}:`, error);
      // Fallback: return empty string, API should handle this gracefully
      return '';
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const promises = [];
      const tokenPromises = [];
      
      // Resolve date tokens first
      if (showIndoor) {
        tokenPromises.push(
          resolveDateToken('int', selectedDate).then(token => ({ site: 'indoor', token }))
        );
      }
      if (showOutdoor) {
        tokenPromises.push(
          resolveDateToken('ext', selectedDate).then(token => ({ site: 'outdoor', token }))
        );
      }
      
      const resolvedTokens = await Promise.all(tokenPromises);
      const tokens: {indoor?: string, outdoor?: string} = {};
      resolvedTokens.forEach(({site, token}) => {
        tokens[site as keyof typeof tokens] = token;
      });
      setDateTokens(tokens);
      
      // Fetch indoor data if toggled on
      if (showIndoor && tokens.indoor) {
        const indoorQs = new URLSearchParams({ site: "int" });
        if (tokens.indoor) indoorQs.set("d", tokens.indoor);
        promises.push(
          fetch(`/api/free-courts?${indoorQs.toString()}`, { cache: "no-store" })
            .then(res => res.json())
            .then(data => ({ type: 'indoor', data }))
        );
      }
      
      // Fetch outdoor data if toggled on  
      if (showOutdoor && tokens.outdoor) {
        const outdoorQs = new URLSearchParams({ site: "ext" });
        if (tokens.outdoor) outdoorQs.set("d", tokens.outdoor);
        promises.push(
          fetch(`/api/free-courts?${outdoorQs.toString()}`, { cache: "no-store" })
            .then(res => res.json())
            .then(data => ({ type: 'outdoor', data }))
        );
      }
      
      if (promises.length === 0) {
        setIndoorData(null);
        setOutdoorData(null);
        return;
      }
      
      const results = await Promise.all(promises);
      
      // Reset data first
      setIndoorData(null);
      setOutdoorData(null);
      
      // Set the fetched data
      results.forEach(result => {
        if (result.type === 'indoor') {
          setIndoorData(result.data);
        } else {
          setOutdoorData(result.data);
        }
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIndoor, showOutdoor, selectedDate]);

  const filtered = useMemo(() => {
    const afterMin = toMinutes(after);
    const allCourts = [];
    
    // Process outdoor data
    if (showOutdoor && outdoorData) {
      const outdoorCourts = outdoorData.courts
        .map(c => {
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
              type: 'outdoor' as const,
            }));
          
          return { court: c.court, slots: freeSlots, type: 'outdoor' as const };
        })
        .filter(c => c.slots.length > 0);
      
      allCourts.push(...outdoorCourts);
    }
    
    // Process indoor data
    if (showIndoor && indoorData) {
      const indoorCourts = indoorData.courts
        .map(c => {
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
              type: 'indoor' as const,
            }));
          
          return { court: c.court, slots: freeSlots, type: 'indoor' as const };
        })
        .filter(c => c.slots.length > 0);
      
      allCourts.push(...indoorCourts);
    }
    
    return allCourts;
  }, [indoorData, outdoorData, after, showIndoor, showOutdoor]);


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
              {/* Date Selector - Next 7 Days */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <select
                  value={selectedDateIndex}
                  onChange={e => setSelectedDateIndex(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {next7Days.map((day, index) => (
                    <option key={index} value={index}>
                      {day.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Apple-style Toggles for Court Types */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Court Types
                </label>
                <div className="space-y-2">
                  {/* Outdoor Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowOutdoor(!showOutdoor)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        showOutdoor ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showOutdoor ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">🌞 Outdoor</span>
                  </div>
                  
                  {/* Indoor Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowIndoor(!showIndoor)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        showIndoor ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showIndoor ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">🏢 Indoor</span>
                  </div>
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
        {(indoorData || outdoorData) && (
          <div className="space-y-6">
            {/* Source Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-4">
              <span>Sources:</span>
              {showOutdoor && outdoorData && (
                <a 
                  href={outdoorData.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="underline hover:text-blue-600 flex items-center gap-1"
                >
                  🌞 Outdoor Courts - Centre FairPlay
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {showIndoor && indoorData && (
                <a 
                  href={indoorData.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="underline hover:text-blue-600 flex items-center gap-1"
                >
                  🏢 Indoor Courts - Centre FairPlay
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
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
                    No free tennis courts after {after} on {next7Days[selectedDateIndex]?.displayName}.
                    Try adjusting your filters or selecting a different date.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((c) => (
                  <Card key={`${c.court}-${c.type}`} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {c.type === 'indoor' ? '🏢' : '🌞'}
                          {c.court}
                        </div>
                        <Badge variant="secondary">
                          {c.slots.length} slot{c.slots.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {c.slots.map((slot, idx) => (
                          <div key={idx}>
                            {slot.href ? (
                              <a
                                href={slot.href}
                                target="_blank"
                                rel="noreferrer"
                                className="block p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-green-700 dark:text-green-300 group-hover:text-green-800 dark:group-hover:text-green-200">
                                    {slot.time}
                                  </div>
                                  <ExternalLink className="h-3 w-3 text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300" />
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  Click to book
                                </div>
                              </a>
                            ) : (
                              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                <div className="font-medium text-gray-700 dark:text-gray-300">
                                  {slot.time}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  No booking link
                                </div>
                              </div>
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

            {/* Raw Tables */}
            {showRawTable && (
              <div className="space-y-6">
                {showOutdoor && outdoorData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">🌞 Outdoor Courts - Raw Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="p-3 text-left font-medium text-gray-900 dark:text-white">Court</th>
                              {outdoorData.times.map((t, i) => (
                                <th key={i} className="p-2 text-center font-medium text-gray-900 dark:text-white min-w-[50px]">
                                  {t.replace("h", ":")}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {outdoorData.courts.map((c, idx) => (
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
                    </CardContent>
                  </Card>
                )}
                
                {showIndoor && indoorData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">🏢 Indoor Courts - Raw Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="p-3 text-left font-medium text-gray-900 dark:text-white">Court</th>
                              {indoorData.times.map((t, i) => (
                                <th key={i} className="p-2 text-center font-medium text-gray-900 dark:text-white min-w-[50px]">
                                  {t.replace("h", ":")}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {indoorData.courts.map((c, idx) => (
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
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}