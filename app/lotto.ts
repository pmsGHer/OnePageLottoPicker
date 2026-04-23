export const MIN_NUMBER = 1;
export const MAX_NUMBER = 45;
export const NUMBERS_PER_TICKET = 6;
export const INITIAL_TICKET_COUNT = 3;
export const MAX_SAVED_BATCHES = 10;

export type LottoTicket = {
  numbers: number[];
  bonus: number;
};

export type SavedTicketBatch = {
  id: string;
  createdAt: string;
  tickets: LottoTicket[];
};

export function createLottoTicket(): LottoTicket {
  const picked = new Set<number>();

  while (picked.size < NUMBERS_PER_TICKET + 1) {
    const randomNumber =
      Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
    picked.add(randomNumber);
  }

  const pickedNumbers = [...picked];
  const bonus = pickedNumbers[pickedNumbers.length - 1];
  const numbers = pickedNumbers.slice(0, NUMBERS_PER_TICKET).sort((a, b) => a - b);

  return {
    numbers,
    bonus,
  };
}
