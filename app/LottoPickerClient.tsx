"use client";

import { useState, useSyncExternalStore } from "react";
import {
  createLottoTicket,
  INITIAL_TICKET_COUNT,
  MAX_SAVED_BATCHES,
  type LottoTicket,
  type SavedLottoTicket,
} from "./lotto";

type LottoPickerClientProps = {
  initialTickets: LottoTicket[];
};

type TabKey = "generated" | "saved" | "info";

const SAVED_TICKETS_KEY = "lotto-saved-tickets";
const SAVED_TICKETS_EVENT = "saved-tickets-change";
const EMPTY_SAVED_TICKETS: SavedLottoTicket[] = [];

let cachedSavedTicketsRaw: string | null = null;
let cachedSavedTicketsSnapshot: SavedLottoTicket[] = EMPTY_SAVED_TICKETS;

const NUMBER_COLOR_CLASSES = [
  "bg-amber-300 text-amber-950 ring-amber-100/70",
  "bg-sky-400 text-sky-950 ring-sky-100/70",
  "bg-rose-400 text-rose-950 ring-rose-100/70",
  "bg-emerald-400 text-emerald-950 ring-emerald-100/70",
  "bg-violet-400 text-violet-950 ring-violet-100/70",
];

function createTicketBatch(count: number) {
  return Array.from({ length: count }, () => createLottoTicket());
}

function getNumberColorClass(number: number) {
  if (number <= 10) return NUMBER_COLOR_CLASSES[0];
  if (number <= 20) return NUMBER_COLOR_CLASSES[1];
  if (number <= 30) return NUMBER_COLOR_CLASSES[2];
  if (number <= 40) return NUMBER_COLOR_CLASSES[3];
  return NUMBER_COLOR_CLASSES[4];
}

function getTicketSignature(ticket: LottoTicket) {
  return `${ticket.numbers.join("-")}+${ticket.bonus}`;
}

function readSavedTicketsSnapshot(): SavedLottoTicket[] {
  if (typeof window === "undefined") {
    return EMPTY_SAVED_TICKETS;
  }

  const rawSavedTickets = window.localStorage.getItem(SAVED_TICKETS_KEY);
  if (!rawSavedTickets) {
    cachedSavedTicketsRaw = null;
    cachedSavedTicketsSnapshot = EMPTY_SAVED_TICKETS;
    return EMPTY_SAVED_TICKETS;
  }

  if (rawSavedTickets === cachedSavedTicketsRaw) {
    return cachedSavedTicketsSnapshot;
  }

  try {
    const parsed = JSON.parse(rawSavedTickets) as SavedLottoTicket[];
    cachedSavedTicketsRaw = rawSavedTickets;
    cachedSavedTicketsSnapshot = parsed;
    return parsed;
  } catch {
    window.localStorage.removeItem(SAVED_TICKETS_KEY);
    cachedSavedTicketsRaw = null;
    cachedSavedTicketsSnapshot = EMPTY_SAVED_TICKETS;
    return EMPTY_SAVED_TICKETS;
  }
}

function subscribeToSavedTickets(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === SAVED_TICKETS_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(SAVED_TICKETS_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(SAVED_TICKETS_EVENT, onStoreChange);
  };
}

function writeSavedTicketsSnapshot(nextSavedTickets: SavedLottoTicket[]) {
  if (typeof window === "undefined") {
    return;
  }

  const nextRawSavedTickets = JSON.stringify(nextSavedTickets);
  cachedSavedTicketsRaw = nextRawSavedTickets;
  cachedSavedTicketsSnapshot = nextSavedTickets;
  window.localStorage.setItem(SAVED_TICKETS_KEY, nextRawSavedTickets);
  window.dispatchEvent(new Event(SAVED_TICKETS_EVENT));
}

function createSavedTicketEntry(ticket: LottoTicket): SavedLottoTicket {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ticket,
  };
}

