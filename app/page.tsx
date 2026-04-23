import LottoPickerClient from "./LottoPickerClient";
import { createLottoTicket, INITIAL_TICKET_COUNT } from "./lotto";

export default function Home() {
  const initialTickets = Array.from({ length: INITIAL_TICKET_COUNT }, () =>
    createLottoTicket(),
  );

  return <LottoPickerClient initialTickets={initialTickets} />;
}
