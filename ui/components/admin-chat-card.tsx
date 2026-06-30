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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface AdminChatCardProps {
  userId: string;
  tenantId?: string;
  tenantName?: string;
}

export function AdminChatCard({ userId, tenantId, tenantName }: AdminChatCardProps) {
  const t = useTranslations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages
  useEffect(() => {
    loadMessages();
    // Poll for new messages every 30 seconds
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      // Initialize with empty array on error
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
      senderId: userId,
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
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

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
    <Card className={cn(isExpanded && "lg:col-span-2")}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            {t("settings.support.title")}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {t("settings.support.description")}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {/* Messages Area */}
        <div
          ref={scrollRef}
          className={cn(
            "border rounded-md bg-muted/30 mb-2 overflow-y-auto",
            isExpanded ? "h-[300px]" : "h-[150px]"
          )}
        >
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                {t("settings.support.noMessages")}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t("settings.support.startConversation")}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    message.isOwn ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {!message.isOwn && (
                    <span className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
                      {message.senderName}
                      <Badge variant="outline" className="h-3 px-1 text-[8px]">
                        {t("settings.support.admin")}
                      </Badge>
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs",
                      message.isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.content}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("settings.support.placeholder")}
            className="h-7 text-xs"
            disabled={isSending}
          />
          <Button
            size="sm"
            className="h-7 px-2"
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Tenant Info */}
        {tenantName && (
          <p className="text-[9px] text-muted-foreground mt-2 text-center">
            {t("settings.support.from")} {tenantName}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
