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

type TabKey = "generated" | "saved";

const SAVED_TICKETS_KEY = "lotto-saved-tickets";
const SAVED_TICKETS_EVENT = "saved-tickets-change";

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
    return [];
  }

  const rawSavedTickets = window.localStorage.getItem(SAVED_TICKETS_KEY);
  if (!rawSavedTickets) {
    return [];
  }

  try {
    return JSON.parse(rawSavedTickets) as SavedLottoTicket[];
  } catch {
    window.localStorage.removeItem(SAVED_TICKETS_KEY);
    return [];
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

  window.localStorage.setItem(
    SAVED_TICKETS_KEY,
    JSON.stringify(nextSavedTickets),
  );
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

      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
        {ticket.numbers.map((number) => (
          <span
            key={number}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ring-2 ring-inset ${getNumberColorClass(number)} sm:h-12 sm:w-12 sm:text-base`}
          >
            {number}
          </span>
        ))}
        <span className="text-base font-black text-slate-500">+</span>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-orange-300 text-sm font-black text-slate-950 ring-2 ring-inset ring-white/70 sm:h-12 sm:w-12 sm:text-base">
          {ticket.bonus}
        </span>
      </div>
    </article>
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
    () => [],
  );

  const generateTickets = () => {
    setTickets(createTicketBatch(count));
  };

  const isTicketSaved = (ticket: LottoTicket) =>
    savedTickets.some((saved) => getTicketSignature(saved.ticket) === getTicketSignature(ticket));

  const saveTicket = (ticket: LottoTicket) => {
    if (isTicketSaved(ticket)) {
      setActiveTab("saved");
      return;
    }

    const nextTicket = createSavedTicketEntry(ticket);
    writeSavedTicketsSnapshot([nextTicket, ...savedTickets].slice(0, MAX_SAVED_BATCHES));
  };

  const removeSavedTicket = (id: string) => {
    writeSavedTicketsSnapshot(savedTickets.filter((saved) => saved.id !== id));
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
              각 게임마다 메인 번호 6개와 2등 확인용 보너스 번호 1개를 함께 생성합니다.
              마음에 드는 게임만 골라 최대 10건까지 저장할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <label htmlFor="count" className="text-sm font-medium text-slate-200">
              생성 게임 수
            </label>
            <select
              id="count"
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}게임
                </option>
              ))}
            </select>
            <button
              onClick={generateTickets}
              className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              번호 다시 뽑기
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setActiveTab("generated")}
            className={`rounded-2xl px-4 py-3 text-left transition ${
              activeTab === "generated"
                ? "bg-white text-slate-950 shadow-lg"
                : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            <p className="text-sm font-bold">추천 번호</p>
            <p className="mt-1 text-xs opacity-75">현재 생성된 게임별 저장 버튼</p>
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`rounded-2xl px-4 py-3 text-left transition ${
              activeTab === "saved"
                ? "bg-white text-slate-950 shadow-lg"
                : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            <p className="text-sm font-bold">저장한 번호</p>
            <p className="mt-1 text-xs opacity-75">
              {savedTickets.length}/{MAX_SAVED_BATCHES}개 저장됨
            </p>
          </button>
        </div>

        {activeTab === "generated" ? (
          <section className="mt-6 space-y-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                현재 추천 조합 {tickets.length}게임
              </p>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                번호 색상은 구간별로 다르게 표시되고, 마지막 공은 보너스 번호입니다.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tickets.map((ticket, index) => {
                const saved = isTicketSaved(ticket);
                const saveDisabled = savedTickets.length >= MAX_SAVED_BATCHES && !saved;

                return (
                  <TicketCard
                    key={`${ticket.numbers.join("-")}-${ticket.bonus}-${index}`}
                    ticket={ticket}
                    index={index}
                    action={
                      <button
                        onClick={() => saveTicket(ticket)}
                        disabled={saveDisabled}
                        className="rounded-2xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 transition enabled:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                      >
                        {saved
                          ? "저장됨"
                          : saveDisabled
                            ? "한도 도달"
                            : "저장"}
                      </button>
                    }
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-6">
            {savedTickets.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-5 py-12 text-center">
                <p className="text-lg font-semibold text-white">저장된 번호가 없습니다.</p>
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
                      각 게임은 개별 삭제할 수 있고, 필요하면 전체 삭제도 가능합니다.
                    </p>
                  </div>
                  <button
                    onClick={clearSavedTickets}
                    className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/20"
                  >
                    전체 삭제
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        )}
      </section>
    </main>
  );
}
