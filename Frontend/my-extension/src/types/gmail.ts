export interface GmailComposeWindow {
  id: string;
  element: HTMLElement;
  to: string[];
  subject: string;
  body: string;
  isTrackingEnabled: boolean;
  sendMessage: () => Promise<void>;
  insertTrackingPixel: () => void;
}

export interface GmailEmailElement {
  id: string;
  element: HTMLElement;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  isTracked: boolean;
  hasOpened: boolean;
}

export interface GmailObserverConfig {
  composeSelector: string;
  emailListSelector: string;
  emailRowSelector: string;
  checkInterval: number;
}