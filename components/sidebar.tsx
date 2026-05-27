"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  FileText,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Plug,
  Settings2,
  Sparkles,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/chat/model-picker";
import type { ModelConfig } from "@/lib/agent/models";
import { cn } from "@/lib/utils";

type ChatListItem = {
  id: string;
  title: string;
  lastMessageAt: string;
};

const navItems = [
  { label: "Orth", href: "/chat/new", icon: MessageSquare },
  { label: "Setup Local Agent", href: "#", icon: Settings2 },
  { label: "Skills", href: "#", icon: Sparkles },
  { label: "Discover", href: "#", icon: Compass },
  { label: "Integrations", href: "#", icon: Plug },
];

const secondaryItems = [
  { label: "Usage", href: "#", icon: LayoutGrid },
  { label: "Logs", href: "#", icon: FileText },
];

function groupChats(chats: ChatListItem[]) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const groups: Record<string, ChatListItem[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Older: [],
  };

  for (const chat of chats) {
    const date = new Date(chat.lastMessageAt);
    if (date >= startOfToday) groups.Today.push(chat);
    else if (date >= startOfYesterday) groups.Yesterday.push(chat);
    else if (date >= startOfWeek) groups["This week"].push(chat);
    else groups.Older.push(chat);
  }

  return groups;
}

function userInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "U";
}

export function Sidebar({
  chats,
  models,
  selectedModelId,
  onModelChange,
  ctxUsed,
  ctxMax,
  userEmail,
}: {
  chats: ChatListItem[];
  models: ModelConfig[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  ctxUsed: number;
  ctxMax?: number;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = groupChats(chats);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
          <span className="text-xs font-semibold">O</span>
        </div>
        <div>
          <div className="text-sm font-semibold">Orthogonal</div>
          <div className="text-xs text-muted-foreground">Personal Account</div>
        </div>
      </div>

      <div className="px-3">
        <ModelPicker
          models={models}
          selectedModelId={selectedModelId}
          onChange={onModelChange}
          ctxUsed={ctxUsed}
          ctxMax={ctxMax}
        />
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith("/chat");
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  item.label === "Orth" && active && "bg-muted text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        <nav className="space-y-1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        {Object.entries(groups).map(([label, items]) =>
          items.length ? (
            <div key={label} className="mb-4">
              <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">
                {label}
              </div>
              <div className="space-y-1">
                {items.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm hover:bg-muted/60",
                      pathname === `/chat/${chat.id}` && "bg-muted",
                    )}
                  >
                    <div className="truncate font-medium">{chat.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null,
        )}
      </ScrollArea>

      <div className="border-t px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {userInitial(userEmail)}
            </div>
            <span className="truncate font-medium">{userEmail}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
