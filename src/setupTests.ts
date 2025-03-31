// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock window.electron for tests
if (typeof window.electron === "undefined") {
  window.electron = {
    openFile: jest.fn().mockResolvedValue(null),
    saveFile: jest.fn().mockResolvedValue(null),
  };
}

// Mock ResizeObserver which isn't available in JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock MutationObserver which isn't fully implemented in JSDOM
global.MutationObserver = class MutationObserver {
  constructor(callback: MutationCallback) {}
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};
