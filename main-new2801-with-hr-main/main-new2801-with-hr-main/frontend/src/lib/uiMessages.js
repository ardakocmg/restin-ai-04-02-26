// Centralized UI Messages (English, Settings-Ready)
export const UI_MSG = {
  generic: {
    title: "Something went wrong",
    body: "The system couldn't complete the action. Please try again."
  },
  network: {
    title: "Network issue",
    body: "We couldn't reach the server. Check your connection and try again."
  },
  server: {
    title: "Server issue",
    body: "The server returned an unexpected response. Please try again."
  },
  auth: {
    title: "Session issue",
    body: "Your session needs attention. Please re-enter your PIN if needed."
  },
  inProgress: {
    title: "Working…",
    body: "Please wait a moment."
  },
  blackScreenPrevented: {
    title: "Loading…",
    body: "Fetching table data. If this takes too long, refresh or try again."
  },
  pendingItemsBillBlock: {
    title: "Cannot print bill",
    body: "Some items are not DONE yet. Please complete delivery before billing."
  },
  tableLoading: {
    title: "Loading table…",
    body: "Loading order and table details."
  },
  sendingOrder: {
    title: "Sending order…",
    body: "Sending to Kitchen Display and print queue…"
  }
};

export default UI_MSG;
