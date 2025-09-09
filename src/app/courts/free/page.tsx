"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Clock, Filter, RefreshCw, Sun, Building2, Activity, CheckCircle, XCircle, Minus, Circle } from 'lucide-react';

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
  const [after, setAfter] = useState("08:00");
  
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

  // Extract court number from court name (e.g., "Tennis n°5" -> 5)
  const extractCourtNumber = (courtName: string): number | null => {
    const match = courtName.match(/n°(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  };

  // Direct booking handler
  const handleDirectBooking = async (court: string, time: string, type: 'indoor' | 'outdoor') => {
    const courtNumber = extractCourtNumber(court);
    if (!courtNumber) {
      alert(`Cannot extract court number from "${court}"`);
      return;
    }

    // Open window immediately to avoid popup blocking on iOS Safari
    const newWindow = window.open('about:blank', '_blank');
    
    try {
      setLoading(true);
      const response = await fetch('/api/direct-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          time,
          courtNumber,
          site: type === 'indoor' ? 'int' : 'ext'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        if (newWindow) {
          newWindow.location.href = result.reservationUrl;
        } else {
          // Fallback for when popup is blocked
          window.location.href = result.reservationUrl;
        }
      } else {
        if (newWindow) {
          newWindow.close();
        }
        alert(`Booking failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Booking error:', error);
      if (newWindow) {
        newWindow.close();
      }
      alert('Failed to open booking page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date for site matching (like "Ve 12")
  const siteDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); // Add time to avoid timezone issues
    
    // Manual mapping to match FairPlay site exactly
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
    const dayAbbrevs = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']; // Sunday to Saturday
    const wd = dayAbbrevs[dayOfWeek];
    const dayNum = date.getDate();
    
    return `${wd} ${dayNum}`;
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
      if (showIndoor) {
        const indoorQs = new URLSearchParams({ site: "int" });
        if (tokens.indoor) indoorQs.set("d", tokens.indoor);
        promises.push(
          fetch(`/api/free-courts?${indoorQs.toString()}`, { cache: "no-store" })
            .then(res => res.json())
            .then(data => ({ type: 'indoor', data }))
        );
      }
      
      // Fetch outdoor data if toggled on  
      if (showOutdoor) {
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
        .filter(c => !c.court.toLowerCase().includes('terrain n°4')) // Remove Terrain n°4
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
      case "free": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "booked": return <XCircle className="h-4 w-4 text-red-500" />;
      case "closed": return <Minus className="h-4 w-4 text-gray-800 dark:text-gray-200" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Free Tennis Courts
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Centre FairPlay - Real-time availability
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Date Selector */}
              <div className="min-w-32">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Date
                </label>
                <select
                  value={selectedDateIndex}
                  onChange={e => setSelectedDateIndex(parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {next7Days.map((day, index) => (
                    <option key={index} value={index}>
                      {day.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Court Type Toggles */}
              <div className="flex gap-4 items-center">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Courts:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowOutdoor(!showOutdoor)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                      showOutdoor ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        showOutdoor ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <div className="flex items-center gap-1">
                    <Sun className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Out</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowIndoor(!showIndoor)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                      showIndoor ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        showIndoor ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">In</span>
                  </div>
                </div>
              </div>

              {/* Time Filter */}
              <div className="min-w-24">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  After
                </label>
                <Input
                  type="time"
                  value={after}
                  onChange={e => setAfter(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm"
                />
              </div>


              {/* Refresh Button */}
              <Button
                onClick={fetchData}
                disabled={loading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {(indoorData || outdoorData) && (
          <div className="space-y-4">

            {/* Available Slots */}
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <div className="mb-3">
                  <Activity className="h-8 w-8 mx-auto text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  No courts available
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No free courts after {after} on {next7Days[selectedDateIndex]?.displayName}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((c) => (
                  <Card key={`${c.court}-${c.type}`} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {c.type === 'indoor' ? 
                            <Building2 className="h-4 w-4 text-blue-500" /> : 
                            <Sun className="h-4 w-4 text-yellow-500" />
                          }
                          <span className="font-semibold text-sm">{c.court}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {c.slots.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {c.slots.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleDirectBooking(c.court, slot.time, c.type)}
                            disabled={loading}
                            className="p-3 min-h-[44px] bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group disabled:opacity-50 text-center touch-manipulation"
                          >
                            <div className="text-xs font-medium text-green-700 dark:text-green-300 group-hover:text-green-800">
                              {slot.time.replace('h', ':')}
                            </div>
                          </button>
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
                size="sm"
                onClick={() => setShowRawTable(!showRawTable)}
                className="text-xs"
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
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        Outdoor Courts - Raw Schedule
                      </CardTitle>
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
                                    <div className="flex items-center justify-center" title={s.status}>
                                      {getStatusIcon(s.status)}
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
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        Indoor Courts - Raw Schedule
                      </CardTitle>
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
                            {indoorData.courts
                              .filter(c => !c.court.toLowerCase().includes('terrain n°4'))
                              .map((c, idx) => (
                              <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="p-3 font-medium text-gray-900 dark:text-white">{c.court}</td>
                                {c.slots.map((s, i) => (
                                  <td key={i} className="p-2 text-center">
                                    <div className="flex items-center justify-center" title={s.status}>
                                      {getStatusIcon(s.status)}
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
                          <div className="w-2 h-2 rounded-full bg-green-500"></div> Free
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div> Booked
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-gray-800 dark:bg-gray-200"></div> Closed
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div> Unavailable
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