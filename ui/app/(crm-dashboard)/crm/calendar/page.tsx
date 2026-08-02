"use client";

import { useEffect, useState, useCallback } from "react";
import { useCrmAuth } from "@/contexts/crm-auth-context";
import {
  Loader2,
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
  MapPin,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
  Link2,
  Link2Off,
  Trash2,
  Edit,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CalendarEvent,
  CalendarStatus,
  getCalendarStatus,
  getCalendarAuthUrl,
  disconnectCalendar,
  syncCalendar,
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/crm";

export default function CalendarPage() {
  const { user } = useCrmAuth();
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [formCreateMeet, setFormCreateMeet] = useState(false);

  // Check if user is admin (admins cannot use calendar)
  const isAdmin = user?.role === "sys_admin";

  const loadStatus = useCallback(async () => {
    try {
      const data = await getCalendarStatus();
      setStatus(data);
    } catch (error) {
      console.error("Failed to load calendar status:", error);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetchCalendarEvents({ page: currentPage, limit: 20 });
      setEvents(response.data);
      setTotalPages(response.totalPages);
      setTotalEvents(response.total);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  }, [currentPage]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadStatus();
      await loadEvents();
      setIsLoading(false);
    }
    if (!isAdmin) {
      init();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, loadStatus, loadEvents]);

  const handleConnect = async () => {
    try {
      const { authUrl } = await getCalendarAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      toast.error("Failed to start Google Calendar connection");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google Calendar? This will remove all synced events.")) return;

    try {
      await disconnectCalendar();
      setStatus({ connected: false });
      setEvents([]);
      toast.success("Google Calendar disconnected");
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast.error("Failed to disconnect Google Calendar");
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncCalendar();
      toast.success(`Synced ${result.syncedCount} events from Google Calendar`);
      await loadEvents();
      await loadStatus();
    } catch (error) {
      console.error("Failed to sync:", error);
      toast.error("Failed to sync with Google Calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormLocation("");
    setFormStartDate("");
    setFormStartTime("09:00");
    setFormEndDate("");
    setFormEndTime("10:00");
    setFormAllDay(false);
    setFormCreateMeet(false);
    setEditingEvent(null);
  };

  const handleOpenDialog = (event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormTitle(event.title);
      setFormDescription(event.description || "");
      setFormLocation(event.location || "");
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      setFormStartDate(start.toISOString().split("T")[0]);
      setFormStartTime(start.toTimeString().slice(0, 5));
      setFormEndDate(end.toISOString().split("T")[0]);
      setFormEndTime(end.toTimeString().slice(0, 5));
      setFormAllDay(event.allDay);
      setFormCreateMeet(false);
    } else {
      resetForm();
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormStartDate(tomorrow.toISOString().split("T")[0]);
      setFormEndDate(tomorrow.toISOString().split("T")[0]);
      setFormStartTime("09:00");
      setFormEndTime("10:00");
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) {
      toast.error("Event title is required");
      return;
    }

    if (!formStartDate || !formEndDate) {
      toast.error("Start and end dates are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const startTime = formAllDay
        ? `${formStartDate}T00:00:00.000Z`
        : `${formStartDate}T${formStartTime}:00.000Z`;
      const endTime = formAllDay
        ? `${formEndDate}T23:59:59.999Z`
        : `${formEndDate}T${formEndTime}:00.000Z`;

      const data = {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        location: formLocation.trim() || undefined,
        startTime,
        endTime,
        allDay: formAllDay,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        createMeet: formCreateMeet,
      };

      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, data);
        toast.success("Event updated");
      } else {
        await createCalendarEvent(data);
        toast.success("Event created");
      }

      handleCloseDialog();
      await loadEvents();
    } catch (error) {
      console.error("Failed to save event:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!confirm(`Delete "${event.title}"?`)) return;

    try {
      await deleteCalendarEvent(event.id);
      toast.success("Event deleted");
      await loadEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event");
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    if (event.allDay) {
      return start.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    const dateStr = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const startTimeStr = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const endTimeStr = end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
  };

  // Admin users see a message that they cannot use this feature
  if (isAdmin) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
          <CalendarIcon className="h-16 w-16 mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Calendar Not Available</h2>
          <p className="text-center max-w-md">
            Google Calendar integration is only available for tenant users.
            System administrators cannot connect their personal Google Calendar.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
              Calendar
            </h1>
            <p className="text-sm text-muted-foreground">
              Sync and manage your Google Calendar events ({totalEvents} events)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync
                </Button>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4" />
                  New Event
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Connection Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Google Calendar Connection
            </CardTitle>
            <CardDescription>
              {status?.connected
                ? "Your Google Calendar is connected and syncing."
                : "Connect your Google Calendar to sync events."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    status?.connected ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <div>
                  <p className="font-medium text-sm">
                    {status?.connected ? "Connected" : "Not Connected"}
                  </p>
                  {status?.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last synced:{" "}
                      {new Date(status.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              {status?.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-destructive hover:text-destructive"
                >
                  <Link2Off className="h-4 w-4 mr-1" />
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={handleConnect}>
                  <Link2 className="h-4 w-4 mr-1" />
                  Connect Google Calendar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        {status?.connected && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
                  <p>No events found</p>
                  <p className="text-xs mt-1">
                    Create a new event or sync from Google Calendar
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{event.title}</h3>
                          {event.googleEventId && (
                            <Badge variant="outline" className="text-[10px] h-4">
                              Synced
                            </Badge>
                          )}
                          {event.status === "tentative" && (
                            <Badge variant="secondary" className="text-[10px] h-4">
                              Tentative
                            </Badge>
                          )}
                          {event.status === "cancelled" && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] h-4"
                            >
                              Cancelled
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatEventTime(event)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          )}
                          {event.meetLink && (
                            <a
                              href={event.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <Video className="h-3 w-3" />
                              Join Meet
                            </a>
                          )}
                          {event.attendees && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {JSON.parse(event.attendees).length} attendees
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(event)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Event Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Edit Event" : "New Event"}
              </DialogTitle>
              <DialogDescription>
                {editingEvent
                  ? "Update event details"
                  : "Create a new calendar event"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="event-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Meeting with team"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-description">Description</Label>
                <Textarea
                  id="event-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Add details about this event..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="event-location"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Conference Room A"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-day"
                  checked={formAllDay}
                  onCheckedChange={(checked) => setFormAllDay(checked === true)}
                />
                <Label htmlFor="all-day" className="text-sm">
                  All day event
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                {!formAllDay && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
                {!formAllDay && (
                  <div className="flex flex-col gap-1.5">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {!editingEvent && status?.connected && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="create-meet"
                    checked={formCreateMeet}
                    onCheckedChange={(checked) =>
                      setFormCreateMeet(checked === true)
                    }
                  />
                  <Label htmlFor="create-meet" className="text-sm">
                    <span className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      Add Google Meet video conferencing
                    </span>
                  </Label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingEvent ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