function formatSavedAt(createdAt: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function TicketCard({
  ticket,
  index,
  action,
  meta,
}: {
  ticket: LottoTicket;
  index: number;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 shadow-lg shadow-slate-950/25">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">게임 {index + 1}</p>
          {meta ? <div className="mt-1 text-xs text-slate-300">{meta}</div> : null}
        </div>
        {action}
      </div>

      <div className="mt-4 flex flex-nowrap items-center gap-1.5 sm:gap-3">
        {ticket.numbers.map((number) => (
          <span
            key={number}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ring-2 ring-inset ${getNumberColorClass(number)} sm:h-12 sm:w-12 sm:text-base`}
          >
            {number}
          </span>
        ))}
        <span className="shrink-0 px-0.5 text-sm font-black text-slate-500 sm:text-base">
          +
        </span>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-orange-300 text-xs font-black text-slate-950 ring-2 ring-inset ring-white/70 sm:h-12 sm:w-12 sm:text-base">
          {ticket.bonus}
        </span>
      </div>
    </article>
  );
}

function TabButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-left transition ${
        active
          ? "bg-white text-slate-950 shadow-lg"
          : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      }`}
    >
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs opacity-75">{description}</p>
    </button>
  );
}

export default function LottoPickerClient({
  initialTickets,
}: LottoPickerClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("generated");
  const [tickets, setTickets] = useState<LottoTicket[]>(initialTickets);
  const [count, setCount] = useState(INITIAL_TICKET_COUNT);
  const savedTickets = useSyncExternalStore(
    subscribeToSavedTickets,
    readSavedTicketsSnapshot,
    () => EMPTY_SAVED_TICKETS,
  );

  const generateTickets = () => {
    setTickets(createTicketBatch(count));
  };

  const isTicketSaved = (ticket: LottoTicket) =>
    savedTickets.some(
      (saved) =>
        getTicketSignature(saved.ticket) === getTicketSignature(ticket),
    );

  const saveTicket = (ticket: LottoTicket) => {
    if (isTicketSaved(ticket)) {
      setActiveTab("saved");
      return;
    }

    const nextTicket = createSavedTicketEntry(ticket);
    writeSavedTicketsSnapshot(
      [nextTicket, ...savedTickets].slice(0, MAX_SAVED_BATCHES),
    );
  };

  const removeSavedTicket = (id: string) => {
    writeSavedTicketsSnapshot(
      savedTickets.filter((saved) => saved.id !== id),
    );
  };

  const clearSavedTickets = () => {
    writeSavedTicketsSnapshot([]);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] px-3 py-4 text-white sm:px-5 sm:py-8">
      <section className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/10 bg-slate-900/70 p-4 shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-[0.3em] text-cyan-300 uppercase">
              One Page Lotto Picker
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              로또 번호 추천기
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              기본 번호 6개와 보너스 번호 1개를 랜덤으로 생성합니다.
              마음에 드는 번호를 최대 10건까지 저장할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <label htmlFor="count" className="text-sm font-medium text-slate-200">
              추천 건수
            </label>
            <div className="relative">
              <select
                id="count"
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="w-full appearance-none rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 pr-12 text-left text-sm text-white outline-none transition focus:border-cyan-300"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}건
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-300">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
            <button
              onClick={generateTickets}
              className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              다시 선택
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <TabButton
            active={activeTab === "generated"}
            title="추천 번호"
            description="랜덤 로또 번호를 1건 ~ 5건까지 추천"
            onClick={() => setActiveTab("generated")}
          />
          <TabButton
            active={activeTab === "saved"}
            title="저장 번호"
            description={`${savedTickets.length}/${MAX_SAVED_BATCHES}개 저장됨`}
            onClick={() => setActiveTab("saved")}
          />
          <TabButton
            active={activeTab === "info"}
            title="기능 설명"
            description="주요 기능과 버전 기록"
            onClick={() => setActiveTab("info")}
          />
        </div>

        {activeTab === "generated" ? (
          <section className="mt-6 space-y-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                현재 추천 조합 {tickets.length}건
              </p>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                번호 색상은 구간별로 다르게 표시되고, 마지막 공은 보너스
                번호입니다.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {tickets.map((ticket, index) => {
                const saved = isTicketSaved(ticket);
                const saveDisabled =
                  savedTickets.length >= MAX_SAVED_BATCHES && !saved;

                return (
                  <TicketCard
                    key={`${ticket.numbers.join("-")}-${ticket.bonus}-${index}`}
                    ticket={ticket}
                    index={index}
                    action={
                      <button
                        onClick={() => saveTicket(ticket)}
                        disabled={saveDisabled}
                        className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition enabled:hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/50 disabled:text-slate-400"
                      >
                        {saved ? "저장됨" : saveDisabled ? "한도 도달" : "저장"}
                      </button>
                    }
                  />
                );
              })}
            </div>
          </section>
        ) : activeTab === "saved" ? (
          <section className="mt-6">
            {savedTickets.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-5 py-12 text-center">
                <p className="text-lg font-semibold text-white">
                  저장된 번호가 없습니다.
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  추천 번호 탭에서 마음에 드는 게임만 골라 저장해 보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      저장된 번호 {savedTickets.length}개
                    </p>
                    <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                      각 게임은 개별 삭제할 수 있고, 필요하면 전체 삭제도
                      가능합니다.
                    </p>
                  </div>
                  <button
                    onClick={clearSavedTickets}
                    className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/20"
                  >
                    전체 삭제
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {savedTickets.map((savedTicket, index) => (
                    <TicketCard
                      key={savedTicket.id}
                      ticket={savedTicket.ticket}
                      index={index}
                      meta={<>저장일 {formatSavedAt(savedTicket.createdAt)}</>}
                      action={
                        <button
                          onClick={() => removeSavedTicket(savedTicket.id)}
                          className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/20"
                        >
                          삭제
                        </button>
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-bold text-white">주요 기능</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                <p>
                  1. 추천 번호 제공: 메인 번호 6개와 보너스 번호 1개를
                  건별로 생성합니다.
                </p>
                <p>
                  2. 마음에 드는 번호 저장 기능: 원하는 번호만 최대 10건까지
                  저장할 수 있습니다.
                </p>
                <p>
                  3. 번호 저장 방식: 별도 DB 없이 현재 브라우저의 localStorage에
                  저장되며, 같은 브라우저에서는 다시 열어도 유지됩니다.
                </p>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-bold text-white">버전 기록</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                <p>
                  <span className="font-semibold text-cyan-200">
                    v20260423-01-002
                  </span>
                  : 기능 설명 탭 추가, 생성 게임 기본값 1게임 변경, 재선택
                  문구 적용
                </p>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-bold text-white">개발 스택</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                <p>Next.js 16.2.4</p>
                <p>React 19.2.4</p>
                <p>TypeScript 5</p>
                <p>Tailwind CSS 4</p>
                <p>브라우저 localStorage 기반 저장</p>
              </div>
            </article>

            <p className="px-2 text-right text-sm italic text-slate-400">
              From pmsÜbermensch
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
