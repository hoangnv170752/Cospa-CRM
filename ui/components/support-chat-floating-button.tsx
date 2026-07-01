"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  MessageCircle,
  Send,
  Loader2,
  X,
  Maximize2,
  Minimize2,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { crmFetch } from "@/lib/crm";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  createdAt: string;
  isOwn: boolean;
}

export function SupportChatFloatingButton() {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages on open
  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  // Poll for new messages every 30 seconds when open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const data = await crmFetch<{ messages: Message[]; unreadCount: number }>(
        "/support/messages"
      );
      setMessages(data.messages || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: "current-user",
      senderName: "You",
      senderRole: "user",
      createdAt: new Date().toISOString(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await crmFetch("/support/messages", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      // Reload to get the actual message with server ID
      await loadMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setNewMessage(content); // Restore the message
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return t("settings.support.yesterday");
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <>
      {/* Chat Panel */}
      <div
        className={cn(
          "fixed right-4 z-50 transition-all duration-300 ease-in-out",
          isExpanded
            ? "w-[calc(100%-2rem)] sm:w-[480px]"
            : "w-[calc(100%-2rem)] sm:w-96",
          "bottom-24 md:bottom-24",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <div className="flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-white" />
              <div>
                <span className="font-semibold text-white flex items-center gap-2">
                  {t("settings.support.title")}
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 px-1.5 text-[10px] bg-red-500"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </span>
                <p className="text-[10px] text-blue-100">
                  {t("settings.support.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            className={cn(
              "flex-1 overflow-y-auto bg-muted/30",
              isExpanded ? "h-[400px]" : "h-[280px]"
            )}
          >
            {isLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                  <MessageCircle className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {t("settings.support.noMessages")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.support.startConversation")}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      message.isOwn ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    {!message.isOwn && (
                      <span className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        {message.senderName}
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[9px]"
                        >
                          {t("settings.support.admin")}
                        </Badge>
                      </span>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2 text-sm",
                        message.isOwn
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      {message.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-3 bg-card">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("settings.support.placeholder")}
                className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                disabled={isSending}
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-full shrink-0 bg-blue-500 hover:bg-blue-600"
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              {t("settings.support.from")} NeuroGrowth Lab
            </p>
          </div>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl",
          "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
          "bottom-6",
          isOpen && "rotate-90"
        )}
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
      >
        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Headphones className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
