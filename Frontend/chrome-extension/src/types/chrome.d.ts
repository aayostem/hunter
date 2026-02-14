/// <reference types="chrome"/>

declare namespace chrome {
  export const storage: {
    local: {
      get: (keys: string[], callback: (items: { [key: string]: any }) => void) => void;
      set: (items: { [key: string]: any }, callback?: () => void) => void;
    };
    sync: {
      get: (keys: string[], callback: (items: { [key: string]: any }) => void) => void;
      set: (items: { [key: string]: any }, callback?: () => void) => void;
    };
    onChanged: {
      addListener: (callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void) => void;
    };
  };
  
  export const runtime: {
    sendMessage: (message: any, responseCallback?: (response: any) => void) => void;
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void) => void;
    };
    getURL: (path: string) => string;
  };
}